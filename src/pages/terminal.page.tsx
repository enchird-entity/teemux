import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useConnection } from "../contexts/connection.context";
import { Terminal } from "../components/terminal/terminal";
import { ConnectionLoading } from "../components/connection-loading";
import { ConnectionError } from "../components/connection-error";

export const TerminalPage: React.FC = () => {
	const { hostId } = useParams<{ hostId: string }>();
	const navigate = useNavigate();
	const {
		sessionsByHostId,
		endSession,
		connectingHost,
		isConnecting,
		connectionLogs,
		clearConnectionError,
		connect,
	} = useConnection();

	const session = hostId ? sessionsByHostId[hostId] : null;

	useEffect(() => {
		if (!session && !isConnecting) {
			// navigate("/vaults/hosts");
		}
	}, [session, isConnecting, navigate]);

	const handleClose = async () => {
		if (hostId) {
			const success = await endSession(hostId);
			if (success) {
				navigate("/vaults/hosts");
			}
		}
	};

	const handleRetryConnection = () => {
		if (hostId) {
			clearConnectionError();
			// The connection context will handle the retry
			connect(hostId);
		}
	};

	const handleCancelConnection = () => {
		clearConnectionError();
		navigate("/vaults/hosts");
	};

	// Show error state if there's a connection error
	if (connectingHost?.status === "error") {
		return (
			<ConnectionError
				hostId={hostId || ""}
				hostLabel={connectingHost.label}
				hostAddress={connectingHost.address}
				error={connectingHost.error || "Unknown error occurred"}
				logs={connectionLogs}
				onRetry={handleRetryConnection}
				onCancel={handleCancelConnection}
			/>
		);
	}

	// Show loading state while connecting
	if (isConnecting && connectingHost) {
		return (
			<ConnectionLoading
				hostId={hostId || ""}
				hostLabel={connectingHost.label}
				hostAddress={connectingHost.address}
				logs={connectionLogs}
				onCancel={handleCancelConnection}
			/>
		);
	}

	// Show terminal when connected
	if (session) {
		return (
			<Terminal
				terminalId={session.terminal_id}
				sessionId={session.id}
				hostId={hostId || ""}
				onClose={handleClose}
			/>
		);
	}

	return null;
};
