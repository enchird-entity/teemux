import React, { useEffect, useState, useRef, useCallback } from "react";
import { Terminal } from "./terminal";
import { terminalCache } from "../services/terminal-cache";

// Define the Session interface locally
interface Session {
	id: string;
	hostId: string;
	terminalId: string; // Keep for backward compatibility
	terminals: string[]; // Array of terminal IDs
}

interface TerminalManagerProps {
	sessions: Session[];
	activeSessionId: string | null;
	onCloseSession: (sessionId: string) => void;
}

export const TerminalManager: React.FC<TerminalManagerProps> = ({
	sessions,
	activeSessionId,
	onCloseSession,
}) => {
	const [activeSessions, setActiveSessions] = useState<string[]>([]);
	const renderedSessionsRef = useRef<Set<string>>(new Set());
	const prevActiveSessionIdRef = useRef<string | null>(null);

	// Log when sessions or activeSessionId changes
	useEffect(() => {
		console.log(
			"TerminalManager: Sessions updated:",
			sessions.map((s) => s.id)
		);
		console.log("TerminalManager: Active session ID:", activeSessionId);
	}, [sessions, activeSessionId]);

	// Update active sessions when sessions change
	useEffect(() => {
		console.log("TerminalManager: Updating active sessions");

		// Add new sessions to activeSessions
		const newSessions = sessions
			.map((session) => session.id)
			.filter((id) => !activeSessions.includes(id));

		if (newSessions.length > 0) {
			console.log("TerminalManager: Adding new sessions:", newSessions);
			setActiveSessions((prev) => [...prev, ...newSessions]);

			// Add new sessions to rendered sessions
			newSessions.forEach((id) => {
				renderedSessionsRef.current.add(id);
				console.log(
					`TerminalManager: Added session ${id} to rendered sessions`
				);
			});
		}

		// Remove closed sessions from activeSessions
		const closedSessions = activeSessions.filter(
			(id) => !sessions.some((session) => session.id === id)
		);

		if (closedSessions.length > 0) {
			console.log("TerminalManager: Removing closed sessions:", closedSessions);
			setActiveSessions((prev) =>
				prev.filter((id) => !closedSessions.includes(id))
			);

			// Remove closed sessions from rendered sessions and clean up terminals
			closedSessions.forEach((id) => {
				renderedSessionsRef.current.delete(id);
				console.log(
					`TerminalManager: Removed session ${id} from rendered sessions`
				);

				// Find and clean up terminals associated with this session
				const sessionTerminals =
					sessions.find((s) => s.id === id)?.terminals || [];
				sessionTerminals.forEach((terminalId) => {
					if (terminalCache.hasTerminal(terminalId)) {
						console.log(
							`TerminalManager: Removing terminal ${terminalId} from cache for closed session ${id}`
						);
						terminalCache.removeTerminal(terminalId);
					}
				});
			});
		}
	}, [sessions, activeSessions]);

	// Handle active session change
	useEffect(() => {
		if (activeSessionId && prevActiveSessionIdRef.current !== activeSessionId) {
			console.log(
				`TerminalManager: Active session changed from ${prevActiveSessionIdRef.current} to ${activeSessionId}`
			);

			// Mark the previous session's terminals as inactive
			if (prevActiveSessionIdRef.current) {
				const prevSession = sessions.find(
					(s) => s.id === prevActiveSessionIdRef.current
				);
				if (prevSession) {
					prevSession.terminals.forEach((terminalId) => {
						if (terminalCache.hasTerminal(terminalId)) {
							console.log(
								`TerminalManager: Setting terminal ${terminalId} inactive`
							);
							terminalCache.setTerminalActive(terminalId, false);
						}
					});
				}
			}

			// Mark the new session's terminals as active
			const activeSession = sessions.find((s) => s.id === activeSessionId);
			if (activeSession) {
				activeSession.terminals.forEach((terminalId) => {
					if (terminalCache.hasTerminal(terminalId)) {
						console.log(
							`TerminalManager: Setting terminal ${terminalId} active`
						);
						terminalCache.setTerminalActive(terminalId, true);

						// Give the terminal a moment to become visible before focusing
						setTimeout(() => {
							try {
								const terminal = terminalCache.getTerminal(terminalId);
								if (terminal && terminal.xterm) {
									console.log(
										`TerminalManager: Focusing terminal ${terminalId}`
									);

									// Force focus on the terminal
									terminal.xterm.focus();

									// Also try to fit the terminal in case the size changed
									if (terminal.fitAddon) {
										terminal.fitAddon.fit();
									}
								}
							} catch (err) {
								console.error(`Error focusing terminal ${terminalId}:`, err);
							}
						}, 250); // Increased timeout for better reliability
					}
				});
			}

			// Add the active session to rendered sessions if not already there
			if (!renderedSessionsRef.current.has(activeSessionId)) {
				renderedSessionsRef.current.add(activeSessionId);
				console.log(
					`TerminalManager: Added active session ${activeSessionId} to rendered sessions`
				);
			}

			prevActiveSessionIdRef.current = activeSessionId;
		} else if (
			activeSessionId === null &&
			prevActiveSessionIdRef.current !== null
		) {
			// Handle case when activeSessionId becomes null (switching to non-terminal section)
			console.log(
				`TerminalManager: Active session cleared, preserving session state`
			);

			// We don't need to mark terminals as inactive here since we want to preserve their state
			// Just update the ref for the next change
			prevActiveSessionIdRef.current = null;
		}
	}, [activeSessionId, sessions]);

	// Clean up terminals when component unmounts
	useEffect(() => {
		return () => {
			console.log("TerminalManager: Cleaning up all terminals on unmount");
			terminalCache.cleanupAll();
		};
	}, []);

	// Memoize the handler to prevent unnecessary re-renders
	const handleCloseSession = useCallback(
		(sessionId: string) => {
			console.log(`TerminalManager: Closing session ${sessionId}`);

			// Find and clean up terminals associated with this session
			const sessionToClose = sessions.find((s) => s.id === sessionId);
			if (sessionToClose) {
				sessionToClose.terminals.forEach((terminalId) => {
					if (terminalCache.hasTerminal(terminalId)) {
						console.log(
							`TerminalManager: Removing terminal ${terminalId} from cache for closed session ${sessionId}`
						);
						terminalCache.removeTerminal(terminalId);
					}
				});
			}

			// Remove from rendered sessions
			renderedSessionsRef.current.delete(sessionId);
			console.log(
				`TerminalManager: Removed session ${sessionId} from rendered sessions`
			);

			// Call the parent handler
			onCloseSession(sessionId);
		},
		[sessions, onCloseSession]
	);

	return (
		<div className="terminal-manager w-full h-full flex flex-col overflow-hidden">
			{sessions.map((session) => {
				// Determine if this session should be rendered
				const isActive = session.id === activeSessionId;
				const shouldRender =
					isActive || renderedSessionsRef.current.has(session.id);

				if (!shouldRender) {
					console.log(
						`TerminalManager: Not rendering session ${session.id} (not active or previously rendered)`
					);
					return null;
				}

				console.log(
					`TerminalManager: Rendering session ${session.id}, isActive: ${isActive}`
				);

				return (
					<div
						key={session.id}
						className="terminal-container w-full h-full flex-1 overflow-hidden"
						style={{
							display: isActive ? "flex" : "none",
							flexDirection: "column",
							zIndex: isActive ? 10 : 1,
							position: "relative", // Use relative positioning instead of absolute
						}}
					>
						{session.terminals.map((terminalId) => (
							<Terminal
								key={terminalId}
								terminalId={terminalId}
								sessionId={session.id}
								hostId={session.hostId}
								onClose={() => handleCloseSession(session.id)}
								isVisible={isActive}
							/>
						))}
					</div>
				);
			})}
		</div>
	);
};
