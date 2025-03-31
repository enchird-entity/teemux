import React, {
	createContext,
	useContext,
	useState,
	useCallback,
	useEffect,
	useMemo,
} from "react";
import type { Session } from "../models/session";
import type { Host } from "../models/host";
import { ConnectionErrorToast } from "../components/connection-error-toast";
import { ConnectionError } from "../components/connection-error";

interface ConnectionContextType {
	// Connection state
	activeSessions: Session[];
	activeTab: string | null;
	connectingHost: {
		id: string;
		label: string;
		address: string;
		status: "connecting" | "connected" | "error";
		error?: string;
		logs?: string[];
	} | null;
	isConnecting: boolean;
	connectionLogs: string[];
	isHostSelectorOpen: boolean;
	setIsHostSelectorOpen: (isOpen: boolean) => void;
	// Connection actions
	connect: (hostId: string) => Promise<void>;
	disconnect: (sessionId: string) => void;
	setActiveTab: (sessionId: string | null) => void;
	clearConnectionError: () => void;
}

const ConnectionContext = createContext<ConnectionContextType | undefined>(
	undefined
);

export const ConnectionProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [activeSessions, setActiveSessions] = useState<Session[]>([]);
	const [activeTab, setActiveTab] = useState<string | null>(null);
	const [connectingHost, setConnectingHost] = useState<{
		id: string;
		label: string;
		address: string;
		status: "connecting" | "connected" | "error";
		error?: string;
		logs?: string[];
	} | null>(null);
	const [isConnecting, setIsConnecting] = useState(false);
	const [connectionLogs, setConnectionLogs] = useState<string[]>([]);
	const [isHostSelectorOpen, setIsHostSelectorOpen] = useState(false);

	// Load initial sessions
	// useEffect(() => {
	//   ipcRenderer.invoke('sessions:getAll').then((sessions: Session[]) => {
	//     setActiveSessions(sessions);
	//     if (sessions.length > 0) {
	//       setActiveTab(sessions[0].id);
	//     }
	//   });
	// }, []);

	// Set up IPC event listeners
	useEffect(() => {
		// Session started event handler
		const sessionStartedHandler = (_: any, session: Session) => {
			console.log(
				`ConnectionContext: Session started event received for session ${session.id}`
			);
			console.log(`ConnectionContext: Session details:`, session);

			// Update active sessions
			setActiveSessions((prev) => {
				console.log(
					`ConnectionContext: Adding session ${session.id} to active sessions`
				);
				return [...prev, session];
			});

			// Set this as the active tab
			console.log(`ConnectionContext: Setting active tab to ${session.id}`);
			setActiveTab(session.id);
			setIsConnecting(false);

			// Update connecting host status to connected
			if (connectingHost) {
				console.log(
					`ConnectionContext: Updating connecting host status to connected`
				);
				setConnectingHost({
					...connectingHost,
					status: "connected",
				});

				// Clear connecting host after a short delay to allow for UI transition
				setTimeout(() => {
					setConnectingHost(null);
				}, 1000);
			}
		};

		// Session ended event handler
		const sessionEndedHandler = (_: any, sessionId: string) => {
			console.log(
				`ConnectionContext: Received session:ended event for session ${sessionId}`
			);

			// First update the active sessions state
			setActiveSessions((prev) => {
				const updatedSessions = prev.filter((s) => s.id !== sessionId);
				console.log(
					`ConnectionContext: Updated active sessions:`,
					updatedSessions.map((s) => s.id)
				);

				// Then handle the active tab change if needed
				if (activeTab === sessionId) {
					console.log(
						`ConnectionContext: Active tab ${activeTab} is the one that ended, switching tabs`
					);

					if (updatedSessions.length > 0) {
						// Use setTimeout to ensure this runs after the state update
						setTimeout(() => {
							// setActiveTab(updatedSessions[0].id);
						}, 0);
					} else {
						console.log(
							`ConnectionContext: No remaining sessions, clearing active tab`
						);
						// Use setTimeout to ensure this runs after the state update
						setTimeout(() => {
							setActiveTab(null);
						}, 0);
					}
				}

				return updatedSessions;
			});
		};

		// Connection error handler
		const connectionErrorHandler = (
			_: any,
			data: { hostId: string; error: string }
		) => {
			console.log(
				`ConnectionContext: Connection error for host ${data.hostId}: ${data.error}`
			);
			setIsConnecting(false);

			if (connectingHost && connectingHost.id === data.hostId) {
				// Add error to connection logs
				const updatedLogs = [...connectionLogs];
				updatedLogs.push(`Connection error: ${data.error}`);
				setConnectionLogs(updatedLogs);

				// Update connecting host with error status and logs
				setConnectingHost((prev) =>
					prev
						? {
								...prev,
								status: "error",
								error: data.error,
								logs: updatedLogs,
						  }
						: null
				);

				// Don't automatically clear the connecting host - let the user dismiss it
			}

			// Get the host details if available
			const hostLabel = connectingHost?.label || "Unknown host";
		};

		// Register event listeners
		// ipcRenderer.on('session:started', sessionStartedHandler);
		// ipcRenderer.on('session:ended', sessionEndedHandler);
		// ipcRenderer.on('ssh:connectionError', connectionErrorHandler);

		// Cleanup function
		return () => {
			// ipcRenderer.removeListener('session:started', sessionStartedHandler);
			// ipcRenderer.removeListener('session:ended', sessionEndedHandler);
			// ipcRenderer.removeListener('ssh:connectionError', connectionErrorHandler);
		};
	}, [activeTab, connectingHost, setIsConnecting, connectionLogs]);

	// Connect to a host
	const connect = useCallback(
		async (hostId: string) => {
			try {
				console.log(`ConnectionContext: Connecting to host with ID: ${hostId}`);
				setIsConnecting(true);

				// Clear previous logs and start new connection log
				setConnectionLogs([]);
				const logs: string[] = [];

				// Get host details for the loading screen
				// const host = (await ipcRenderer.invoke(
				//   'hosts:getById',
				//   hostId
				// )) as Host;
				const host = {
					id: "1",
					label: "Test Host",
					hostname: "test.com",
					port: 22,
					username: "test",
				} as Host;

				if (!host) {
					console.error(`Host not found with ID: ${hostId}`);
					setIsConnecting(false);
					throw new Error("Host not found");
				}

				console.log(
					`ConnectionContext: Found host: ${host.label} (${host.hostname})`
				);

				const hostAddress = `${host.hostname}${
					host.port ? `:${host.port}` : ""
				}`;

				// Add initial connection log
				logs.push(
					`Starting a new connection to: "${host.hostname}" port "${
						host.port || 22
					}"`
				);
				logs.push(`Starting address resolution of "${host.hostname}"`);
				setConnectionLogs(logs);

				// Show connecting screen
				setConnectingHost({
					id: hostId,
					label: host.label,
					address: `${host.username}@${host.hostname}:${host.port || 22}`,
					status: "connecting",
					logs: logs,
				});

				// Add more connection logs
				logs.push(`Address resolution finished`);
				logs.push(`Connecting to "${host.hostname}" port "${host.port || 22}"`);
				setConnectionLogs([...logs]);
				setConnectingHost((prev) =>
					prev ? { ...prev, logs: [...logs] } : null
				);

				console.log(
					`ConnectionContext: Initiating SSH connection to ${host.label}`
				);

				// Initiate connection and await the result
				// const result = await ipcRenderer.invoke('ssh:connect', hostId);
				// console.log(
				//   `ConnectionContext: SSH connection initiated, result:`,
				//   result
				// );

				// Add connection established log
				logs.push(`Connection to "${host.hostname}" established`);
				logs.push(`Starting SSH session`);
				setConnectionLogs([...logs]);
				setConnectingHost((prev) =>
					prev ? { ...prev, logs: [...logs] } : null
				);

				// If the result includes a session, set it as the active tab immediately
				// if (result && result.sessionId) {
				//   setActiveTab(result.sessionId);
				// }
			} catch (error) {
				console.error("ConnectionContext: Connection failed:", error);

				// Get host details if available
				const hostLabel = connectingHost?.label || "Unknown host";
				const hostAddress = connectingHost?.address || "";

				// Format the error message
				let errorMessage = "Unknown error occurred";
				if (error instanceof Error) {
					errorMessage = error.message;
				} else if (typeof error === "string") {
					errorMessage = error;
				}

				// Add error to connection logs
				const updatedLogs = [...connectionLogs];
				updatedLogs.push(
					`Connection to "${
						hostAddress.split("@")[1]
					}" closed with error: ${errorMessage}`
				);
				setConnectionLogs(updatedLogs);

				// Update connecting host with error status and logs
				setConnectingHost((prev) =>
					prev
						? {
								...prev,
								status: "error",
								error: errorMessage,
								logs: updatedLogs,
						  }
						: null
				);

				// Show a toast notification with detailed error information

				setIsConnecting(false);
			}
		},
		[setConnectingHost, setIsConnecting, connectionLogs]
	);

	// Disconnect from a session
	const disconnect = useCallback(
		async (sessionId: string) => {
			console.log(`ConnectionContext: Closing session ${sessionId}`);

			// First, update the UI immediately to provide responsive feedback
			setActiveSessions((prev) => {
				const updatedSessions = prev.filter((s) => s.id !== sessionId);
				console.log(
					`ConnectionContext: Updated active sessions UI:`,
					updatedSessions.map((s) => s.id)
				);
				return updatedSessions;
			});

			// Handle active tab change if needed
			if (activeTab === sessionId) {
				const remainingSessions = activeSessions.filter(
					(s) => s.id !== sessionId
				);
				if (remainingSessions.length > 0) {
					// console.log(
					// 	`ConnectionContext: Switching to session ${remainingSessions[0].id}`
					// );
					// setActiveTab(remainingSessions[0].id);
				} else {
					console.log(
						`ConnectionContext: No remaining sessions, clearing active tab`
					);
					setActiveTab(null);
				}
			}

			// Then, tell the main process to disconnect and remove the session
			try {
				// await ipcRenderer.invoke("ssh:disconnect", sessionId);
				console.log(
					`ConnectionContext: Successfully sent disconnect request for session ${sessionId}`
				);

				// After disconnection, ensure the session is removed from storage
				// await ipcRenderer.invoke("sessions:remove", sessionId);
				console.log(
					`ConnectionContext: Successfully removed session ${sessionId} from storage`
				);
			} catch (error) {
				console.error(
					`ConnectionContext: Error in session closing flow for ${sessionId}:`,
					error
				);
			}
		},
		[activeTab, activeSessions]
	);

	// Clear connection error
	const clearConnectionError = useCallback(() => {
		setConnectingHost(null);
	}, []);

	// Provide the context value
	const contextValue = useMemo(
		() => ({
			activeSessions,
			activeTab,
			connectingHost,
			isConnecting,
			connectionLogs,
			connect,
			disconnect,
			setActiveTab: (sessionId: string | null) => {
				console.log(
					`ConnectionContext: Setting active tab to ${sessionId || "null"}`
				);

				// If sessionId is null, we're just hiding the terminal, not closing sessions
				if (sessionId === null) {
					console.log(
						"ConnectionContext: Setting active tab to null (hiding terminal)"
					);
					setActiveTab(null);
					return;
				}

				// Check if the session exists
				const sessionExists = activeSessions.some((s) => s.id === sessionId);
				if (sessionExists) {
					console.log(
						`ConnectionContext: Session ${sessionId} exists, setting as active tab`
					);
					setActiveTab(sessionId);
				} else {
					console.log(
						`ConnectionContext: Session ${sessionId} does not exist, keeping current tab`
					);
					// Don't change the active tab if the session doesn't exist
				}
			},
			clearConnectionError,
			isHostSelectorOpen,
			setIsHostSelectorOpen,
		}),
		[
			activeSessions,
			activeTab,
			connectingHost,
			isConnecting,
			connectionLogs,
			connect,
			disconnect,
			setActiveTab,
			clearConnectionError,
			isHostSelectorOpen,
			setIsHostSelectorOpen,
		]
	);

	return (
		<ConnectionContext.Provider value={contextValue}>
			{children}
		</ConnectionContext.Provider>
	);
};

export const useConnection = (): ConnectionContextType => {
	const context = useContext(ConnectionContext);
	if (context === undefined) {
		throw new Error("useConnection must be used within a ConnectionProvider");
	}
	return context;
};
