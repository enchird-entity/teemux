use std::fmt;

#[derive(Debug)]
pub enum AppError {
  ValidationError(String),
  ConnectionError(String),
  AuthenticationError(String),
  SessionError(String),
  SFTPError(String),
  PortForwardingError(String),
  TerminalError(String),
  DatabaseError(String),
  IOError(String),
  SerializationError(String),
  NotFoundError(String),
  PermissionError(String),
  UnknownError(String),
  SshError(String), // Add SSH specific error
}

impl fmt::Display for AppError {
  fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
    match self {
      AppError::ValidationError(msg) => write!(f, "Validation error: {}", msg),
      AppError::ConnectionError(msg) => write!(f, "Connection error: {}", msg),
      AppError::AuthenticationError(msg) => write!(f, "Authentication error: {}", msg),
      AppError::SessionError(msg) => write!(f, "Session error: {}", msg),
      AppError::SFTPError(msg) => write!(f, "SFTP error: {}", msg),
      AppError::PortForwardingError(msg) => write!(f, "Port forwarding error: {}", msg),
      AppError::TerminalError(msg) => write!(f, "Terminal error: {}", msg),
      AppError::DatabaseError(msg) => write!(f, "Database error: {}", msg),
      AppError::IOError(msg) => write!(f, "IO error: {}", msg),
      AppError::SerializationError(msg) => write!(f, "Serialization error: {}", msg),
      AppError::NotFoundError(msg) => write!(f, "Not found: {}", msg),
      AppError::PermissionError(msg) => write!(f, "Permission denied: {}", msg),
      AppError::UnknownError(msg) => write!(f, "Unknown error: {}", msg),
      AppError::SshError(msg) => write!(f, "SSH error: {}", msg), // Add SSH specific error
    }
  }
}

impl std::error::Error for AppError {}

impl From<std::io::Error> for AppError {
  fn from(error: std::io::Error) -> Self {
    AppError::IOError(error.to_string())
  }
}

impl From<serde_json::Error> for AppError {
  fn from(error: serde_json::Error) -> Self {
    AppError::SerializationError(error.to_string())
  }
}

impl From<ssh2::Error> for AppError {
  fn from(error: ssh2::Error) -> Self {
    AppError::SshError(error.to_string())
  }
}
