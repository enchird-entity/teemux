use crate::models::session::{Session, SessionStatus, SessionType};
use crate::services::{secure_storage::SecureStorage, terminal_manager::TerminalManager};
use chrono::Utc;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub async fn create_session(
  storage: State<'_, SecureStorage>,
  terminal_manager: State<'_, TerminalManager>,
  host_id: String,
) -> Result<Session, String> {
  // Get host details
  let host = storage
    .get_host(&host_id)
    .await
    .map_err(|e| e.to_string())?
    .ok_or_else(|| "Host not found".to_string())?;

  // Create a new terminal
  let terminal_id = terminal_manager.create_terminal(&host_id).await;

  let now = Utc::now();

  // Create session
  let session = Session {
    id: Uuid::new_v4().to_string(),
    host_id: host.id.clone(),
    terminal_id,
    created_at: now,
    start_time: now.to_rfc3339(),
    end_time: None,
    status: SessionStatus::Connected,
    error: None,
    last_activity: None,
    session_type: SessionType::SSH,
    sftp_enabled: None,
    port_forwardings: None,
  };

  Ok(session)
}

#[tauri::command]
pub async fn end_session(
  terminal_manager: State<'_, TerminalManager>,
  session_id: String,
) -> Result<Session, String> {
  // Close the terminal
  terminal_manager.destroy_terminal(&session_id).await;

  let now = Utc::now();

  // Return updated session with end time
  Ok(Session {
    id: session_id,
    host_id: String::new(), // This would need to be retrieved from storage in a real implementation
    terminal_id: String::new(),
    created_at: now, // This would need to be retrieved from storage in a real implementation
    start_time: now.to_rfc3339(), // This would need to be retrieved from storage in a real implementation
    end_time: Some(now.to_rfc3339()),
    status: SessionStatus::Disconnected,
    error: None,
    last_activity: None,
    session_type: SessionType::SSH,
    sftp_enabled: None,
    port_forwardings: None,
  })
}

#[tauri::command]
pub async fn get_all_sessions() -> Result<Vec<Session>, String> {
  // For now, return empty list as we don't persist sessions
  Ok(Vec::new())
}
