use once_cell::sync::OnceCell;
use std::{
  collections::HashMap,
  io::{Read, Write},
  sync::Arc,
  time::{Duration, Instant},
};
use tauri::{App, AppHandle, Emitter, Manager};
use tokio::sync::Mutex;
use uuid::Uuid;

static GLOBAL_APP_HANDLE: OnceCell<AppHandle> = OnceCell::new();
#[derive(Debug)]
pub struct Terminal {
  id: String,
  created_at: Instant,
  stream: Option<Box<dyn TerminalStream>>,
}

pub trait TerminalStream: Read + Write + Send + Sync + std::fmt::Debug + 'static {
  fn set_window_size(&mut self, rows: u16, cols: u16) -> std::io::Result<()>;
}

#[derive(Clone)]
pub struct TerminalManager {
  terminals: Arc<Mutex<HashMap<String, Terminal>>>,
  window_handler: Arc<dyn WindowHandler>,
}

pub trait WindowHandler: Send + Sync + 'static {
  fn send_to_all_windows(&self, event: &str, payload: serde_json::Value);
}

pub struct MockWindowHandler {
  app_handle: Option<AppHandle>,
}

impl MockWindowHandler {
  pub fn new() -> Self {
    Self { app_handle: None }
  }

  pub fn with_app_handle(app_handle: AppHandle) -> Self {
    Self {
      app_handle: Some(app_handle),
    }
  }
}

impl WindowHandler for MockWindowHandler {
  fn send_to_all_windows(&self, event: &str, payload: serde_json::Value) {
    println!("send_to_all_windows: {} {}", event, payload);

    // First try to use the app_handle provided at creation time
    if let Some(handle) = &self.app_handle {
      println!(
        "\n\n====> Emitting event using provided app handle: {} {}",
        event, payload
      );
      match handle.emit(event, payload.clone()) {
        Ok(res) => {
          println!("Event emitted successfully {:?}", res);
          return;
        }
        Err(e) => println!("Failed to emit event with provided handle: {}", e),
      }
    }

    // Fallback to global app handle if available
    if let Some(app_handle) = GLOBAL_APP_HANDLE.get() {
      println!(
        "\n\n====> Emitting event using global app handle: {} {}",
        event, payload
      );
      match app_handle.emit(event, payload) {
        Ok(_) => println!("Event emitted successfully"),
        Err(e) => println!("Failed to emit event: {}", e),
      }
    } else {
      println!("App handle not available (neither provided nor global), cannot emit event");
    }
  }
}

impl TerminalManager {
  pub fn new(window_handler: Arc<dyn WindowHandler>) -> Self {
    Self {
      terminals: Arc::new(Mutex::new(HashMap::new())),
      window_handler,
    }
  }

  pub async fn resize_terminal(
    &self,
    terminal_id: &str,
    rows: u16,
    cols: u16,
  ) -> std::io::Result<()> {
    let mut terminals = self.terminals.lock().await;
    if let Some(terminal) = terminals.get_mut(terminal_id) {
      if let Some(stream) = terminal.stream.as_mut() {
        stream.set_window_size(rows, cols)?;
      }
      Ok(())
    } else {
      Err(std::io::Error::new(
        std::io::ErrorKind::NotFound,
        "Terminal not found",
      ))
    }
  }

  pub async fn send_data(&self, terminal_id: &str, data: &str) -> std::io::Result<()> {
    println!(
      "\n=====> Received Data from FrontEnd: terminal_id=> {},\n data=> {}",
      terminal_id, data
    );

    // First acquire the lock to check if the terminal and stream exist
    let terminals = self.terminals.lock().await;
    println!("Terminals: {:?}", terminals);

    // Get the terminal if it exists
    if let Some(terminal) = terminals.get(terminal_id) {
      println!("Found terminal with id: {}", terminal_id);

      // Check if stream exists
      if let Some(_) = &terminal.stream {
        println!("Found stream for terminal: {}", terminal_id);
        println!("Writing {} bytes to stream", data.len());

        // Create a cloned data buffer outside the lock to avoid holding it during I/O
        let data_to_write = data.to_string();
        let terminal_id_clone = terminal_id.to_string();
        let window_handler = Arc::clone(&self.window_handler);
        let terminals_clone = Arc::clone(&self.terminals);

        // Release the original lock
        drop(terminals);

        // Now reacquire the lock and attempt the write operation
        let mut terminals = terminals_clone.lock().await;

        // Check again that the terminal and stream still exist
        if let Some(terminal) = terminals.get_mut(&terminal_id_clone) {
          if let Some(stream) = &mut terminal.stream {
            // Complete the write operation inside this lock
            let write_result = stream
              .write_all(data_to_write.as_bytes())
              .and_then(|_| stream.flush());

            // Release the lock before any event emissions to avoid deadlock
            drop(terminals);

            match write_result {
              Ok(_) => {
                println!("Successfully wrote and flushed data to stream");
                window_handler.send_to_all_windows(
                  "terminal:send:data",
                  serde_json::json!({
                    "terminalId": terminal_id_clone,
                    "data": data_to_write
                  }),
                );
                return Ok(());
              }
              Err(e) => {
                println!("Error writing to stream: {}", e);
                window_handler.send_to_all_windows(
                  "terminal:error",
                  serde_json::json!({
                    "terminalId": terminal_id_clone,
                    "error": format!("Error writing to stream: {}", e)
                  }),
                );
                return Err(e);
              }
            }
          }
        }

        // If we get here, the terminal or stream was removed between lock acquisitions
        let err = std::io::Error::new(
          std::io::ErrorKind::Other,
          "Terminal state changed unexpectedly during operation",
        );
        println!("Error: {}", err);

        window_handler.send_to_all_windows(
          "terminal:error",
          serde_json::json!({
            "terminalId": terminal_id_clone,
            "error": "Terminal state changed unexpectedly during operation"
          }),
        );

        return Err(err);
      } else {
        // Stream doesn't exist
        let err = std::io::Error::new(
          std::io::ErrorKind::NotFound,
          format!(
            "Terminal stream not initialized for terminal ID: {}",
            terminal_id
          ),
        );
        println!("Error: {}", err);

        // Clone what we need before releasing the lock
        let window_handler = Arc::clone(&self.window_handler);
        drop(terminals);

        window_handler.send_to_all_windows(
          "terminal:error",
          serde_json::json!({
            "terminalId": terminal_id,
            "error": "Terminal stream not initialized"
          }),
        );

        return Err(err);
      }
    } else {
      // Terminal doesn't exist
      println!(
        "WARNING: Terminal ID {} not found in terminals map",
        terminal_id
      );
      let err = std::io::Error::new(
        std::io::ErrorKind::NotFound,
        format!("Terminal not found with ID: {}", terminal_id),
      );
      println!("Error: {}", err);

      // Clone what we need before releasing the lock
      let window_handler = Arc::clone(&self.window_handler);
      drop(terminals);

      window_handler.send_to_all_windows(
        "terminal:error",
        serde_json::json!({
          "terminalId": terminal_id,
          "error": format!("Terminal not found with ID: {}", terminal_id)
        }),
      );

      return Err(err);
    }
  }

  pub async fn create_terminal(&self, session_id: &str) -> String {
    let terminal_id = format!("terminal-{}-{}", Uuid::new_v4(), session_id);
    let terminal = Terminal {
      id: terminal_id.clone(),
      created_at: Instant::now(),
      stream: None,
    };

    // Insert the terminal into our registry
    self
      .terminals
      .lock()
      .await
      .insert(terminal_id.clone(), terminal);

    // Notify frontend that a new terminal was created
    self.window_handler.send_to_all_windows(
      "terminal:created",
      serde_json::json!({
        "terminalId": terminal_id,
        "sessionId": session_id
      }),
    );

    println!("Created new terminal with ID: {}", terminal_id);
    terminal_id
  }

  pub async fn attach_stream(
    &self,
    terminal_id: &str,
    stream: Box<dyn TerminalStream>,
  ) -> std::io::Result<()> {
    println!("Attempting to attach stream to terminal: {}", terminal_id);

    // Create a stable reference to the terminal ID for use in the spawned task
    let terminal_id_for_task = terminal_id.to_string();

    // Acquire lock to validate and modify the terminal
    let mut terminals = self.terminals.lock().await;
    println!(
      "Available terminals before attach: {:?}",
      terminals.keys().collect::<Vec<_>>()
    );

    if let Some(terminal) = terminals.get_mut(terminal_id) {
      println!("Found terminal for attach: {}", terminal_id);
      // Store the stream in the terminal
      terminal.stream = Some(stream);

      // Clone necessary references for the read task
      let window_handler = Arc::clone(&self.window_handler);
      let terminals_clone = Arc::clone(&self.terminals);

      // Release the lock before spawning the task
      drop(terminals);

      println!(
        "Starting stream read task for terminal: {}",
        terminal_id_for_task
      );

      // Spawn a separate task to read from the stream
      tokio::spawn(async move {
        let mut buffer = [0; 1024];
        loop {
          // Acquire lock for reading from the stream with proper error handling
          let read_result = {
            let mut terminals = terminals_clone.lock().await;
            if let Some(terminal) = terminals.get_mut(&terminal_id_for_task) {
              if let Some(stream) = terminal.stream.as_mut() {
                match stream.read(&mut buffer) {
                  Ok(n) => {
                    if n == 0 {
                      println!("Stream closed for terminal: {}", terminal_id_for_task);
                      break; // Connection closed
                    }
                    Some(String::from_utf8_lossy(&buffer[..n]).to_string())
                  }
                  Err(e) => {
                    println!(
                      "Error reading from stream for terminal {}: {}",
                      terminal_id_for_task, e
                    );
                    // Send error to frontend
                    window_handler.send_to_all_windows(
                      "terminal:error",
                      serde_json::json!({
                        "terminalId": terminal_id_for_task,
                        "error": format!("Error reading from stream: {}", e)
                      }),
                    );
                    break; // Error reading
                  }
                }
              } else {
                println!("Stream is gone for terminal: {}", terminal_id_for_task);
                break; // Stream is gone
              }
            } else {
              println!("Terminal is gone: {}", terminal_id_for_task);
              break; // Terminal is gone
            }
          };

          // Process data outside the lock to avoid blocking
          if let Some(data) = read_result {
            println!(
              "Read {} bytes from terminal: {}",
              data.len(),
              terminal_id_for_task
            );
            window_handler.send_to_all_windows(
              "terminal:send:data",
              serde_json::json!({
                "terminalId": terminal_id_for_task,
                "data": data,
              }),
            );
          }

          // Small delay to avoid tight loop and high CPU usage
          tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;
        }
        println!(
          "Stream read task ended for terminal: {}",
          terminal_id_for_task
        );

        // Notify frontend that read stream has ended
        window_handler.send_to_all_windows(
          "terminal:stream:closed",
          serde_json::json!({
            "terminalId": terminal_id_for_task,
          }),
        );
      });

      println!("Successfully attached stream to terminal: {}", terminal_id);
      Ok(())
    } else {
      let err = std::io::Error::new(
        std::io::ErrorKind::NotFound,
        format!("Terminal not found with ID: {}", terminal_id),
      );
      println!("Error in attach_stream: {}", err);
      Err(err)
    }
  }

  pub async fn destroy_terminal(&self, terminal_id: &str) -> bool {
    println!("Attempting to destroy terminal: {}", terminal_id);

    // First attempt to remove the terminal
    let mut terminals = self.terminals.lock().await;

    // Check if terminal exists
    if !terminals.contains_key(terminal_id) {
      println!("Terminal not found for destruction: {}", terminal_id);
      return false;
    }

    // Handle terminal based on its age
    if let Some(terminal) = terminals.get(terminal_id) {
      // Check if the terminal was very recently created (less than 1 second ago)
      if terminal.created_at.elapsed() < Duration::from_secs(1) {
        println!(
          "Terminal {} was created less than 1 second ago, delaying destruction",
          terminal_id
        );

        // Clone what we need before releasing the lock
        let terminal_id_clone = terminal_id.to_string();
        let manager = self.clone();

        // Drop the lock before spawning task to avoid deadlock
        drop(terminals);

        // Schedule delayed destruction
        let _ = tokio::task::spawn_blocking(move || {
          let rt = tokio::runtime::Runtime::new().unwrap();
          rt.block_on(async {
            tokio::time::sleep(Duration::from_secs(1)).await;
            println!(
              "Executing delayed destruction for terminal: {}",
              terminal_id_clone
            );
            manager.destroy_terminal(&terminal_id_clone).await;
          });
        });

        return false;
      }
    }

    // Terminal exists and is old enough to destroy
    if let Some(terminal) = terminals.remove(terminal_id) {
      println!(
        "Successfully removed terminal: {} from registry",
        terminal_id
      );

      // Notify frontend that terminal was destroyed
      let terminal_id_clone = terminal_id.to_string();
      let window_handler = Arc::clone(&self.window_handler);

      // Drop the lock before sending notifications
      drop(terminals);

      window_handler.send_to_all_windows(
        "terminal:destroyed",
        serde_json::json!({
          "terminalId": terminal_id_clone,
        }),
      );

      true
    } else {
      println!("Failed to remove terminal: {}", terminal_id);
      false
    }
  }
}
