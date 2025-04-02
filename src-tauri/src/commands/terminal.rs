use crate::services::terminal_manager::TerminalManager;
use std::sync::Arc;
use tauri::State;

#[tauri::command]
pub async fn send_data(
  terminal_manager: State<'_, Arc<TerminalManager>>,
  terminal_id: String,
  data: String,
) -> Result<(), String> {
  println!(
    "Terminal command: send_data called with terminal_id={}",
    terminal_id
  );

  match terminal_manager.send_data(&terminal_id, &data).await {
    Ok(_) => Ok(()),
    Err(e) => {
      println!("Error in send_data command: {}", e);
      Err(e.to_string())
    }
  }
}

#[tauri::command]
pub async fn resize_terminal(
  terminal_manager: State<'_, Arc<TerminalManager>>,
  terminal_id: String,
  rows: u16,
  cols: u16,
) -> Result<(), String> {
  println!(
    "Terminal command: resize_terminal called with terminal_id={}",
    terminal_id
  );

  match terminal_manager
    .resize_terminal(&terminal_id, rows, cols)
    .await
  {
    Ok(_) => Ok(()),
    Err(e) => {
      println!("Error in resize_terminal command: {}", e);
      Err(e.to_string())
    }
  }
}

#[tauri::command]
pub async fn close_terminal(
  terminal_manager: State<'_, Arc<TerminalManager>>,
  terminal_id: String,
) -> Result<(), String> {
  println!(
    "Terminal command: close_terminal called with terminal_id={}",
    terminal_id
  );

  let result = terminal_manager.destroy_terminal(&terminal_id).await;
  println!("close_terminal result: {}", result);
  Ok(())
}
