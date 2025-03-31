import { useState, useEffect, useCallback } from "react";

export interface SessionHistoryEntry {
	id: string;
	hostId: string;
	hostLabel: string;
	hostname: string;
	startTime: string;
	endTime?: string;
	duration?: number;
	type: "ssh" | "serial" | "telnet";
	status: "success" | "error";
	error?: string;
}

export function useSessionHistory() {
	const [sessionHistory, setSessionHistory] = useState<SessionHistoryEntry[]>(
		[]
	);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Load session history
	const loadSessionHistory = useCallback(async (limit?: number) => {
		setIsLoading(true);
		setError(null);

		try {
			// Try to get session history from IPC
			// const history = await ipcRenderer.invoke('sessionHistory:getAll', limit);
			// setSessionHistory(Array.isArray(history) ? history : []);
		} catch (err) {
			console.error("Failed to load session history:", err);
			setError("Failed to load session history");
			// Fallback to empty array if IPC fails
			setSessionHistory([]);
		} finally {
			setIsLoading(false);
		}
	}, []);

	// Search session history
	const searchSessionHistory = useCallback(
		async (query: string) => {
			if (!query.trim()) {
				return loadSessionHistory();
			}

			setIsLoading(true);
			setError(null);

			try {
				// const results = await ipcRenderer.invoke(
				//   'sessionHistory:search',
				//   query
				// );
				// setSessionHistory(Array.isArray(results) ? results : []);
			} catch (err) {
				console.error("Failed to search session history:", err);
				setError("Failed to search session history");

				// Fallback to client-side filtering if IPC fails
				const lowerQuery = query.toLowerCase();
				setSessionHistory((prev) =>
					prev.filter(
						(entry) =>
							entry.hostLabel.toLowerCase().includes(lowerQuery) ||
							entry.hostname.toLowerCase().includes(lowerQuery)
					)
				);
			} finally {
				setIsLoading(false);
			}
		},
		[loadSessionHistory]
	);

	// Clear session history
	const clearSessionHistory = useCallback(async () => {
		setIsLoading(true);
		setError(null);

		try {
			// await ipcRenderer.invoke('sessionHistory:clear');
			setSessionHistory([]);
		} catch (err) {
			console.error("Failed to clear session history:", err);
			setError("Failed to clear session history");
		} finally {
			setIsLoading(false);
		}
	}, []);

	// Connect to a host from history
	const connectToHost = useCallback(async (hostId: string) => {
		try {
			// return await ipcRenderer.invoke('ssh:connect', hostId);
		} catch (err) {
			console.error("Failed to connect to host:", err);
			throw err;
		}
	}, []);

	// Load session history on mount
	useEffect(() => {
		loadSessionHistory();
	}, [loadSessionHistory]);

	return {
		sessionHistory,
		isLoading,
		error,
		loadSessionHistory,
		searchSessionHistory,
		clearSessionHistory,
		connectToHost,
	};
}
