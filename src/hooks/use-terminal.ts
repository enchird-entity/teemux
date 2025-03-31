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

export const useTerminal = (terminalId: string) => {
	const [isConnected, setIsConnected] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Set up event listeners for terminal data
	useEffect(() => {
		const unlisten = Promise.all([
			listen("terminal:data", (event: any) => {
				const data = event.payload as TerminalData;
				if (data.terminalId === terminalId) {
					// Handle incoming terminal data
					// This will be used by the terminal component
				}
			}),
			listen("terminal:error", (event: any) => {
				const error = event.payload as { terminalId: string; error: string };
				if (error.terminalId === terminalId) {
					setError(error.error);
					setIsConnected(false);
				}
			}),
		]);

		return () => {
			unlisten.then((unlisteners) => {
				unlisteners.forEach((unlisten) => unlisten());
			});
		};
	}, [terminalId]);

	const sendData = useCallback(
		async (data: string) => {
			try {
				await invoke("terminal_send_data", {
					terminalId,
					data,
				});
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to send data");
			}
		},
		[terminalId]
	);

	const resizeTerminal = useCallback(
		async (size: TerminalSize) => {
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
		[terminalId]
	);

	const closeTerminal = useCallback(async () => {
		try {
			await invoke("terminal_close", { terminalId });
			setIsConnected(false);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to close terminal");
		}
	}, [terminalId]);

	return {
		isConnected,
		error,
		sendData,
		resizeTerminal,
		closeTerminal,
	};
};
