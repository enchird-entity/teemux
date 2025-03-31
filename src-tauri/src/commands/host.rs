use crate::models::host::Host;
use crate::services::secure_storage::SecureStorage;
use tauri::State;

#[tauri::command]
pub async fn get_all_hosts(storage: State<'_, SecureStorage>) -> Result<Vec<Host>, String> {
  storage.get_all_hosts().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_host(
  storage: State<'_, SecureStorage>,
  host_id: String,
) -> Result<Option<Host>, String> {
  storage.get_host(&host_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_host(storage: State<'_, SecureStorage>, host: Host) -> Result<Host, String> {
  storage
    .save_host(host.clone())
    .await
    .map(|_| host)
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_host(
  storage: State<'_, SecureStorage>,
  host_id: String,
  host: Host,
) -> Result<Host, String> {
  let mut updated_host = host;
  updated_host.id = host_id;

  storage
    .save_host(updated_host.clone())
    .await
    .map(|_| updated_host)
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_host(storage: State<'_, SecureStorage>, host_id: String) -> Result<(), String> {
  storage
    .delete_host(&host_id)
    .await
    .map_err(|e| e.to_string())
}
