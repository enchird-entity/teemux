use crate::models::session::Session;
use crate::services::{secure_storage::SecureStorage, ssh_manager::SSHManager};
use tauri::State;

#[tauri::command]
pub async fn create_session(
  storage: State<'_, SecureStorage>,
  ssh_manager: State<'_, SSHManager>,
  host_id: String,
) -> Result<Session, String> {
  // Get host details
  let host = storage
    .get_host(&host_id)
    .await
    .map_err(|e| e.to_string())?
    .ok_or_else(|| "Host not found".to_string())?;

  // Get SSH key if needed
  let ssh_key = match host.auth_type {
    crate::models::host::AuthType::Key => storage
      .get_ssh_key(&host.private_key_path.as_ref().unwrap_or(&String::new()))
      .await
      .map_err(|e| e.to_string())?,
    _ => None,
  };

  // Create SSH connection and session
  let session = ssh_manager
    .connect(&host, ssh_key.as_ref())
    .await
    .map_err(|e| e.to_string())?;

  Ok(session)
}

#[tauri::command]
pub async fn end_session(
  ssh_manager: State<'_, SSHManager>,
  session_id: String,
) -> Result<Session, String> {
  // Disconnect the SSH session
  ssh_manager
    .disconnect(&session_id)
    .await
    .map_err(|e| e.to_string())?;

  // Get the updated session
  let session = ssh_manager
    .get_session(&session_id)
    .await
    .ok_or_else(|| "Session not found".to_string())?;

  Ok(session)
}

#[tauri::command]
pub async fn get_all_sessions() -> Result<Vec<Session>, String> {
  // For now, return empty list as we don't persist sessions
  Ok(Vec::new())
}
