use super::snippet::Snippet;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum AuthType {
  #[serde(rename = "password")]
  Password,
  #[serde(rename = "key")]
  Key,
  #[serde(rename = "agent")]
  Agent,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Host {
  pub id: String,
  pub label: String,
  pub hostname: String,
  pub port: Option<u16>,
  pub username: Option<String>,
  pub password: Option<String>,
  pub private_key: Option<String>,
  pub private_key_path: Option<String>,
  pub passphrase: Option<String>,
  pub private_key_passphrase: Option<String>,
  pub tags: Option<Vec<String>>,
  pub created_at: String,
  pub updated_at: String,
  pub last_connected: Option<String>,
  pub jump_host: Option<String>,
  pub use_jump_host: Option<bool>,
  #[serde(default)]
  pub ssh_options: std::collections::HashMap<String, String>,
  pub keep_alive_interval: Option<u32>,
  pub connection_timeout: Option<u32>,
  pub description: Option<String>,
  pub color: Option<String>,
  pub group: Option<String>,
  pub favorite: Option<bool>,
  pub groups: Option<Vec<String>>,
  pub auth_type: AuthType,
  pub snippets: Vec<Snippet>,
  pub connection_count: u32,
  pub is_pro_feature: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HostGroup {
  pub id: String,
  pub name: String,
  pub color: Option<String>,
  pub hosts: Vec<String>,
  pub parent_group: Option<String>,
  pub created_at: i64,
  pub updated_at: i64,
}
