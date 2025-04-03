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
    "Terminal command: send_data called with terminal_id={}, data length={}",
    terminal_id,
    data.len()
  );

  // Log data content for debugging (truncated for large inputs)
  if data.len() <= 20 {
    println!("Terminal command: data content: {:?}", data);
  } else {
    println!(
      "Terminal command: data content (truncated): {:?}...",
      &data[0..20]
    );
  }

  let result = terminal_manager.send_data(&terminal_id, &data).await;

  match &result {
    Ok(_) => println!(
      "Terminal command: send_data completed successfully for {}",
      terminal_id
    ),
    Err(e) => println!(
      "Terminal command: send_data failed for {}: {}",
      terminal_id, e
    ),
  }

  result.map_err(|e| {
    let err_message = e.to_string();
    println!("Error in send_data command: {}", err_message);
    err_message
  })
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
