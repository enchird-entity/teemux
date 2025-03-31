use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum PortForwardingType {
    #[serde(rename = "local")]
    Local,
    #[serde(rename = "remote")]
    Remote,
    #[serde(rename = "dynamic")]
    Dynamic,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PortForwarding {
    pub id: String,
    pub host_id: String,
    #[serde(rename = "type")]
    pub forwarding_type: PortForwardingType,
    pub local_port: u16,
    pub remote_host: Option<String>,
    pub remote_port: Option<u16>,
    pub description: Option<String>,
    pub enabled: bool,
    pub created_at: i64,
    pub updated_at: i64,
    pub is_pro_feature: bool,
} 