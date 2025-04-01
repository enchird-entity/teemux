import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useState, useCallback, useEffect } from "react";

interface TerminalData {
	terminalId: string;
	data: string;
}

interface TerminalSize {
	cols: number;
	rows: number;
}

export const useTerminal = () => {
	const [isConnected, setIsConnected] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Set up event listeners for terminal data
	useEffect(() => {
		const unlisten = Promise.all([
			listen("terminal:data", (event: any) => {
				const data = event.payload as TerminalData;
				console.log(data);

				sendData(data.terminalId, data.data);

				// if (data.terminalId === terminalId) {
				// 	// Handle incoming terminal data
				// 	// This will be used by the terminal component
				// 	console.log("Terminal data received:", data);
				// }
			}),
			listen("terminal:error", (event: any) => {
				const error = event.payload as { terminalId: string; error: string };
				console.log(error);

				// if (error.terminalId === terminalId) {
				// 	setError(error.error);
				// 	setIsConnected(false);
				// }
			}),
		]);

		return () => {
			unlisten.then((unlisteners) => {
				unlisteners.forEach((unlisten) => unlisten());
			});
		};
	}, []);

	const sendData = useCallback(async (terminalId: string, data: string) => {
		try {
			await invoke("terminal_send_data", {
				terminalId,
				data,
			});
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to send data");
		}
	}, []);

	const resizeTerminal = useCallback(
		async (terminalId: string, size: TerminalSize) => {
			try {
				await invoke("terminal_resize", {
					terminalId,
					...size,
				});
			} catch (err) {
				setError(
					err instanceof Error ? err.message : "Failed to resize terminal"
				);
			}
		},
		[]
	);

	const closeTerminal = useCallback(async (terminalId: string) => {
		try {
			await invoke("terminal_close", { terminalId });
			setIsConnected(false);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to close terminal");
		}
	}, []);

	return {
		isConnected,
		error,
		sendData,
		resizeTerminal,
		closeTerminal,
	};
};
