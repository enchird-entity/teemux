use std::{
  collections::HashMap,
  io::{Read, Write},
  sync::Arc,
  time::{Duration, Instant},
};
use tokio::sync::Mutex;
use uuid::Uuid;

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
    let mut terminals = self.terminals.lock().await;
    if let Some(terminal) = terminals.get_mut(terminal_id) {
      if let Some(stream) = terminal.stream.as_mut() {
        stream.write_all(data.as_bytes())?;
        stream.flush()?;
        Ok(())
      } else {
        Err(std::io::Error::new(
          std::io::ErrorKind::NotFound,
          "Terminal stream not initialized",
        ))
      }
    } else {
      Err(std::io::Error::new(
        std::io::ErrorKind::NotFound,
        "Terminal not found",
      ))
    }
  }

  pub async fn create_terminal(&self, session_id: &str) -> String {
    let terminal_id = format!("terminal-{}-{}", Uuid::new_v4(), session_id);
    let terminal = Terminal {
      id: terminal_id.clone(),
      created_at: Instant::now(),
      stream: None,
    };

    self
      .terminals
      .lock()
      .await
      .insert(terminal_id.clone(), terminal);
    terminal_id
  }

  pub async fn attach_stream(
    &self,
    terminal_id: &str,
    stream: Box<dyn TerminalStream>,
  ) -> std::io::Result<()> {
    let mut terminals = self.terminals.lock().await;

    if let Some(terminal) = terminals.get_mut(terminal_id) {
      terminal.stream = Some(stream);

      let window_handler = Arc::clone(&self.window_handler);
      let terminal_id = terminal_id.to_string();

      // Move the stream into the spawned task
      if let Some(stream) = terminal.stream.take() {
        let mut buffer = [0; 1024];
        let stream = stream;

        tokio::spawn(async move {
          let mut stream = stream;
          while let Ok(n) = stream.read(&mut buffer) {
            if n == 0 {
              break;
            }
            let data = String::from_utf8_lossy(&buffer[..n]);
            window_handler.send_to_all_windows(
              "terminal:data",
              serde_json::json!({
                  "terminalId": terminal_id,
                  "data": data,
              }),
            );
          }
        });

        Ok(())
      } else {
        Err(std::io::Error::new(
          std::io::ErrorKind::NotFound,
          "Terminal not found",
        ))
      }
    } else {
      Err(std::io::Error::new(
        std::io::ErrorKind::NotFound,
        "Terminal not found",
      ))
    }
  }

  pub async fn destroy_terminal(&self, terminal_id: &str) -> bool {
    let mut terminals = self.terminals.lock().await;

    if let Some(terminal) = terminals.remove(terminal_id) {
      if terminal.created_at.elapsed() < Duration::from_secs(1) {
        terminals.insert(terminal_id.to_string(), terminal);

        let manager = self.clone();
        let terminal_id = terminal_id.to_string();

        let _ = tokio::task::spawn_blocking(move || {
          let rt = tokio::runtime::Runtime::new().unwrap();
          rt.block_on(async {
            tokio::time::sleep(Duration::from_secs(1)).await;
            manager.destroy_terminal(&terminal_id).await;
          });
        });
        false
      } else {
        true
      }
    } else {
      false
    }
  }
}
