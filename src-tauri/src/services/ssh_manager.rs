use crate::error::AppError;
use crate::models::host::AuthType;
use crate::models::host::Host;
use crate::models::session::{Session, SessionStatus, SessionType};
use crate::models::ssh_key::SSHKey;
use crate::services::snippet_manager::SnippetManager;
use crate::services::terminal_manager::{TerminalManager, TerminalStream};
use chrono::{DateTime, Utc};
use log::info;
use ssh2::Channel;
use ssh2::Session as SSH2Session; // Changed to ssh2 to match common Rust SSH lib
use std::collections::HashMap;
use std::io::{Read, Write};
// use std::net::TcpStream as StdTcpStream;
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::net::TcpStream;
use uuid::Uuid;

pub struct SSHManager {
  connections: Arc<Mutex<HashMap<String, SSH2Session>>>,
  sessions: Arc<Mutex<HashMap<String, Session>>>,
  terminal_manager: Arc<TerminalManager>,
  snippet_manager: Arc<SnippetManager>,
}

// Wrapper struct for ssh2::Channel to implement TerminalStream
pub struct SSHChannelWrapper(Channel);

// Manual Debug implementation since Channel doesn't implement Debug
impl std::fmt::Debug for SSHChannelWrapper {
  fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
    f.debug_tuple("SSHChannelWrapper")
      .field(&"Channel")
      .finish()
  }
}

impl SSHChannelWrapper {
  pub fn new(channel: Channel) -> Self {
    SSHChannelWrapper(channel)
  }
}

// Implement Read for the wrapper
impl Read for SSHChannelWrapper {
  fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
    self.0.read(buf)
  }
}

// Implement Write for the wrapper
impl Write for SSHChannelWrapper {
  fn write(&mut self, buf: &[u8]) -> std::io::Result<usize> {
    self.0.write(buf)
  }

  fn flush(&mut self) -> std::io::Result<()> {
    self.0.flush()
  }
}
// Implement Debug for SSHChannelWrapper

// Implement TerminalStream for the wrapper
impl TerminalStream for SSHChannelWrapper {
  fn set_window_size(&mut self, rows: u16, cols: u16) -> std::io::Result<()> {
    // ssh2::Channel uses width and height in pixels, so we might need to adjust
    // these values depending on your terminal's pixel-to-character ratio
    self
      .0
      .request_pty_size(
        cols as u32,
        rows as u32,
        Some((cols as u32) * 8),
        Some((rows as u32) * 8),
      )
      .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))
  }
}

impl SSHManager {
  pub fn new(terminal_manager: Arc<TerminalManager>, snippet_manager: Arc<SnippetManager>) -> Self {
    SSHManager {
      connections: Arc::new(Mutex::new(HashMap::new())),
      sessions: Arc::new(Mutex::new(HashMap::new())),
      terminal_manager,
      snippet_manager,
    }
  }

  pub async fn connect(&self, host: &Host, ssh_key: Option<&SSHKey>) -> Result<Session, AppError> {
    info!(
      "SSH Manager: Connecting to {}:{} as {}",
      host.hostname,
      host.port.unwrap_or(22),
      host.username.as_ref().unwrap_or(&"".to_string())
    );

    // Validation
    if host.hostname.is_empty() {
      return Err(AppError::ValidationError("Missing hostname".to_string()));
    }
    let username = host
      .username
      .as_ref()
      .ok_or_else(|| AppError::ValidationError("Missing username".to_string()))?;
    if username.is_empty() {
      return Err(AppError::ValidationError("Missing username".to_string()));
    }

    // TCP Connection
    let addr = format!("{}:{}", host.hostname, host.port.unwrap_or(22));
    let tcp = TcpStream::connect(&addr)
      .await
      .map_err(|e| AppError::ConnectionError(format!("TCP connection failed: {}", e)))?;

    let std_tcp = tcp
      .into_std()
      .map_err(|e| AppError::ConnectionError(format!("Failed to convert stream: {}", e)))?;

    // SSH Session
    let mut session = SSH2Session::new()
      .map_err(|e| AppError::SshError(format!("Failed to create SSH session: {:?}", e)))?;
    session.set_tcp_stream(std_tcp);
    session
      .handshake()
      .map_err(|e| AppError::SshError(format!("SSH handshake failed: {}", e)))?;

    // Authentication
    match host.auth_type {
      AuthType::Password => {
        let password = host
          .password
          .as_ref()
          .ok_or_else(|| AppError::ValidationError("Missing password".to_string()))?;
        session
          .userauth_password(username, password)
          .map_err(|e| AppError::SshError(format!("Password auth failed: {}", e)))?;
      }
      AuthType::Key => {
        let key_path_str = ssh_key
          .map(|k| &k.private_key_path)
          .or(host.private_key_path.as_ref())
          .ok_or_else(|| AppError::ValidationError("Missing private key".to_string()))?;
        let key_path = std::path::Path::new(key_path_str); // Convert String to Path
        let passphrase = ssh_key
          .and_then(|k| k.passphrase.as_deref())
          .or(host.private_key_passphrase.as_deref());
        session
          .userauth_pubkey_file(username, None, key_path, passphrase)
          .map_err(|e| AppError::SshError(format!("Key auth failed: {}", e)))?;
      }
      AuthType::Agent => {
        session
          .userauth_agent(username)
          .map_err(|e| AppError::SshError(format!("Agent auth failed: {}", e)))?;
      }
    }
    info!("SSH Authentication successful");

    let session_id = format!(
      "session-{}-{}",
      SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs(),
      Uuid::new_v4()
    );
    let terminal_id = self.terminal_manager.create_terminal(&session_id).await;

    let new_session = Session {
      id: session_id.clone(),
      host_id: host.id.clone(),
      terminal_id: (terminal_id),
      status: SessionStatus::Connected,
      created_at: DateTime::<Utc>::from(SystemTime::now()),
      last_activity: Some(DateTime::<Utc>::from(SystemTime::now()).to_string()),
      start_time: DateTime::<Utc>::from(SystemTime::now()).to_string(),
      end_time: None,
      session_type: SessionType::SSH,
      error: None,
      sftp_enabled: Some(false),
      port_forwardings: Some(Vec::new()),
    };

    self
      .sessions
      .lock()
      .unwrap()
      .insert(session_id.clone(), new_session.clone());
    self
      .connections
      .lock()
      .unwrap()
      .insert(session_id.clone(), session);

    self.create_shell(&session_id).await?;
    info!("SSH Session established");

    Ok(new_session)
  }

  async fn create_shell(&self, session_id: &str) -> Result<(), AppError> {
    let mut connections = self.connections.lock().unwrap();
    let session = connections
      .get_mut(session_id)
      .ok_or_else(|| AppError::SessionError("Session not found".to_string()))?;

    let mut channel = session
      .channel_session()
      .map_err(|e| AppError::SshError(format!("Channel creation failed: {}", e)))?;

    channel
      .request_pty("xterm", None, None)
      .map_err(|e| AppError::SshError(format!("PTY request failed: {}", e)))?;
    channel
      .shell()
      .map_err(|e| AppError::SshError(format!("Shell request failed: {}", e)))?;

    if let Some(terminal_id) = self
      .sessions
      .lock()
      .unwrap()
      .get(session_id)
      .and_then(|s| Some(s.terminal_id.as_ref()))
    {
      // Wrap the channel in our SSHChannelWrapper
      let channel_wrapper = SSHChannelWrapper::new(channel);
      let boxed_channel = Box::new(channel_wrapper) as Box<dyn TerminalStream>;

      self
        .terminal_manager
        .attach_stream(terminal_id, boxed_channel)
        .await
        .map_err(|e| AppError::SessionError(format!("Terminal attach failed: {}", e)))?;
    }

    Ok(())
  }

  pub fn disconnect(&self, session_id: &str) -> Result<(), AppError> {
    info!("SSH Manager: Disconnecting session {}", session_id);

    if let Some(session) = self.connections.lock().unwrap().remove(session_id) {
      session
        .disconnect(None, "Disconnecting", None)
        .map_err(|e| AppError::SshError(format!("Disconnect failed: {}", e)))?;
    }

    let mut sessions = self.sessions.lock().unwrap();
    if let Some(session) = sessions.get_mut(session_id) {
      session.status = SessionStatus::Disconnected;
      session.end_time =
        Some(chrono::DateTime::<chrono::Utc>::from(SystemTime::now()).to_rfc3339()); // Convert to String
      let destroy_future = self.terminal_manager.destroy_terminal(&session.terminal_id);
      let result = tokio::runtime::Handle::current().block_on(destroy_future);
      if !result {
        return Err(AppError::SessionError(
          "Terminal destroy failed".to_string(),
        ));
      }
    }

    Ok(())
  }

  pub async fn setup_sftp(&self, session_id: &str) -> Result<bool, AppError> {
    let mut connections = self.connections.lock().unwrap();
    let session = connections
      .get_mut(session_id)
      .ok_or_else(|| AppError::SessionError("Session not found".to_string()))?;

    session
      .sftp()
      .map_err(|e| AppError::SshError(format!("SFTP setup failed: {}", e)))?;

    if let Some(session) = self.sessions.lock().unwrap().get_mut(session_id) {
      session.sftp_enabled = Some(true);
    }

    Ok(true)
  }

  // Rest of the methods remain largely unchanged
  // pub fn setup_port_forwarding(
  //   &self,
  //   session_id: &str,
  //   forwarding_type: &str,
  //   local_port: u16,
  //   remote_host: Option<String>,
  //   remote_port: Option<u16>,
  // ) -> Result<String, AppError> {
  //   let mut connections = self.connections.lock().unwrap();
  //   let session = connections
  //     .get_mut(session_id)
  //     .ok_or_else(|| AppError::SessionError("Session not found".to_string()))?;

  //   match forwarding_type {
  //     "local" => {
  //       let rhost = remote_host
  //         .ok_or_else(|| AppError::ValidationError("Missing remote host".to_string()))?;
  //       let rport = remote_port
  //         .ok_or_else(|| AppError::ValidationError("Missing remote port".to_string()))?;
  //       session.tcpip_forward(&rhost, rport)?;
  //     }
  //     "remote" => {
  //       let rhost = remote_host
  //         .ok_or_else(|| AppError::ValidationError("Missing remote host".to_string()))?;
  //       let rport = remote_port
  //         .ok_or_else(|| AppError::ValidationError("Missing remote port".to_string()))?;
  //       session.request_port_forward(ssh2::ForwardType::Remote, local_port, &rhost, rport)?;
  //     }
  //     "dynamic" => {
  //       session.tcpip_forward("127.0.0.1", local_port)?;
  //     }
  //     _ => {
  //       return Err(AppError::ValidationError(
  //         "Invalid forwarding type".to_string(),
  //       ))
  //     }
  //   }

  //   Ok(Uuid::new_v4().to_string())
  // }

  pub fn get_session(&self, session_id: &str) -> Option<Session> {
    self.sessions.lock().unwrap().get(session_id).cloned()
  }

  pub fn get_all_sessions(&self) -> Vec<Session> {
    self.sessions.lock().unwrap().values().cloned().collect()
  }

  pub fn remove_session(&self, session_id: &str) -> bool {
    self.sessions.lock().unwrap().remove(session_id).is_some()
  }
}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::services::snippet_manager::SnippetManager;
  use crate::services::terminal_manager::{MockWindowHandler, TerminalManager};

  #[tokio::test]
  async fn test_ssh_manager() {
    let snippet_manager = Arc::new(SnippetManager::new());
    let window_handler = Arc::new(MockWindowHandler {});
    let terminal_manager = Arc::new(TerminalManager::new(window_handler));
    let ssh_manager = SSHManager::new(terminal_manager, snippet_manager);

    let ssh_options = HashMap::new();

    let host = Host {
      private_key: None,
      passphrase: None,
      tags: Some(Vec::new()),
      created_at: chrono::Utc::now().to_rfc3339(),
      updated_at: chrono::Utc::now().to_rfc3339(),
      last_connected: None,
      ssh_options: ssh_options,
      keep_alive_interval: None,
      description: None,
      color: None,
      group: None,
      favorite: Some(false),
      groups: Vec::new(),
      snippets: Vec::new(),
      connection_count: 0,
      is_pro_feature: false,
      id: "test-host".to_string(),
      label: "Test Host".to_string(),
      hostname: "localhost".to_string(),
      port: Some(22),
      username: Some("test".to_string()),
      auth_type: AuthType::Password,
      password: Some("password".to_string()),
      private_key_path: None,
      private_key_passphrase: None,
      use_jump_host: Some(false),
      jump_host: None,
      connection_timeout: Some(30000),
    };

    let result = ssh_manager.connect(&host, None).await;
    assert!(result.is_err());
  }
}
