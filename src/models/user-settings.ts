export interface UserSettings {
	id: string;
	theme: "light" | "dark" | "system";
	font_size: number;
	font_family: string;
	terminal_options: {
		cursor_blink: boolean;
		cursor_style: "block" | "underline" | "bar";
		scrollback: number;
		bell_sound: boolean;
		bell_style: "none" | "sound" | "visual" | "both";
	};
	auto_save_interval: number; // In seconds
	cloud_sync_enabled: boolean;
	pro_user: boolean;
	pro_expiry_date?: Date;
}
