use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserSettings {
  pub theme: String,
  pub font_size: u16,
  pub font_family: String,
  pub terminal_opacity: f32,
  pub show_line_numbers: bool,
  pub default_shell: String,
  pub default_working_directory: Option<String>,
  pub confirm_on_exit: bool,
  pub scroll_back_buffer: u32,
  pub auto_update: bool,
  pub telemetry_enabled: bool,
  pub pro_user: bool,
}
