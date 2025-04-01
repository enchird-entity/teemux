import React, { useEffect, useState } from "react";
import { useSession } from "../hooks/use-session";
import { useHost } from "../hooks/use-host";
import { ConnectionLoading } from "../components/connection-loading";
import { ConnectionError } from "../components/connection-error";
import type { Session } from "../models/session";
import type { Host } from "../models/host";
import { Terminal } from "@/components/terminal/terminal";
interface TerminalPageProps {
	session: Session;
}

export const TerminalPage: React.FC<TerminalPageProps> = ({ session }) => {
	const { endSession } = useSession();
	const { getHost } = useHost();
	const [host, setHost] = useState<Host | null>(null);
	const [isConnecting, setIsConnecting] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [connectionLogs, setConnectionLogs] = useState<string[]>([]);

	useEffect(() => {
		const loadHost = async () => {
			try {
				const hostData = await getHost(session.host_id);
				if (hostData) {
					setHost(hostData);
					// Add initial connection log
					setConnectionLogs([
						`Starting a new connection to: "${hostData.hostname}" port "${
							hostData.port || 22
						}"`,
						`Starting address resolution of "${hostData.hostname}"`,
					]);
				} else {
					throw new Error("Host not found");
				}
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to load host");
				setIsConnecting(false);
			}
		};

		loadHost();
	}, [session.host_id, getHost]);

	const handleClose = async () => {
		try {
			await endSession(session.id);
		} catch (err) {
			console.error("Error ending session:", err);
		}
	};

	const handleRetryConnection = async () => {
		setError(null);
		setIsConnecting(true);
		// Reset connection logs
		if (host) {
			setConnectionLogs([
				`Retrying connection to: "${host.hostname}" port "${host.port || 22}"`,
				`Starting address resolution of "${host.hostname}"`,
			]);
		}
		// The Terminal component will handle the actual reconnection
	};

	if (error) {
		return (
			<ConnectionError
				hostId={session.host_id}
				hostLabel={host?.label || "Unknown Host"}
				hostAddress={
					host ? `${host.username}@${host.hostname}:${host.port || 22}` : ""
				}
				error={error}
				logs={connectionLogs}
				onRetry={handleRetryConnection}
				onCancel={handleClose}
			/>
		);
	}

	if (isConnecting && host) {
		return (
			<ConnectionLoading
				hostId={session.host_id}
				hostLabel={host.label}
				hostAddress={`${host.username}@${host.hostname}:${host.port || 22}`}
				logs={connectionLogs}
				onCancel={handleClose}
			/>
		);
	}

	return (
		<Terminal
			terminalId={session.terminal_id}
			sessionId={session.id}
			hostId={session.host_id}
			onClose={handleClose}
		/>
	);
};
