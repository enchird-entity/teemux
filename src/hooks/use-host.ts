import { invoke } from "@tauri-apps/api/core";
import { useState, useCallback } from "react";
import type { Host } from "../models/host";

export const useHost = () => {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const getAllHosts = useCallback(async () => {
		setIsLoading(true);
		setError(null);
		try {
			const hosts = await invoke<Host[]>("get_all_hosts");
			return hosts;
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to fetch hosts");
			return [];
		} finally {
			setIsLoading(false);
		}
	}, []);

	const getHost = useCallback(async (hostId: string) => {
		setIsLoading(true);
		setError(null);
		try {
			const host = await invoke<Host>("get_host", { hostId });
			return host;
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to fetch host");
			return null;
		} finally {
			setIsLoading(false);
		}
	}, []);

	const saveHost = useCallback(async (host: Partial<Host>) => {
		setIsLoading(true);
		setError(null);
		try {
			const savedHost = await invoke<Host>("save_host", { host });
			return savedHost;
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to save host");
			return null;
		} finally {
			setIsLoading(false);
		}
	}, []);

	const updateHost = useCallback(
		async (hostId: string, host: Partial<Host>) => {
			setIsLoading(true);
			setError(null);
			try {
				const updatedHost = await invoke<Host>("update_host", { hostId, host });
				return updatedHost;
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to update host");
				return null;
			} finally {
				setIsLoading(false);
			}
		},
		[]
	);

	const deleteHost = useCallback(async (hostId: string) => {
		setIsLoading(true);
		setError(null);
		try {
			await invoke("delete_host", { hostId });
			return true;
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to delete host");
			return false;
		} finally {
			setIsLoading(false);
		}
	}, []);

	return {
		isLoading,
		error,
		getAllHosts,
		getHost,
		saveHost,
		updateHost,
		deleteHost,
	};
};
