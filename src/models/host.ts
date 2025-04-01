import { Snippet } from "./snippet";

export interface Host {
	id: string;
	label: string;
	hostname: string;
	port?: number;
	username?: string;
	password?: string;
	private_key?: string;
	private_key_path?: string;
	passphrase?: string;
	private_key_passphrase?: string;
	tags?: string[];
	created_at: string;
	updated_at: string;
	last_connected?: string;
	jump_host?: string;
	use_jump_host?: boolean;
	ssh_options?: Record<string, string>;
	keep_alive_interval?: number;
	connection_timeout?: number;
	description?: string;
	color?: string;
	group?: string;
	favorite?: boolean;
	groups: string[];
	auth_type: "password" | "key" | "agent";
	snippets: Snippet[];
	connection_count: number;
	is_pro_feature: boolean;
}

export interface HostGroup {
	id: string;
	name: string;
	color?: string;
	hosts: string[]; // Array of host IDs
	parent_group?: string; // For nested groups
	created_at: Date;
	updated_at: Date;
}
