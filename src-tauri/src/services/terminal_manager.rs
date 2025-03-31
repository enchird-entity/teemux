use std::{
    collections::HashMap,
    io::{Read, Write},
    sync::Arc,
    time::{Duration, Instant},
};
use tokio::sync::Mutex;
use uuid::Uuid;

pub struct Terminal {
    id: String,
    created_at: Instant,
    stream: Option<Box<dyn TerminalStream>>,
}

pub trait TerminalStream: Read + Write + Send + Sync {
    fn set_window_size(&mut self, rows: u16, cols: u16) -> std::io::Result<()>;
}

pub struct TerminalManager {
    terminals: Arc<Mutex<HashMap<String, Terminal>>>,
    window_handler: Arc<dyn WindowHandler>,
}

pub trait WindowHandler: Send + Sync {
    fn send_to_all_windows(&self, event: &str, payload: serde_json::Value);
}

impl TerminalManager {
    pub fn new(window_handler: Arc<dyn WindowHandler>) -> Self {
        Self {
            terminals: Arc::new(Mutex::new(HashMap::new())),
            window_handler,
        }
    }

    pub async fn create_terminal(&self, session_id: &str) -> String {
        let terminal_id = format!("terminal-{}-{}", Uuid::new_v4(), session_id);
        
        let terminal = Terminal {
            id: terminal_id.clone(),
            created_at: Instant::now(),
            stream: None,
        };
        
        self.terminals.lock().await.insert(terminal_id.clone(), terminal);
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
            
            // Setup data forwarding
            let terminal_id = terminal_id.to_string();
            let window_handler = Arc::clone(&self.window_handler);
            
            tokio::spawn(async move {
                let mut buffer = [0; 1024];
                
                while let Ok(n) = terminal.stream.as_mut().unwrap().read(&mut buffer) {
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
    }

    pub async fn destroy_terminal(&self, terminal_id: &str) {
        let mut terminals = self.terminals.lock().await;
        
        if let Some(terminal) = terminals.remove(terminal_id) {
            if terminal.created_at.elapsed() < Duration::from_secs(1) {
                // Re-add terminal and try again later
                terminals.insert(terminal_id.to_string(), terminal);
                
                let self_clone = Arc::new(self.clone());
                let terminal_id = terminal_id.to_string();
                
                tokio::spawn(async move {
                    tokio::time::sleep(Duration::from_secs(1)).await;
                    self_clone.destroy_terminal(&terminal_id).await;
                });
                
                return;
            }
        }
    }
}
