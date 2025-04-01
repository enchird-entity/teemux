export interface PortForwarding {
	id: string;
	host_id: string;
	type: "local" | "remote" | "dynamic";
	local_port: number;
	remote_host?: string;
	remote_port?: number;
	description?: string;
	enabled: boolean;
	created_at: Date;
	updated_at: Date;
	is_pro_feature: boolean;
}
