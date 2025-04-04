export interface Snippet {
	id: string;
	name: string;
	command: string;
	content?: string;
	description?: string;
	tags: string[];
	run_on_connect: boolean;
	host_ids: string[]; // Hosts this snippet is associated with
	created_at: string;
	updated_at: string;
	run_count?: number;
	last_run?: string;
	category?: string;
	is_template?: boolean;
	variables?: SnippetVariable[];
}

export interface SnippetVariable {
	name: string;
	description?: string;
	default_value?: string;
	required?: boolean;
	type?: "text" | "number" | "boolean" | "select";
	options?: string[]; // For select type
}
