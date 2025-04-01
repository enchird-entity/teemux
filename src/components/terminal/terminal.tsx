import React, { useState, useCallback, useEffect, useRef } from "react";
import { Copy, X, Search, Trash2, Loader2, RefreshCw } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import { TerminalPane } from "./terminal-pane";
import { useHost } from "../../hooks/use-host";
import { Terminal as XTerm } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { WebLinksAddon } from "xterm-addon-web-links";
import { SearchAddon } from "xterm-addon-search";
import { Unicode11Addon } from "xterm-addon-unicode11";
import { debounce } from "lodash";
import { useConnection } from "@/contexts/connection.context";
import { useTerminal } from "@/hooks/use-terminal";

// Constants
const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes
const INACTIVITY_CHECK_INTERVAL = 60 * 1000; // 1 minute

// Interfaces
interface Host {
	id: string;
	label: string;
	hostname: string;
}

interface TerminalProps {
	terminalId: string;
	sessionId: string;
	hostId: string;
	onClose: () => void;
	isVisible?: boolean;
}

interface TerminalPaneState {
	id: string;
	terminalId: string;
	xterm: XTerm | null;
	fitAddon: FitAddon | null;
	searchAddon: SearchAddon | null;
	dataBuffer: any | null;
	connectionStatus: "connected" | "disconnected" | "reconnecting";
	reconnectAttempts: number;
	lastActivityTime: number;
}

interface CachedTerminal {
	xterm: XTerm;
	fitAddon: FitAddon;
	searchAddon: SearchAddon;
	dataBuffer: any;
	lastActivityTime: number;
	eventListeners: {
		data: () => void;
		error: () => void;
	};
	isActive: boolean;
}

// Terminal Data Buffer class
class TerminalDataBuffer {
	private buffer: string = "";
	private terminal: XTerm;
	private paneId: string;
	private maxBufferSize: number = 100000; // 100KB max buffer size to prevent memory issues

	constructor(terminal: XTerm, paneId: string) {
		this.terminal = terminal;
		this.paneId = paneId;
	}

	write(data: string): void {
		try {
			// Add to buffer with size limit
			this.buffer += data;

			// Trim buffer if it exceeds max size
			if (this.buffer.length > this.maxBufferSize) {
				this.buffer = this.buffer.substring(
					this.buffer.length - this.maxBufferSize
				);
			}

			// Write to terminal
			this.terminal.write(data);
		} catch (err) {
			console.error(`Error writing to terminal for pane ${this.paneId}:`, err);
		}
	}

	dispose(): void {
		// Clean up resources
		this.buffer = "";
		console.log(`Terminal data buffer disposed for pane ${this.paneId}`);
	}
}

// Terminal Cache class
class TerminalCache {
	private cache: Map<string, CachedTerminal> = new Map();

	hasTerminal(terminalId: string): boolean {
		return this.cache.has(terminalId);
	}

	getTerminal(terminalId: string): CachedTerminal | undefined {
		return this.cache.get(terminalId);
	}

	storeTerminal(terminalId: string, terminal: CachedTerminal): void {
		this.cache.set(terminalId, terminal);
	}

	removeTerminal(terminalId: string): void {
		this.cache.delete(terminalId);
	}
}

const terminalCache = new TerminalCache();

export const Terminal: React.FC<TerminalProps> = ({
	terminalId,
	sessionId,
	hostId,
	onClose,
	isVisible = true,
}) => {
	const { getHost } = useHost();
	const [panes, setPanes] = useState<TerminalPaneState[]>([
		{
			id: "1",
			terminalId,
			xterm: null,
			fitAddon: null,
			searchAddon: null,
			dataBuffer: null,
			connectionStatus: "connected",
			reconnectAttempts: 0,
			lastActivityTime: Date.now(),
		},
	]);
	const [activePane, setActivePane] = useState("1");
	const { activeSessions } = useConnection();
	const [isSearchOpen, setIsSearchOpen] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");
	const [hostInfo, setHostInfo] = useState<{
		label: string;
		hostname: string;
	} | null>(null);
	const [isInitializing, setIsInitializing] = useState(true);
	const [initError, setInitError] = useState<string | null>(null);
	const [splitDirection, setSplitDirection] = useState<
		"horizontal" | "vertical"
	>("horizontal");

	// Refs
	const terminalRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
	const [forceRender, setForceRender] = useState(0);
	const initializationAttempted = useRef(false);
	const isMounted = useRef(true);
	const cleanupFunctions = useRef<
		Array<(() => void) | Promise<(() => void) | null>>
	>([]);
	const inactivityCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
	const welcomeMessageSent = useRef<Set<string>>(new Set());
	const terminalsBeingInitialized = useRef<Set<string>>(new Set());
	const lastInputCharsRef = useRef<string>("");
	const { sendData, isConnected } = useTerminal();

	// Maximum number of reconnection attempts
	const MAX_RECONNECT_ATTEMPTS = 3;
	// Reconnection delay in milliseconds (increases with each attempt)
	const RECONNECT_DELAY_BASE = 2000;

	// Load host info
	useEffect(() => {
		getHost(hostId)
			.then((host: Host | null) => {
				if (host) {
					setHostInfo({
						label: host.label,
						hostname: host.hostname,
					});
					setIsInitializing(false);
				} else {
					setInitError("Host not found");
					setIsInitializing(false);
				}
			})
			.catch((error: unknown) => {
				setInitError(error instanceof Error ? error.message : String(error));
				setIsInitializing(false);
			});
	}, [hostId, getHost]);

	// Effect to ensure terminal refs are properly set after render
	useEffect(() => {
		// This effect runs after every render
		// Check if all terminal elements have refs
		const missingRefs = panes.filter((pane) => !terminalRefs.current[pane.id]);

		if (missingRefs.length > 0) {
			console.log(
				`Terminal component: Missing refs for ${missingRefs.length} panes, trying to find them`
			);

			// Try to find elements by ID or data attribute
			missingRefs.forEach((pane) => {
				// Try by ID
				const elementById = document.getElementById(
					`terminal-container-${pane.id}`
				);
				if (elementById) {
					console.log(
						`Terminal component: Found element by ID for pane ${pane.id}`
					);
					terminalRefs.current[pane.id] = elementById as HTMLDivElement;
					return;
				}

				// Try by data attribute
				const elementByData = document.querySelector(
					`[data-terminal-pane-id="${pane.id}"]`
				);
				if (elementByData) {
					console.log(
						`Terminal component: Found element by data attribute for pane ${pane.id}`
					);
					terminalRefs.current[pane.id] = elementByData as HTMLDivElement;
					return;
				}

				console.log(
					`Terminal component: Could not find element for pane ${pane.id}`
				);
			});
		}
	}, [panes, forceRender]);

	// Set isMounted to false on unmount
	useEffect(() => {
		isMounted.current = true;
		return () => {
			isMounted.current = false;
		};
	}, []);

	// Initialize terminals after render
	useEffect(() => {
		console.log(
			`========= Terminal component: Initializing terminals after render, forceRender: ${forceRender}  - ${sessionId} - ${terminalId} `
		);
		console.log(panes);

		console.log("Initialization attempted:", initializationAttempted.current);

		// If we're force rendering but not visible, don't initialize
		if (forceRender > 0 && !isVisible) {
			console.log(
				`Terminal component: Not initializing invisible terminal ${terminalId} that's not in cache`
			);
			return;
		}

		// If we're already initialized and this is just a force render, check if we need to update
		if (initializationAttempted.current && forceRender > 0) {
			console.log(
				"Terminal component: Checking if terminals need updating after force render"
			);

			// Check if all panes have terminals
			const allPanesInitialized = panes.every((pane) => pane.xterm !== null);

			if (allPanesInitialized) {
				console.log(
					"Terminal component: All panes already initialized, no need to reinitialize"
				);
				return;
			}

			// If we have panes without terminals but they're in the cache, update them
			panes.forEach((pane) => {
				if (!pane.xterm && terminalCache.hasTerminal(pane.terminalId)) {
					console.log(
						`Terminal component: Pane ${pane.id} has no terminal but is in cache, updating`
					);
					const cachedTerminal = terminalCache.getTerminal(pane.terminalId);
					if (cachedTerminal) {
						// Update pane with cached terminal instance
						setPanes((prevPanes) =>
							prevPanes.map((p) =>
								p.id === pane.id
									? {
											...p,
											xterm: cachedTerminal.xterm,
											fitAddon: cachedTerminal.fitAddon,
											searchAddon: cachedTerminal.searchAddon,
											dataBuffer: cachedTerminal.dataBuffer,
											connectionStatus: "connected",
											lastActivityTime: Date.now(),
									  }
									: p
							)
						);
					}
				}
			});
		}

		// Only run full initialization once
		if (initializationAttempted.current) {
			console.log(
				"Terminal component: Initialization already attempted, skipping full initialization"
			);
			setIsInitializing(false);
			return;
		}

		// Maximum number of initialization attempts
		const MAX_INIT_ATTEMPTS = 1; // Reduced to 1 attempt
		// Initial delay before first attempt (ms)
		const INITIAL_DELAY = 100;
		// Track attempts
		let attempts = 0;
		// Track if initialization is complete
		let initializationComplete = false;

		if (forceRender >= MAX_INIT_ATTEMPTS + 1) {
			initializationAttempted.current = true;
		}

		// Function to attempt initialization
		const attemptInitialization = () => {
			attempts++;
			console.log(
				`Terminal component: Initialization attempt ${attempts}/${MAX_INIT_ATTEMPTS}`
			);

			// Check if component is still mounted
			if (!isMounted.current) {
				console.log(
					"Terminal component: Component unmounted, aborting initialization"
				);
				return;
			}

			// Check if terminal elements exist
			const allRefsAvailable = panes.every((pane) => {
				const element = terminalRefs.current[pane.id];
				const isAvailable = element !== null && element !== undefined;
				if (!isAvailable) {
					console.log(
						`Terminal component: Terminal element for pane ${pane.id} not ready yet, waiting for ref callback to trigger re-render`
					);
					return false;
				}
				return true;
			});

			console.log(
				`Terminal component: All refs available: ${allRefsAvailable}`
			);

			if (allRefsAvailable) {
				// Elements are ready, proceed with initialization
				try {
					console.log(
						"Terminal component: All terminal elements ready, initializing terminals"
					);

					// Initialize each terminal
					const initPromises: Promise<any>[] = [];

					panes.forEach((pane) => {
						// Skip panes that already have terminals
						if (pane.xterm) {
							console.log(
								`Terminal component: Pane ${pane.id} already has a terminal, skipping initialization`
							);
							return;
						}

						const initResult = initializeTerminal(pane.id, pane.terminalId);

						if (initResult instanceof Promise) {
							// If it's a promise, add it to our promises array
							initPromises.push(
								initResult.then((cleanup) => {
									if (cleanup) {
										cleanupFunctions.current.push(cleanup);
									}
								})
							);
						} else if (initResult) {
							// If it's a direct cleanup function, add it to our cleanup functions
							cleanupFunctions.current.push(initResult);
						}
					});

					// Wait for all terminal initializations to complete
					Promise.all(initPromises)
						.then(() => {
							console.log(
								"Terminal component: All terminals initialized successfully"
							);

							// Mark initialization as complete
							initializationComplete = true;
							initializationAttempted.current = true;

							// Create debounced resize handler
							const handleResize = debounce(() => {
								panes.forEach((pane) => {
									if (pane.fitAddon) {
										try {
											pane.fitAddon.fit();
										} catch (err: any) {
											console.error(
												`Terminal component: Error during resize: ${err.message}`
											);
										}
									}
								});
							}, 100);

							window.addEventListener("resize", handleResize);
							cleanupFunctions.current.push(() =>
								window.removeEventListener("resize", handleResize)
							);

							// Trigger initial resize after a short delay
							setTimeout(() => {
								handleResize();
								setIsInitializing(false);
							}, 100);
						})
						.catch((err) => {
							console.error(
								`Terminal component: Error initializing terminals: ${err}`
							);
							setInitError(
								`Error initializing terminal: ${err.message || String(err)}`
							);
							setIsInitializing(false);
						});
				} catch (err: any) {
					console.error(
						`Terminal component: Error during initialization: ${err.message}`
					);
					setInitError(`Error initializing terminal: ${err.message}`);
					setIsInitializing(false);
				}
			} else {
				// Not all refs are available yet, we'll rely on the ref callback to trigger a re-render
				console.log(
					"Terminal component: Waiting for all refs to be available via ref callback"
				);

				// If this is our only attempt and refs aren't available, show an error
				if (attempts >= MAX_INIT_ATTEMPTS) {
					// Log the current state of refs and DOM
					console.log("Terminal refs:", terminalRefs.current);
					console.log("Panes:", panes);
					panes.forEach((pane) => {
						const elementById = document.getElementById(
							`terminal-container-${pane.id}`
						);
						const elementByData = document.querySelector(
							`[data-terminal-pane-id="${pane.id}"]`
						);
						console.log(
							`Pane ${
								pane.id
							} - Element by ID: ${!!elementById}, Element by data: ${!!elementByData}`
						);
					});

					setInitError("Terminal elements not ready. Please try again.");
					setIsInitializing(false);
				}
			}
		};

		// Start the initialization process after a short delay to allow initial render
		setTimeout(attemptInitialization, INITIAL_DELAY);

		return () => {
			// Clean up initialization
			// No need to cancel animation frame as we're using timeouts now

			// Run all cleanup functions
			cleanupFunctions.current.forEach((cleanup) => {
				if (typeof cleanup === "function") {
					try {
						cleanup();
					} catch (err) {
						console.error("Error during cleanup:", err);
					}
				} else if (cleanup instanceof Promise) {
					// Handle promise-based cleanup
					cleanup
						.then((cleanupFn) => {
							if (cleanupFn && typeof cleanupFn === "function") {
								try {
									cleanupFn();
								} catch (err) {
									console.error("Error during promise-based cleanup:", err);
								}
							}
						})
						.catch((err) => {
							console.error("Error resolving cleanup promise:", err);
						});
				}
			});

			// We don't dispose terminals here anymore since they're stored in the cache
			// Instead, we just clean up event listeners

			// Only notify main process if initialization is complete or we've been mounted for a while
			// This prevents terminal destruction during initialization
			const shouldNotifyMainProcess =
				initializationComplete ||
				Date.now() - (panes[0]?.lastActivityTime || 0) > 5000; // If we've been active for more than 5 seconds

			if (shouldNotifyMainProcess) {
				try {
					console.log(
						`Terminal component: Sending close request for terminal: ${terminalId}`
					);
					// We don't close the terminal here anymore, just notify that we're no longer using it
					// ipcRenderer.send('terminal:close', {
					//   terminalId: terminalId,
					//   sessionId,
					// });
				} catch (err) {
					console.error("Error notifying main process:", err);
				}
			} else {
				console.log(
					`Terminal component: Skipping close request for terminal: ${terminalId} during initialization`
				);
			}
		};
	}, [panes.length, terminalId, sessionId, forceRender, isVisible]);

	// Set up inactivity check
	useEffect(() => {
		// Start the inactivity check interval
		inactivityCheckIntervalRef.current = setInterval(() => {
			const now = Date.now();

			// Check each pane for inactivity
			setPanes((prevPanes) =>
				prevPanes.map((pane) => {
					// If the pane is inactive for too long, update its status
					if (
						pane.connectionStatus === "connected" &&
						now - pane.lastActivityTime > INACTIVITY_TIMEOUT
					) {
						console.log(
							`Terminal component: Pane ${pane.id} inactive for ${Math.floor(
								(now - pane.lastActivityTime) / 1000 / 60
							)} minutes`
						);

						// If the terminal is open, write a message
						if (pane.xterm) {
							pane.xterm.write(
								"\r\n\x1b[33mTerminal inactive for 10 minutes. Send any key to continue.\x1b[0m\r\n"
							);
						}

						return {
							...pane,
							connectionStatus: "connected", // Keep it connected, just show a message
						};
					}
					return pane;
				})
			);
		}, INACTIVITY_CHECK_INTERVAL);

		// Clean up the interval on unmount
		return () => {
			if (inactivityCheckIntervalRef.current) {
				clearInterval(inactivityCheckIntervalRef.current);
			}
		};
	}, [INACTIVITY_TIMEOUT]);

	// Update activity timestamp when the terminal is used
	const updateActivityTimestamp = useCallback((paneId: string) => {
		setPanes((prevPanes) =>
			prevPanes.map((pane) =>
				pane.id === paneId ? { ...pane, lastActivityTime: Date.now() } : pane
			)
		);
	}, []);

	// Handle terminal connection error and attempt reconnection
	const handleConnectionError = useCallback(
		(paneId: string) => {
			console.log(`Terminal component: Connection error for pane ${paneId}`);

			setPanes((prevPanes) =>
				prevPanes.map((pane) => {
					if (pane.id === paneId) {
						const newStatus =
							pane.reconnectAttempts < MAX_RECONNECT_ATTEMPTS
								? "reconnecting"
								: "disconnected";

						return {
							...pane,
							connectionStatus: newStatus,
						};
					}
					return pane;
				})
			);

			const pane = panes.find((p) => p.id === paneId);
			if (!pane) return;

			if (pane.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
				// Exponential backoff for reconnection attempts
				const delay =
					RECONNECT_DELAY_BASE * Math.pow(2, pane.reconnectAttempts);

				console.log(
					`Terminal component: Attempting reconnection for pane ${paneId} in ${delay}ms (attempt ${
						pane.reconnectAttempts + 1
					}/${MAX_RECONNECT_ATTEMPTS})`
				);

				setTimeout(async () => {
					try {
						// Clean up existing terminal instance
						if (pane.xterm) {
							try {
								pane.xterm.dispose();
							} catch (err) {
								console.error(
									`Error disposing terminal during reconnection: ${err}`
								);
							}
						}

						// Request a new terminal from the main process
						const session = activeSessions.find((s) => s.id === sessionId);
						const newTerminalId = session?.terminal_id;

						// Update pane with new terminal ID
						setPanes((prevPanes) =>
							prevPanes.map((p) =>
								p.id === paneId
									? {
											...p,
											terminalId: newTerminalId || "",
											xterm: null,
											fitAddon: null,
											searchAddon: null,
											reconnectAttempts: p.reconnectAttempts + 1,
									  }
									: p
							)
						);

						// Initialize the new terminal
						const cleanup = initializeTerminal(paneId, newTerminalId as string);
						if (cleanup) {
							cleanupFunctions.current.push(cleanup);
						}

						// Update connection status
						setPanes((prevPanes) =>
							prevPanes.map((p) =>
								p.id === paneId
									? {
											...p,
											connectionStatus: "connected",
									  }
									: p
							)
						);

						console.log(
							`Terminal component: Reconnection successful for pane ${paneId}`
						);
					} catch (err) {
						console.error(
							`Terminal component: Reconnection failed for pane ${paneId}: ${err}`
						);

						// If we've reached max attempts, mark as disconnected
						if (pane.reconnectAttempts + 1 >= MAX_RECONNECT_ATTEMPTS) {
							setPanes((prevPanes) =>
								prevPanes.map((p) =>
									p.id === paneId
										? {
												...p,
												connectionStatus: "disconnected",
												xterm: null,
										  }
										: p
								)
							);
						} else {
							// Try again
							handleConnectionError(paneId);
						}
					}
				}, delay);
			}
		},
		[panes, hostId]
	);

	// Send a command to display server information
	const sendServerInfoCommand = (
		terminal: XTerm | null,
		paneId: string,
		terminalId: string
	) => {
		console.log("Sending server info command for pane:", terminal);
		if (!terminal) return;

		// Write a welcome message immediately
		terminal.write("\r\n\x1b[33mConnecting to server...\x1b[0m\r\n\n");

		// Send the command using Tauri's event system
		emit("terminal:data", {
			terminalId: terminalId,
			data: "landscape-sysinfo\n",
		});

		console.log(
			`Terminal component: Sent server info script command for terminal ID ${terminalId} (pane ${paneId})`
		);

		// Mark this terminal as having received the welcome message
		if (!welcomeMessageSent.current.has(paneId)) {
			welcomeMessageSent.current.add(paneId);
			console.log(
				`Terminal component: Marked terminal ID ${paneId} as having received welcome message`
			);
		}
	};

	const initializeTerminal = (
		paneId: string,
		paneTerminalId: string
	): Promise<(() => void) | null> | null => {
		console.log(
			`Terminal component: Initializing terminal pane ${paneId} with terminal ID ${paneTerminalId}, isVisible: ${isVisible}`
		);

		// If the terminal is not visible, delay initialization until it becomes visible
		// But still check if it's in the cache
		if (!isVisible && !terminalCache.hasTerminal(paneTerminalId)) {
			console.log(
				`Terminal component: Terminal ${paneTerminalId} is not visible and not in cache, delaying initialization`
			);
			return null;
		}

		// Check if this terminal is already being initialized
		if (terminalsBeingInitialized.current.has(paneId)) {
			console.log(
				`Terminal component: Terminal pane ${paneId} is already being initialized, skipping`
			);
			return null;
		}

		// Check if the terminal is already initialized in this component instance
		const existingPane = panes.find((p) => p.id === paneId);
		if (existingPane && existingPane.xterm) {
			console.log(
				`Terminal component: Terminal pane ${paneId} already initialized in this component, skipping`
			);

			// If the terminal is visible, make sure it's focused
			if (isVisible && existingPane.xterm) {
				setTimeout(() => {
					if (existingPane.xterm) {
						existingPane.xterm.focus();
						console.log(
							`Terminal component: Focused existing terminal for pane ${paneId}`
						);
					}
				}, 50);
			}

			return null;
		}

		// Check if the terminal is in the cache
		if (terminalCache.hasTerminal(paneTerminalId)) {
			console.log(
				`Terminal component: Terminal ${paneTerminalId} found in cache, reusing`
			);

			const cachedTerminal = terminalCache.getTerminal(paneTerminalId);
			if (cachedTerminal) {
				// Get terminal element
				const terminalElement = terminalRefs.current[paneId];
				if (!terminalElement) {
					console.error(
						`Terminal component: Terminal element for pane ${paneId} not available`
					);
					return null;
				}

				// Clear the terminal element
				while (terminalElement.firstChild) {
					terminalElement.removeChild(terminalElement.firstChild);
				}

				// Re-open the terminal in the new element
				try {
					console.log(
						`Terminal component: Reopening cached terminal ${paneTerminalId} in new element`
					);
					cachedTerminal.xterm.open(terminalElement);

					// Try to fit terminal
					try {
						cachedTerminal.fitAddon.fit();
						console.log(
							`Terminal component: Fitted cached terminal ${paneTerminalId}`
						);

						// Focus the terminal if it's visible
						if (isVisible) {
							cachedTerminal.xterm.focus();
							console.log(
								`Terminal component: Focused cached terminal ${paneTerminalId}`
							);
						}
					} catch (err) {
						console.error(`Error fitting cached terminal: ${err}`);
					}

					// Update pane with cached terminal instance
					setPanes((prevPanes) =>
						prevPanes.map((p) =>
							p.id === paneId
								? {
										...p,
										xterm: cachedTerminal.xterm,
										fitAddon: cachedTerminal.fitAddon,
										searchAddon: cachedTerminal.searchAddon,
										dataBuffer: cachedTerminal.dataBuffer,
										connectionStatus: "connected",
										lastActivityTime: Date.now(),
								  }
								: p
						)
					);

					// Return a no-op cleanup function since the terminal is cached
					return Promise.resolve(() => {
						console.log(
							`Terminal component: No cleanup needed for cached terminal ${paneTerminalId}`
						);
					});
				} catch (err) {
					console.error(`Error reopening cached terminal: ${err}`);
					// If reopening fails, remove from cache and continue with creating a new terminal
					terminalCache.removeTerminal(paneTerminalId);
				}
			}
		}

		// If we're not visible and not in cache, delay initialization
		if (!isVisible) {
			console.log(
				`Terminal component: Terminal ${paneTerminalId} is not visible, delaying initialization`
			);
			return null;
		}

		// Mark this terminal as being initialized
		terminalsBeingInitialized.current.add(paneId);
		console.log(
			`Terminal component: Marked pane ${paneId} as being initialized`
		);

		// Get terminal element
		const terminalElement = terminalRefs.current[paneId];
		if (!terminalElement) {
			console.error(
				`Terminal component: Terminal element for pane ${paneId} not available`
			);
			terminalsBeingInitialized.current.delete(paneId);
			return null;
		}

		try {
			// Double-check that we have the element
			const element = terminalRefs.current[paneId];
			if (!element) {
				throw new Error(`Terminal element for pane ${paneId} not available`);
			}

			// Check if the element is actually in the DOM
			if (!document.body.contains(element)) {
				throw new Error(
					`Terminal element for pane ${paneId} is not in the DOM`
				);
			}

			const pane = panes.find((p) => p.id === paneId);
			if (pane?.xterm) {
				console.log(
					`Terminal component: Terminal pane ${paneId} already initialized, skipping`
				);
				return null;
			}

			// Check element dimensions
			const rect = element.getBoundingClientRect();
			console.log(`Terminal element dimensions for pane ${paneId}:`, {
				width: rect.width,
				height: rect.height,
				top: rect.top,
				left: rect.left,
				visible: rect.width > 0 && rect.height > 0,
			});

			if (rect.width === 0 || rect.height === 0) {
				console.warn(
					`Terminal element for pane ${paneId} has zero dimensions, forcing minimum size`
				);
				element.style.minWidth = "200px";
				element.style.minHeight = "150px";
			}

			try {
				// Initialize xterm.js
				console.log(
					"================= Creating new terminal instance ==================="
				);
				console.log(
					`Terminal component: Creating XTerm instance for pane ${paneId} with terminal ID ${paneTerminalId}`
				);
				const term = new XTerm({
					cursorBlink: true,
					macOptionIsMeta: true,
					scrollback: 10000,
					fontFamily: 'Menlo, Monaco, "Courier New", monospace',
					fontSize: 14,
					lineHeight: 1.2,
					allowProposedApi: true, // Enable proposed APIs
					theme: {
						background: "#1a1a24",
						foreground: "#f0f0f0",
						cursor: "#ffffff",
						cursorAccent: "#000000",
						// selection: "rgba(255, 255, 255, 0.3)",
						black: "#000000",
						red: "#e06c75",
						green: "#98c379",
						yellow: "#e5c07b",
						blue: "#61afef",
						magenta: "#c678dd",
						cyan: "#56b6c2",
						white: "#dcdfe4",
						brightBlack: "#5c6370",
						brightRed: "#e06c75",
						brightGreen: "#98c379",
						brightYellow: "#e5c07b",
						brightBlue: "#61afef",
						brightMagenta: "#c678dd",
						brightCyan: "#56b6c2",
						brightWhite: "#ffffff",
					},
				});

				// Create data buffer for this terminal
				const dataBuffer = new TerminalDataBuffer(term, paneId);

				// Add addons
				console.log(`Terminal component: Loading addons for pane ${paneId}`);

				try {
					const fitAddon = new FitAddon();
					term.loadAddon(fitAddon);

					const webLinksAddon = new WebLinksAddon();
					term.loadAddon(webLinksAddon);

					const searchAddon = new SearchAddon();
					term.loadAddon(searchAddon);

					const unicode11Addon = new Unicode11Addon();
					term.loadAddon(unicode11Addon);

					console.log(
						`Terminal component: Addons loaded successfully for pane ${paneId}`
					);

					// Open terminal with a small delay to ensure DOM is ready
					console.log(
						`Terminal component: Opening terminal in element for pane ${paneId}`
					);

					// Function to open terminal with a small delay to ensure DOM is ready
					const openTerminalWithDelay = (
						term: typeof Terminal.prototype,
						element: HTMLDivElement | null
					): Promise<void> => {
						return new Promise<void>((resolve, reject) => {
							if (!element) {
								reject(
									new Error(
										`Terminal component: Terminal element is null for pane ${paneId}`
									)
								);
								return;
							}

							try {
								setTimeout(() => {
									term.open(element);
									console.log(
										`Terminal component: Terminal opened successfully for pane ${paneId}`
									);
									term.write("\rInitializing terminal...\r\n");

									// Focus the terminal if it's visible
									if (isVisible) {
										setTimeout(() => {
											term.focus();
											console.log(
												`Terminal component: Focused terminal for pane ${paneId} after opening`
											);
										}, 50);
									}

									resolve();
								}, 50);
							} catch (error) {
								console.error(
									`Terminal component: Error opening terminal for pane ${paneId}:`,
									error
								);
								reject(error);
							}
						});
					};

					// Open terminal and then fit it
					return openTerminalWithDelay(term, element)
						.then(() => {
							// Try to fit terminal
							try {
								console.log(
									`Terminal component: Fitting terminal for pane ${paneId}`
								);
								fitAddon.fit();
								console.log(
									`Terminal component: Terminal fitted successfully for pane ${paneId}`
								);
							} catch (err: any) {
								console.error(
									`Terminal component: Error fitting terminal: ${err.message}`
								);
							}

							// Handle terminal data input
							term.onData((data) => {
								// Update activity timestamp when user types
								updateActivityTimestamp(paneId);

								// Send data using Tauri's event system
								// Only emit when Enter key is pressed
								if (data === "\r" || data === "\n") {
									// Get the command from the buffer and emit it
									emit("terminal:data", {
										terminalId: paneTerminalId,
										data,
									});
								} else {
									// For non-Enter keys, still emit to show typing in terminal
									// emit("terminal:data", {
									// 	terminalId: paneTerminalId,
									// 	data,
									// });
								}

								// Add the current data to the buffer
								lastInputCharsRef.current += data;

								// Keep only the last 20 characters to avoid memory issues
								if (lastInputCharsRef.current.length > 20) {
									lastInputCharsRef.current =
										lastInputCharsRef.current.slice(-20);
								}

								// Check if the buffer contains "exit" followed by Enter
								if (
									lastInputCharsRef.current.endsWith("exit\r") ||
									lastInputCharsRef.current.endsWith("exit\n")
								) {
									console.log(
										`Terminal component: Detected potential exit command in terminal ${paneTerminalId}, waiting for confirmation`
									);
								}
							});

							// Handle terminal resize
							term.onResize(({ cols, rows }) => {
								// Update activity timestamp on resize
								updateActivityTimestamp(paneId);
								emit("terminal:resize", {
									terminalId: paneTerminalId,
									cols,
									rows,
								});
							});

							sendServerInfoCommand(term, paneId, paneTerminalId);

							// Update pane with terminal instance
							setPanes((prevPanes) =>
								prevPanes.map((p) =>
									p.id === paneId
										? {
												...p,
												xterm: term,
												fitAddon,
												searchAddon,
												connectionStatus: "connected",
												dataBuffer,
												lastActivityTime: Date.now(),
										  }
										: p
								)
							);

							// Set up event listeners for terminal data
							const setupEventListeners = async () => {
								// Track connection status for monitoring
								let isConnected = true;
								let connectionLostTime: number | null = null;

								try {
									console.log(
										`Terminal component: Setting up event listeners for terminal ${paneTerminalId}`
									);

									// Create a timeout for resource cleanup if initialization takes too long
									const initializationTimeout = setTimeout(() => {
										console.warn(
											`Terminal component: Event listener setup taking too long for ${paneTerminalId}`
										);
									}, 5000);

									// Set up the data listener
									const unlistenData = await listen(
										"terminal:data",
										(event) => {
											try {
												// Validate payload structure
												if (!event || !event.payload) {
													console.error(
														`Terminal component: Invalid event payload`
													);
													return;
												}

												const data = event.payload as {
													terminalId: string;
													data: string;
												};

												// Validate required fields
												if (!data.terminalId || data.data === undefined) {
													console.error(
														`Terminal component: Missing required data in terminal event`,
														data
													);
													return;
												}

												if (data.terminalId === paneTerminalId) {
													// Log data received for debugging (truncated for performance)
													console.log(
														`Terminal component: Received data for terminal ID ${paneTerminalId}`,
														data.data.length > 100
															? `${data.data.substring(0, 100)}...`
															: data.data
													);

													// Update activity timestamp when receiving data
													updateActivityTimestamp(paneId);

													// Find the current pane with the updated state
													const currentPane = panes.find(
														(p) => p.id === paneId
													);

													// Process data with optimized approach
													if (currentPane && currentPane.dataBuffer) {
														// Use the buffer for better performance
														currentPane.dataBuffer.write(data.data);
													} else if (term) {
														// Fallback to direct write if buffer not available
														term.write(data.data);
													}

													// Check for exit command completion with improved pattern matching
													if (
														(data.data.includes("Connection to ") &&
															data.data.includes(" closed.")) ||
														data.data ===
															"Connection closed by foreign host.\r\n" ||
														data.data === "logout\r\n" ||
														/exit\r\n\r\nlogout\r\n/.test(data.data)
													) {
														console.log(
															`Terminal component: Detected SSH session end in terminal ${paneTerminalId}`
														);

														// Add a small delay to ensure all data is processed
														setTimeout(() => {
															console.log(
																`Terminal component: Closing session ${sessionId} after exit command`
															);
															onClose();
														}, 500);
													}
												}
											} catch (err) {
												console.error(
													`Error handling terminal data: ${
														err instanceof Error ? err.message : String(err)
													}`
												);

												// Try to recover if possible
												try {
													if (term && event?.payload) {
														const payload = event.payload as any;
														if (
															payload.data &&
															typeof payload.data === "string"
														) {
															term.write(payload.data);
														}
													}
												} catch (recoveryErr) {
													// If recovery fails, just log and continue
													console.error(
														`Recovery attempt failed: ${recoveryErr}`
													);
												}
											}
										}
									);

									// Set up the error listener
									const unlistenError = await listen(
										"terminal:error",
										(event) => {
											try {
												// Validate event payload
												if (!event || !event.payload) {
													console.error(
														`Terminal component: Invalid error event payload`
													);
													return;
												}

												const data = event.payload as {
													terminalId: string;
													error: string;
												};

												// Validate required fields
												if (!data.terminalId || data.error === undefined) {
													console.error(
														`Terminal component: Missing required data in error event`,
														data
													);
													return;
												}

												if (data.terminalId === paneTerminalId) {
													// Log detailed error information
													console.error(
														`Terminal error [${paneTerminalId}]: ${data.error}`
													);

													// Display error to user with formatting
													if (term) {
														term.write(
															`\r\n\x1b[31mConnection error: ${data.error}\x1b[0m\r\n`
														);
													}

													// Update terminal status and attempt recovery
													handleConnectionError(paneId);

													// Add timestamp for analytics/debugging
													console.log(
														`Error occurred at: ${new Date().toISOString()}`
													);
												}
											} catch (err) {
												console.error(
													`Error handling terminal error event: ${
														err instanceof Error ? err.message : String(err)
													}`
												);

												// Basic fallback recovery
												try {
													if (term) {
														term.write(
															`\r\n\x1b[31mAn error occurred in the terminal\x1b[0m\r\n`
														);
													}
													handleConnectionError(paneId);
												} catch (recoveryErr) {
													console.error(
														`Recovery from terminal error failed: ${recoveryErr}`
													);
												}
											}
										}
									);

									// Clear the timeout since we've successfully set up listeners
									clearTimeout(initializationTimeout);
									console.log(
										`Terminal component: Event listeners successfully set up for ${paneTerminalId}`
									);

									// Add optional connection health monitoring
									const healthCheck = setInterval(() => {
										if (!isConnected && connectionLostTime) {
											const downtime = Date.now() - connectionLostTime;
											if (downtime > 30000) {
												// 30 seconds downtime
												console.warn(
													`Terminal ${paneTerminalId} connection issue persisting for ${
														downtime / 1000
													}s`
												);
												// Could implement additional recovery here
											}
										}
									}, 10000);

									// Store the terminal in the cache with complete metadata
									terminalCache.storeTerminal(paneTerminalId, {
										xterm: term,
										fitAddon,
										searchAddon,
										dataBuffer,
										lastActivityTime: Date.now(),
										eventListeners: {
											data: unlistenData,
											error: unlistenError,
										},
										isActive: isVisible,
									});

									// Return comprehensive cleanup function
									return () => {
										// Clean up event listeners
										unlistenData();
										unlistenError();
										clearInterval(healthCheck);

										// Track cleanup in logs
										console.log(
											`Terminal component: Removed event listeners for terminal ${paneTerminalId}`
										);

										// Mark connection as closed for analytics
										isConnected = false;
										if (!connectionLostTime) {
											connectionLostTime = Date.now();
										}
									};
								} catch (err) {
									console.error(
										`Error setting up event listeners: ${
											err instanceof Error ? err.message : String(err)
										}`
									);

									// Log detailed error information
									console.error(
										`Setup failed for terminal ${paneTerminalId} at ${new Date().toISOString()}`
									);

									// Mark connection status for monitoring
									isConnected = false;
									connectionLostTime = Date.now();

									// Return minimal cleanup function
									return () => {
										console.log(
											`Terminal component: Running minimal cleanup for failed listener setup`
										);
									};
								}
							};

							// Return a promise that resolves to the cleanup function
							return setupEventListeners();
						})
						.catch((err) => {
							// If there's an error, also remove from the set
							terminalsBeingInitialized.current.delete(paneId);
							console.log(
								`Terminal component: Removed pane ${paneId} from being initialized set due to error`
							);
							console.error(
								`Terminal component: Error in terminal initialization promise chain: ${err}`
							);
							return null;
						});
				} catch (addonErr) {
					console.error(
						`Terminal component: Error loading addons: ${addonErr}`
					);
					throw addonErr;
				}
			} catch (termErr) {
				console.error(
					`Terminal component: Error creating XTerm instance: ${termErr}`
				);
				throw termErr;
			}
		} catch (err: any) {
			console.error(
				`Terminal component: Error in initializeTerminal: ${err.message}`
			);
			return null;
		}
	};

	// Handler functions
	const handleData = useCallback(
		(paneId: string, data: string) => {
			const pane = panes.find((p) => p.id === paneId);
			if (pane?.xterm) {
				pane.xterm.write(data);
			}
		},
		[panes]
	);

	const handleRetryConnection = useCallback(
		(paneId: string) => {
			const pane = panes.find((p) => p.id === paneId);
			if (pane) {
				setPanes((prevPanes) =>
					prevPanes.map((p) =>
						p.id === paneId
							? {
									...p,
									connectionStatus: "reconnecting",
									reconnectAttempts: 0,
							  }
							: p
					)
				);
				handleConnectionError(paneId);
			}
		},
		[panes]
	);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			isMounted.current = false;
			cleanupFunctions.current.forEach((cleanup) => {
				if (typeof cleanup === "function") {
					try {
						cleanup();
					} catch (err) {
						console.error("Error during cleanup:", err);
					}
				} else if (cleanup instanceof Promise) {
					cleanup
						.then((cleanupFn) => {
							if (cleanupFn && typeof cleanupFn === "function") {
								try {
									cleanupFn();
								} catch (err) {
									console.error("Error during promise-based cleanup:", err);
								}
							}
						})
						.catch((err) => {
							console.error("Error resolving cleanup promise:", err);
						});
				}
			});
		};
	}, []);

	const handleAddPane = async () => {
		try {
			console.log("Terminal component: Adding new pane");

			// Request a new terminal from the main process
			const newTerminalId = await invoke<string>("terminal:create", {
				hostId,
			});

			console.log(
				`Terminal component: Created new terminal with ID ${newTerminalId}`
			);

			// Create a new pane
			const newPaneId = `${panes.length + 1}`;
			const newPane: TerminalPaneState = {
				id: newPaneId,
				terminalId: newTerminalId,
				xterm: null,
				fitAddon: null,
				searchAddon: null,
				dataBuffer: null,
				connectionStatus: "connected",
				reconnectAttempts: 0,
				lastActivityTime: Date.now(),
			};

			// Add the new pane
			setPanes((prevPanes) => [...prevPanes, newPane]);

			// Set the new pane as active
			setActivePane(newPaneId);

			console.log(
				`Terminal component: Added new pane ${newPaneId} with terminal ID ${newTerminalId}`
			);

			// Allow the DOM to update before initializing the terminal
			setTimeout(() => {
				console.log(
					`Terminal component: Initializing new pane ${newPaneId} after delay`
				);

				// We need to temporarily set initializationAttempted to false to allow initialization
				const wasInitialized = initializationAttempted.current;
				initializationAttempted.current = false;

				const initResult = initializeTerminal(newPaneId, newTerminalId);

				if (initResult instanceof Promise) {
					initResult
						.then((cleanup) => {
							if (cleanup) {
								cleanupFunctions.current.push(cleanup);
							}
							// Restore the initialization flag
							initializationAttempted.current = wasInitialized;
							console.log(
								`Terminal component: New pane ${newPaneId} initialized successfully`
							);
						})
						.catch((err) => {
							console.error(`Error initializing new terminal pane: ${err}`);
							// Restore the initialization flag even on error
							initializationAttempted.current = wasInitialized;
						});
				} else if (initResult) {
					cleanupFunctions.current.push(initResult);
					// Restore the initialization flag
					initializationAttempted.current = wasInitialized;
				} else {
					// If initResult is null, also restore the flag
					initializationAttempted.current = wasInitialized;
				}
			}, 200); // Increased delay for better reliability
		} catch (err) {
			console.error(`Error adding terminal pane: ${err}`);
		}
	};

	const handleRemovePane = (paneId: string) => {
		try {
			// Find the pane
			const pane = panes.find((p) => p.id === paneId);
			if (!pane) return;

			// Clean up data buffer
			if (pane.dataBuffer) {
				pane.dataBuffer.dispose();
			}

			// Dispose the terminal
			if (pane.xterm) {
				pane.xterm.dispose();
			}

			// Remove from welcome message tracking
			if (welcomeMessageSent.current.has(pane.terminalId)) {
				welcomeMessageSent.current.delete(pane.terminalId);
				console.log(
					`Terminal component: Removed terminal ID ${pane.terminalId} from welcome message tracking`
				);
			}

			// Notify main process to clean up this terminal
			emit("terminal:close", {
				terminalId: pane.terminalId,
				sessionId,
			});

			// Remove the pane
			setPanes((prevPanes) => prevPanes.filter((p) => p.id !== paneId));

			// Set active pane to the first one if the active pane was removed
			if (activePane === paneId && panes.length > 1) {
				const remainingPanes = panes.filter((p) => p.id !== paneId);
				if (remainingPanes.length > 0) {
					const firstPane = remainingPanes[0];
					if (firstPane) {
						setActivePane(firstPane.id);
					}
				}
			}
		} catch (err) {
			console.error(`Error removing terminal pane: ${err}`);
		}
	};

	const handleCopySelection = () => {
		const activeTerminal = panes.find((p) => p.id === activePane)?.xterm;
		if (activeTerminal) {
			const selection = activeTerminal.getSelection();
			if (selection) {
				navigator.clipboard.writeText(selection);
			}
		}
	};

	const handleSearch = () => {
		const activeSearchAddon = panes.find(
			(p) => p.id === activePane
		)?.searchAddon;
		if (activeSearchAddon && searchTerm) {
			activeSearchAddon.findNext(searchTerm);
		}
	};

	const handleClearTerminal = () => {
		const activeTerminal = panes.find((p) => p.id === activePane)?.xterm;
		if (activeTerminal) {
			activeTerminal.clear();
		}
	};

	const toggleSplitDirection = () => {
		setSplitDirection((prev) =>
			prev === "horizontal" ? "vertical" : "horizontal"
		);
	};

	// Show loading state while initializing
	if (isInitializing) {
		return (
			<div className="flex flex-col h-[calc(100vh-100px)] bg-[#1a1a24] text-white p-4">
				<div className="flex justify-between items-center mb-4">
					<div className="flex items-center">
						<span className="text-gray-400">Initializing terminal...</span>
						{hostInfo && (
							<span className="ml-2 text-gray-400">
								{hostInfo.label} ({hostInfo.hostname})
							</span>
						)}
					</div>
					<button
						onClick={onClose}
						className="p-1 rounded hover:bg-[#252532] text-gray-400 hover:text-white"
					>
						<X className="h-5 w-5" />
					</button>
				</div>
				<div className="flex-1 flex items-center justify-center">
					<div className="text-center">
						<Loader2 className="h-8 w-8 animate-spin text-[#f97316] mx-auto mb-4" />
						<p className="text-gray-400">Connecting to terminal...</p>
					</div>
				</div>
			</div>
		);
	}

	if (initError) {
		return (
			<div className="flex flex-col h-full bg-[#1a1a24] text-white p-4">
				<div className="flex justify-between items-center mb-4">
					<span className="text-red-400">Error initializing terminal</span>
					<button
						onClick={onClose}
						className="p-1 rounded hover:bg-[#252532] text-gray-400 hover:text-white"
					>
						<X className="h-5 w-5" />
					</button>
				</div>
				<div className="flex-1 flex items-center justify-center">
					<div className="text-center">
						<p className="text-red-400 mb-4">{initError}</p>
						<button
							onClick={() => {
								setIsInitializing(true);
								setInitError(null);
							}}
							className="bg-[#252532] hover:bg-[#2d2d3a] text-white px-4 py-2 rounded"
						>
							Retry
						</button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col h-[calc(100vh-50px)] w-full bg-[#1a1a24] text-white overflow-hidden">
			{/* Terminal header */}
			<div className="flex justify-between items-center p-2 border-b border-[#2d2d3a]">
				<div className="flex items-center">
					{hostInfo && (
						<span className="text-sm text-gray-400">
							{hostInfo.label} ({hostInfo.hostname})
						</span>
					)}
				</div>
				<div className="flex items-center space-x-1">
					<button
						onClick={() => {
							const activeTerminal = panes.find((p) => p.id === activePane);
							if (activeTerminal) {
								navigator.clipboard.writeText(
									window.getSelection()?.toString() || ""
								);
							}
						}}
						className="p-1 rounded hover:bg-[#252532] text-gray-400 hover:text-white"
						title="Copy selection"
					>
						<Copy className="h-4 w-4" />
					</button>
					<button
						onClick={() => setIsSearchOpen(!isSearchOpen)}
						className="p-1 rounded hover:bg-[#252532] text-gray-400 hover:text-white"
						title="Search"
					>
						<Search className="h-4 w-4" />
					</button>
					<button
						onClick={onClose}
						className="p-1 rounded hover:bg-[#252532] text-gray-400 hover:text-white"
						title="Close terminal"
					>
						<X className="h-4 w-4" />
					</button>
				</div>
			</div>

			{/* Search bar */}
			{isSearchOpen && (
				<div className="flex items-center p-2 border-b border-[#2d2d3a]">
					<input
						type="text"
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						placeholder="Search..."
						className="flex-1 bg-[#252532] border border-[#2d2d3a] rounded px-2 py-1 text-sm text-white"
					/>
				</div>
			)}

			{/* Terminal panes */}
			<div className="flex-1 flex flex-col">
				{panes.map((pane) => (
					<div
						key={pane.id}
						className={`flex-1 relative ${
							pane.id === activePane
								? "border border-green-200 border-opacity-20 rounded-lg"
								: ""
						}`}
						style={{
							minHeight: "150px",
							minWidth: "200px",
							flex: 1,
							position: "relative",
						}}
						onClick={() => setActivePane(pane.id)}
					>
						{/* Connection status indicator */}
						{pane.connectionStatus === "reconnecting" && (
							<div className="absolute top-2 right-2 z-10 bg-yellow-600 text-white text-xs px-2 py-1 rounded flex items-center">
								<Loader2 className="h-3 w-3 animate-spin mr-1" />
								Reconnecting...
							</div>
						)}
						{pane.connectionStatus === "disconnected" && (
							<div className="absolute top-2 right-2 z-10 bg-red-600 text-white text-xs px-2 py-1 rounded flex items-center">
								Disconnected
								<button
									className="ml-2 bg-[#252532] hover:bg-[#2d2d3a] p-1 rounded"
									onClick={(e) => {
										e.stopPropagation();
										// Reset reconnection attempts and try again
										setPanes((prevPanes) =>
											prevPanes.map((p) =>
												p.id === pane.id
													? {
															...p,
															reconnectAttempts: 0,
															connectionStatus: "reconnecting",
													  }
													: p
											)
										);
										handleConnectionError(pane.id);
									}}
								>
									<RefreshCw className="h-3 w-3" />
								</button>
							</div>
						)}
						<div
							ref={(el) => {
								// Store the reference and log when it's set
								if (el && !terminalRefs.current[pane.id]) {
									console.log(
										`Terminal component: DOM element for pane ${pane.id} is now available`
									);
									terminalRefs.current[pane.id] = el;

									// Force a re-render to trigger the initialization useEffect
									setForceRender((prev) => prev + 1);
									console.log(
										`Terminal component: Forced re-render after ref set for pane ${pane.id}`
									);
								}
							}}
							className="w-full h-full overflow-hidden"
							style={{
								display: "block",
								minHeight: "150px",
								minWidth: "200px",
								flex: 1,
								position: "relative",
							}}
							id={`terminal-container-${pane.id}`}
							data-terminal-pane-id={pane.id}
						/>
					</div>
				))}
			</div>
		</div>
	);
};
