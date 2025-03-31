import { Host } from "@/models/host";
import { invoke } from "@tauri-apps/api/core";

export function useTerminal() {
	const createTerminal = async (sessionId: string) => {
		return await invoke<string>("create_terminal", { sessionId });
	};

	const saveHost = async (host: Host) => {
		await invoke("save_host", { host });
	};

	return {
		createTerminal,
		saveHost,
	};
}
