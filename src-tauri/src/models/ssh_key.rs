use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum SSHKeyType {
    #[serde(rename = "rsa")]
    RSA,
    #[serde(rename = "dsa")]
    DSA,
    #[serde(rename = "ecdsa")]
    ECDSA,
    #[serde(rename = "ed25519")]
    Ed25519,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SSHKey {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub key_type: SSHKeyType,
    pub bits: Option<u32>,
    pub private_key_path: String,
    pub public_key_path: String,
    pub passphrase: Option<String>,
    pub host_ids: Vec<String>,
    pub created_at: i64,
    pub updated_at: i64,
} 