export interface Session {
	id: string;
	host_id: string;
	terminal_id: string;
	start_time: string;
	end_time?: string;
	status: "connecting" | "connected" | "disconnected" | "error";
	error?: string;
	last_activity?: string;
	type: "ssh" | "serial" | "telnet";
	sftp_enabled?: boolean;
	port_forwardings?: any[];
}
