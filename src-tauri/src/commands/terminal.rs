use crate::services::terminal_manager::TerminalManager;
use tauri::State;

#[tauri::command]
pub async fn send_data(
  terminal_manager: State<'_, TerminalManager>,
  terminal_id: String,
  data: String,
) -> Result<(), String> {
  let _ = terminal_manager.send_data(&terminal_id, &data).await;
  Ok(())
}

#[tauri::command]
pub async fn resize_terminal(
  terminal_manager: State<'_, TerminalManager>,
  terminal_id: String,
  rows: u16,
  cols: u16,
) -> Result<(), String> {
  let _ = terminal_manager
    .resize_terminal(&terminal_id, rows, cols)
    .await;
  Ok(())
}

#[tauri::command]
pub async fn close_terminal(
  terminal_manager: State<'_, TerminalManager>,
  terminal_id: String,
) -> Result<(), String> {
  terminal_manager.destroy_terminal(&terminal_id).await;
  Ok(())
}
