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
import { useSession } from "../hooks/use-session";
import { useHost } from "../hooks/use-host";
import { useNavigate } from "react-router-dom";
import { debug, error, info } from "@tauri-apps/plugin-log";

interface ConnectionContextType {
	// Connection state
	activeSessions: Session[];
	sessionsByHostId: Record<string, Session>;
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
	endSession: (hostId: string) => Promise<boolean>;
	setConnectingHost: (host: any) => void;
}

const ConnectionContext = createContext<ConnectionContextType | undefined>(
	undefined
);

export const ConnectionProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const { sessions, createSession, endSession, getAllSessions } = useSession();
	const { getHost } = useHost();
	const navigate = useNavigate();

	const [activeSessions, setActiveSessions] = useState<Session[]>([]);
	const [sessionsByHostId, setSessionsByHostId] = useState<
		Record<string, Session>
	>({});
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
	useEffect(() => {
		getAllSessions().then((sessions) => {
			setActiveSessions(sessions);
			const sessionsMap = sessions.reduce((acc, session) => {
				acc[session.host_id] = session;
				return acc;
			}, {} as Record<string, Session>);
			setSessionsByHostId(sessionsMap);
			if (sessions.length > 0) {
				setActiveTab(sessions[0]?.id || null);
			}
		});
	}, [getAllSessions]);

	// Update active sessions when sessions state changes
	useEffect(() => {
		setActiveSessions(sessions);
		const sessionsMap = sessions.reduce((acc, session) => {
			acc[session.host_id] = session;
			return acc;
		}, {} as Record<string, Session>);
		setSessionsByHostId(sessionsMap);
	}, [sessions]);

	const [connCount, setConnCount] = useState(0);

	// Connect to a host
	const connect = useCallback(
		async (hostId: string) => {
			setConnCount(connCount + 1);
			try {
				info(`ConnectionContext: Connecting to host with ID: ${hostId}`);
				setIsConnecting(true);

				// Clear previous logs and start new connection log
				setConnectionLogs([]);
				const logs: string[] = [];

				// Get host details for the loading screen
				const host = await getHost(hostId);

				if (!host) {
					error(`Host not found with ID: ${hostId}`);
					setIsConnecting(false);
					throw new Error("Host not found");
				}

				console.log(
					`ConnectionContext: Found host: ${host.label} (${host.hostname})`
				);

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

				setActiveTab(hostId);

				// Navigate directly to terminal page
				navigate(`/terminal/${hostId}`);

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

				// Create a new session
				const session = await createSession(hostId);

				debug(JSON.stringify(session, null, 4));

				if (!session) {
					throw new Error("Failed to create session");
				}

				// Add connection established log
				logs.push(`Connection to "${host.hostname}" established`);
				logs.push(`Starting SSH session`);
				setConnectionLogs([...logs]);
				setConnectingHost((prev) =>
					prev ? { ...prev, logs: [...logs] } : null
				);

				// Update active sessions and sessions map
				setActiveSessions((prev) => [...prev, session]);
				setSessionsByHostId((prev) => ({
					...prev,
					[hostId]: session,
				}));

				// Set as active tab
				setActiveTab(session.id);

				// Navigate to terminal page
				navigate(`/terminal/${hostId}`);
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
			} finally {
				setIsConnecting(false);
				setConnectingHost(null);
				console.log(`ConnectionContext: Connection count: ${connCount}`);
			}
		},
		[getHost, createSession, connectionLogs, connectingHost]
	);

	// Disconnect from a session
	const disconnect = useCallback(
		async (sessionId: string) => {
			info(`ConnectionContext: Closing session ${sessionId}`);

			try {
				// Find the session to get its host_id
				const session = activeSessions.find((s) => s.id === sessionId);
				if (!session) {
					error(`ConnectionContext: Session ${sessionId} not found`);
					return;
				}

				// Remove session from active sessions and sessions map first
				setActiveSessions((prev) => prev.filter((s) => s.id !== sessionId));
				setSessionsByHostId((prev) => {
					const newSessions = { ...prev };
					delete newSessions[session.host_id];
					return newSessions;
				});

				// Handle active tab change if needed
				if (activeTab === sessionId) {
					const remainingSessions = activeSessions.filter(
						(s) => s.id !== sessionId
					);
					if (remainingSessions.length > 0 && remainingSessions[0]?.id) {
						setActiveTab(remainingSessions[0].id);
					} else {
						setActiveTab(null);
					}
				}

				try {
					const removed = await endSession(session.id);
					debug(`Session was removed: ${removed}`);
				} catch (e) {
					error(
						`ConnectionContext: Error closing session ${sessionId}: ${JSON.stringify(
							e,
							null,
							2
						)}`
					);
					// If endSession fails, we should restore the session state
					setActiveSessions((prev) => [...prev, session]);
					setSessionsByHostId((prev) => ({
						...prev,
						[session.host_id]: session,
					}));
					throw e;
				}
				info(`ConnectionContext: Successfully closed session ${sessionId}`);
			} catch (error) {
				console.error(
					`ConnectionContext: Error closing session ${sessionId}:`,
					error
				);
				throw error; // Re-throw to allow components to handle the error
			}
		},
		[activeTab, activeSessions, endSession]
	);

	// Clear connection error
	const clearConnectionError = useCallback(() => {
		setConnectingHost(null);
	}, []);

	// Provide the context value
	const contextValue = useMemo(
		() => ({
			activeSessions,
			sessionsByHostId,
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
				setActiveTab(sessionId);
			},
			isHostSelectorOpen,
			setIsHostSelectorOpen,
			clearConnectionError,
			endSession,
			setConnectingHost,
		}),
		[
			activeSessions,
			sessionsByHostId,
			activeTab,
			connectingHost,
			isConnecting,
			connectionLogs,
			connect,
			disconnect,
			isHostSelectorOpen,
			setIsHostSelectorOpen,
			clearConnectionError,
			endSession,
			setConnectingHost,
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
