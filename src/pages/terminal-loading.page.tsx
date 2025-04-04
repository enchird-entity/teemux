import React, { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useConnection } from "../contexts/connection.context";
import { ConnectionLoading } from "../components/connection-loading";
import { ConnectionError } from "../components/connection-error";

export const TerminalLoadingPage: React.FC = () => {
	const navigate = useNavigate();
	const { hostId } = useParams<{ hostId: string }>();
	const { connectingHost, isConnecting, connectionLogs, clearConnectionError } =
		useConnection();

	useEffect(() => {
		if (!hostId) {
			navigate("/");
			return;
		}

		// If we're not connecting and there's no connecting host, navigate back
		if (!isConnecting && !connectingHost) {
			navigate("/");
		}
	}, [hostId, isConnecting, connectingHost, navigate]);

	const handleRetryConnection = async () => {
		if (hostId) {
			clearConnectionError();
			// The connection context will handle the retry
		}
	};

	const handleCancelConnection = () => {
		clearConnectionError();
		navigate("/");
	};

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

	return null;
};
