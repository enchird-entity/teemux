import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useState, useCallback, useEffect } from "react";
import type { Session } from "../models/session";

export const useSession = () => {
	const [sessions, setSessions] = useState<Session[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Set up event listeners for session state changes
	useEffect(() => {
		const unlisten = Promise.all([
			listen("session:started", (event: any) => {
				const session = event.payload as Session;
				setSessions((prev) => [...prev, session]);
			}),
			listen("session:ended", (event: any) => {
				const sessionId = event.payload as string;
				setSessions((prev) => prev.filter((s) => s.id !== sessionId));
			}),
		]);

		return () => {
			unlisten.then((unlisteners) => {
				unlisteners.forEach((unlisten) => unlisten());
			});
		};
	}, []);

	const createSession = useCallback(async (hostId: string) => {
		setIsLoading(true);
		setError(null);
		try {
			const session = await invoke<Session>("create_session", { hostId });
			return session;
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to create session");
			return null;
		} finally {
			setIsLoading(false);
		}
	}, []);

	const endSession = useCallback(async (sessionId: string) => {
		setIsLoading(true);
		setError(null);
		try {
			await invoke("end_session", { sessionId });
			return true;
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to end session");
			return false;
		} finally {
			setIsLoading(false);
		}
	}, []);

	const getAllSessions = useCallback(async () => {
		setIsLoading(true);
		setError(null);
		try {
			const allSessions = await invoke<Session[]>("get_all_sessions");
			setSessions(allSessions);
			return allSessions;
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to fetch sessions");
			return [];
		} finally {
			setIsLoading(false);
		}
	}, []);

	return {
		sessions,
		isLoading,
		error,
		createSession,
		endSession,
		getAllSessions,
	};
};
