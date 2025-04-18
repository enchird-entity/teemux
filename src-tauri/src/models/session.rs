use serde::{Deserialize, Serialize};
use super::port_forwarding::PortForwarding;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum SessionStatus {
    #[serde(rename = "connecting")]
    Connecting,
    #[serde(rename = "connected")]
    Connected,
    #[serde(rename = "disconnected")]
    Disconnected,
    #[serde(rename = "error")]
    Error,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum SessionType {
    #[serde(rename = "ssh")]
    SSH,
    #[serde(rename = "serial")]
    Serial,
    #[serde(rename = "telnet")]
    Telnet,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Session {
    pub id: String,
    pub host_id: String,
    pub terminal_id: String,
    pub start_time: String,
    pub end_time: Option<String>,
    pub status: SessionStatus,
    pub error: Option<String>,
    pub last_activity: Option<String>,
    #[serde(rename = "type")]
    pub session_type: SessionType,
    pub sftp_enabled: Option<bool>,
    pub port_forwardings: Option<Vec<PortForwarding>>,
} 