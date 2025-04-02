// this hides the console for Windows release builds
#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]
use once_cell::sync::OnceCell;
use serde::Serialize;
use std::sync::Mutex;
use tauri::{
  // state is used in Linux
  self,
  AppHandle,
  Emitter,
  Manager,
};
use tauri_plugin_log::{Target, TargetKind};
use tauri_plugin_store;
use tauri_plugin_window_state;
static GLOBAL_APP_HANDLE: OnceCell<AppHandle> = OnceCell::new();

mod commands;
mod error;
mod models;
mod services;
mod tray_icon;
mod utils;

use commands::host::{delete_host, get_all_hosts, get_host, save_host, update_host};
use commands::session::{create_session, end_session, get_all_sessions};
use commands::terminal::{close_terminal, resize_terminal, send_data};
use services::secure_storage::SecureStorage;
use services::snippet_manager::SnippetManager;
use services::ssh_manager::SSHManager;
use services::terminal_manager::{MockWindowHandler, TerminalManager};
use std::sync::Arc;
use tray_icon::{create_tray_icon, tray_update_lang, TrayState};
use utils::long_running_thread;

#[derive(Clone, Serialize)]
struct SingleInstancePayload {
  args: Vec<String>,
  cwd: String,
}

#[derive(Debug, Default, Serialize)]
// struct Example<'a> {
//   #[serde(rename = "Attribute 1")]
//   attribute_1: &'a str,
// }
#[cfg(target_os = "linux")]
pub struct DbusState(Mutex<Option<dbus::blocking::SyncConnection>>);

#[tauri::command]
fn process_file(filepath: String) -> String {
  println!("Processing file: {}", filepath);
  "Hello from Rust!".into()
}

#[cfg(target_os = "linux")]
fn webkit_hidpi_workaround() {
  // See: https://github.com/spacedriveapp/spacedrive/issues/1512#issuecomment-1758550164
  std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
}

fn main_prelude() {
  #[cfg(target_os = "linux")]
  webkit_hidpi_workaround();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  main_prelude();
  // main window should be invisible to allow either the setup delay or the plugin to show the window
  tauri::Builder::default()
    .plugin(
      tauri_plugin_log::Builder::new()
        .targets([
          Target::new(TargetKind::Stdout),
          Target::new(TargetKind::LogDir { file_name: None }),
          Target::new(TargetKind::Webview),
        ])
        .build(),
    )
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_store::Builder::new().build())
    .plugin(tauri_plugin_updater::Builder::new().build())
    .plugin(tauri_plugin_process::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_os::init())
    .plugin(tauri_plugin_notification::init())
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_fs::init())
    // custom commands
    .invoke_handler(tauri::generate_handler![
      tray_update_lang,
      process_file,
      delete_host,
      get_all_hosts,
      get_host,
      save_host,
      update_host,
      create_session,
      end_session,
      get_all_sessions,
      close_terminal,
      resize_terminal,
      send_data
    ])
    // allow only one instance and propagate args and cwd to existing instance
    .plugin(tauri_plugin_single_instance::init(|app, args, cwd| {
      app
        .emit("newInstance", SingleInstancePayload { args, cwd })
        .unwrap();
    }))
    // persistent storage with filesystem
    .plugin(tauri_plugin_store::Builder::default().build())
    // save window position and size between sessions
    // if you remove this, make sure to uncomment the mainWebview?.show line in TauriProvider.tsx
    .plugin(tauri_plugin_window_state::Builder::default().build())
    // custom setup code
    .setup(|app| {
      // Get the app handle first
      let app_handle = app.handle().clone();

      // Set the global app handle early
      GLOBAL_APP_HANDLE
        .set(app_handle.clone())
        .expect("Failed to set global app handle");

      // Create a window handler with the app handle
      let window_handler = Arc::new(MockWindowHandler::with_app_handle(app_handle.clone()));

      // Create a single TerminalManager instance to be shared
      let terminal_manager = Arc::new(TerminalManager::new(window_handler));
      let snippet_manager = Arc::new(SnippetManager::new());
      // Manage both the TerminalManager and the SSHManager
      app.manage(terminal_manager.clone());
      app.manage(SSHManager::new(terminal_manager, snippet_manager));

      let _ = create_tray_icon(app.handle());
      app.manage(Mutex::new(TrayState::NotPlaying));

      let app_handle_clone = app_handle.clone();
      tauri::async_runtime::spawn(async move { long_running_thread(&app_handle_clone).await });

      #[cfg(target_os = "linux")]
      app.manage(DbusState(Mutex::new(
        dbus::blocking::SyncConnection::new_session().ok(),
      )));

      // Initialize secure storage
      let storage = tauri::async_runtime::block_on(SecureStorage::new())
        .expect("Failed to initialize secure storage");
      app.manage(storage);

      // TODO: AUTOSTART
      // FOLLOW: https://v2.tauri.app/plugin/autostart/

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

// useful crates
// https://crates.io/crates/directories for getting common directories

// TODO: optimize permissions
// TODO: decorations false and use custom title bar
