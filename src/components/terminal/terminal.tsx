import React, { useState, useCallback } from "react";
import { Copy, X, Search, Trash2, Loader2 } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { TerminalPane } from "./terminal-pane";
import { useHost } from "../../hooks/use-host";

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
	connectionStatus: "connected" | "disconnected" | "reconnecting";
	reconnectAttempts: number;
	lastActivityTime: number;
}

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
			connectionStatus: "connected",
			reconnectAttempts: 0,
			lastActivityTime: Date.now(),
		},
	]);
	const [activePane, setActivePane] = useState("1");
	const [isSearchOpen, setIsSearchOpen] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");
	const [hostInfo, setHostInfo] = useState<{
		label: string;
		hostname: string;
	} | null>(null);
	const [isInitializing, setIsInitializing] = useState(true);
	const [initError, setInitError] = useState<string | null>(null);

	// Maximum number of reconnection attempts
	const MAX_RECONNECT_ATTEMPTS = 3;
	// Reconnection delay in milliseconds (increases with each attempt)
	const RECONNECT_DELAY_BASE = 2000;

	// Load host info
	React.useEffect(() => {
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

	const handleData = useCallback((paneId: string, data: string) => {
		setPanes((prevPanes) =>
			prevPanes.map((pane) =>
				pane.id === paneId ? { ...pane, lastActivityTime: Date.now() } : pane
			)
		);
	}, []);

	const handleConnectionError = useCallback(
		async (paneId: string) => {
			const pane = panes.find((p) => p.id === paneId);
			if (!pane) return;

			if (pane.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
				setPanes((prevPanes) =>
					prevPanes.map((p) =>
						p.id === paneId
							? {
									...p,
									connectionStatus: "reconnecting",
									reconnectAttempts: p.reconnectAttempts + 1,
							  }
							: p
					)
				);

				const delay =
					RECONNECT_DELAY_BASE * Math.pow(2, pane.reconnectAttempts);
				await new Promise((resolve) => setTimeout(resolve, delay));

				try {
					// Create a new terminal using Tauri command
					const newTerminalId = await invoke<string>("create_session", {
						hostId,
					});

					setPanes((prevPanes) =>
						prevPanes.map((p) =>
							p.id === paneId
								? {
										...p,
										terminalId: newTerminalId,
										connectionStatus: "connected",
								  }
								: p
						)
					);
				} catch (error) {
					setPanes((prevPanes) =>
						prevPanes.map((p) =>
							p.id === paneId
								? {
										...p,
										connectionStatus: "disconnected",
								  }
								: p
						)
					);
				}
			} else {
				setPanes((prevPanes) =>
					prevPanes.map((p) =>
						p.id === paneId
							? {
									...p,
									connectionStatus: "disconnected",
							  }
							: p
					)
				);
			}
		},
		[panes, hostId, MAX_RECONNECT_ATTEMPTS]
	);

	const handleRetryConnection = useCallback(
		(paneId: string) => {
			setPanes((prevPanes) =>
				prevPanes.map((p) =>
					p.id === paneId
						? {
								...p,
								reconnectAttempts: 0,
								connectionStatus: "reconnecting",
						  }
						: p
				)
			);
			handleConnectionError(paneId);
		},
		[handleConnectionError]
	);

	// Show loading state while initializing
	if (isInitializing) {
		return (
			<div className="flex flex-col h-full bg-[#1a1a24] text-white p-4">
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
		<div className="flex flex-col h-full w-full bg-[#1a1a24] text-white overflow-hidden">
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
					<TerminalPane
						key={pane.id}
						id={pane.id}
						terminalId={pane.terminalId}
						isActive={pane.id === activePane}
						isVisible={isVisible}
						onData={(data) => handleData(pane.id, data)}
						onError={(error) => handleConnectionError(pane.id)}
						connectionStatus={pane.connectionStatus}
						onRetryConnection={
							pane.connectionStatus === "disconnected"
								? () => handleRetryConnection(pane.id)
								: undefined
						}
					/>
				))}
			</div>
		</div>
	);
};
