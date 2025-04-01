use aes_gcm::{
  aead::{Aead, KeyInit},
  Aes256Gcm, Nonce,
};
use anyhow::{Context, Result};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use chrono::{DateTime, Utc};
use keyring::Entry;
use rand::RngCore;
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{collections::HashMap, fs, path::PathBuf};
use tokio::sync::Mutex;
// Import models
use crate::models::{
  host::{Host, HostGroup},
  snippet::Snippet,
  ssh_key::SSHKey,
  user_settings::UserSettings,
};

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Store {
  hosts: HashMap<String, Host>,
  snippets: HashMap<String, Snippet>,
  settings: Option<UserSettings>,
  host_groups: HashMap<String, HostGroup>,
  ssh_keys: HashMap<String, SSHKey>,
}

impl Store {
  fn load() -> Result<Self> {
    let store_path = Self::get_store_path()?;
    if store_path.exists() {
      let data = fs::read_to_string(&store_path)?;
      Ok(serde_json::from_str(&data)?)
    } else {
      Ok(Self {
        hosts: HashMap::new(),
        snippets: HashMap::new(),
        settings: None,
        host_groups: HashMap::new(),
        ssh_keys: HashMap::new(),
      })
    }
  }

  fn save(&self) -> Result<()> {
    let store_path = Self::get_store_path()?;
    let data = serde_json::to_string_pretty(self)?;
    fs::write(&store_path, data)?;
    Ok(())
  }

  fn get_store_path() -> Result<PathBuf> {
    let mut path = dirs::config_dir()
      .context("Failed to get config directory")?
      .join("teemux");
    fs::create_dir_all(&path)?;
    path.push("store.json");
    Ok(path)
  }
}

pub struct SecureStorage {
  store: Mutex<Store>,
  encryption_key: Vec<u8>,
  service_name: String,
}

impl SecureStorage {
  pub async fn new() -> Result<Self> {
    let encryption_key = Self::initialize_encryption_key().await?;
    let store = Store::load()?;

    Ok(Self {
      store: Mutex::new(store),
      encryption_key,
      service_name: "Teemux".to_string(),
    })
  }

  async fn initialize_encryption_key() -> Result<Vec<u8>> {
    let keyring = Entry::new("Teemux", "encryption-key")?;

    match keyring.get_password() {
      Ok(key) => Ok(hex::decode(key)?),
      Err(_) => {
        let new_key = rand::random::<[u8; 32]>();
        let hex_key = hex::encode(&new_key);
        keyring.set_password(&hex_key)?;
        Ok(new_key.to_vec())
      }
    }
  }

  fn encrypt(&self, data: &str) -> Result<String> {
    let cipher = Aes256Gcm::new_from_slice(&self.encryption_key)
      .map_err(|e| anyhow::anyhow!("Failed to create cipher: {}", e))?;
    let nonce = Nonce::from_slice(&self.encryption_key[..12]);
    let ciphertext = cipher
      .encrypt(nonce, data.as_bytes())
      .map_err(|e| anyhow::anyhow!("Failed to encrypt data: {}", e))?;
    Ok(BASE64.encode(ciphertext))
  }

  fn decrypt(&self, data: &str) -> Result<String> {
    let cipher = Aes256Gcm::new_from_slice(&self.encryption_key)
      .map_err(|e| anyhow::anyhow!("Failed to create cipher: {}", e))?;
    let nonce = Nonce::from_slice(&self.encryption_key[..12]);
    let ciphertext = BASE64.decode(data)?;
    let decrypted = cipher
      .decrypt(nonce, ciphertext.as_slice())
      .map_err(|e| anyhow::anyhow!("Failed to decrypt data: {}", e))?;
    Ok(String::from_utf8(decrypted)?)
  }

  pub async fn save_host(&self, host: Host) -> Result<()> {
    let mut store = self.store.lock().await;

    // Handle sensitive data
    if let Some(password) = &host.password {
      let entry = Entry::new(&self.service_name, &format!("host-{}-password", host.id))?;
      entry.set_password(&self.encrypt(password)?)?;
    }

    if let Some(passphrase) = &host.private_key_passphrase {
      let entry = Entry::new(
        &self.service_name,
        &format!("host-{}-key-passphrase", host.id),
      )?;
      entry.set_password(&self.encrypt(passphrase)?)?;
    }

    // Store non-sensitive data
    let host_data = host.clone();
    store.hosts.insert(host.id.clone(), host_data);
    store.save()?;

    Ok(())
  }

  pub async fn get_host(&self, host_id: &str) -> Result<Option<Host>> {
    let store = self.store.lock().await;

    if let Some(host) = store.hosts.get(host_id) {
      let mut host = host.clone();

      // Retrieve sensitive data
      let password_entry = Entry::new(&self.service_name, &format!("host-{}-password", host_id))?;

      if let Ok(encrypted_password) = password_entry.get_password() {
        host.password = Some(self.decrypt(&encrypted_password)?);
      }

      let passphrase_entry = Entry::new(
        &self.service_name,
        &format!("host-{}-key-passphrase", host_id),
      )?;

      if let Ok(encrypted_passphrase) = passphrase_entry.get_password() {
        host.private_key_passphrase = Some(self.decrypt(&encrypted_passphrase)?);
      }

      Ok(Some(host))
    } else {
      Ok(None)
    }
  }

  pub async fn get_all_hosts(&self) -> Result<Vec<Host>> {
    let store = self.store.lock().await;
    Ok(store.hosts.values().cloned().collect())
  }

  pub async fn delete_host(&self, host_id: &str) -> Result<()> {
    let mut store = self.store.lock().await;
    store.hosts.remove(host_id);
    store.save()?;
    Ok(())
  }

  // ... similar implementations for SSH keys, snippets, etc.
  pub async fn save_ssh_key(&self, key: SSHKey) -> Result<()> {
    let mut store = self.store.lock().await;
    store.ssh_keys.insert(key.id.clone(), key);

    store.save()?;
    Ok(())
  }

  pub async fn get_ssh_key(&self, key_id: &str) -> Result<Option<SSHKey>> {
    let store = self.store.lock().await;
    Ok(store.ssh_keys.get(key_id).cloned())
  }

  pub async fn get_all_ssh_keys(&self) -> Result<Vec<SSHKey>> {
    let store = self.store.lock().await;
    Ok(store.ssh_keys.values().cloned().collect())
  }

  pub async fn delete_ssh_key(&self, key_id: &str) -> Result<()> {
    let mut store = self.store.lock().await;
    store.ssh_keys.remove(key_id);
    store.save()?;

    // todo remve all host using this ssh key
    Ok(())
  }

  // Snippet management
  pub async fn save_snippet(&self, snippet: Snippet) -> Result<()> {
    let mut store = self.store.lock().await;
    store.snippets.insert(snippet.id.clone(), snippet);
    store.save()?;
    Ok(())
  }

  pub async fn get_snippet(&self, snippet_id: &str) -> Result<Option<Snippet>> {
    let store = self.store.lock().await;
    Ok(store.snippets.get(snippet_id).cloned())
  }

  pub async fn get_all_snippets(&self) -> Result<Vec<Snippet>> {
    let store = self.store.lock().await;
    Ok(store.snippets.values().cloned().collect())
  }

  pub async fn delete_snippet(&self, snippet_id: &str) -> Result<()> {
    let mut store = self.store.lock().await;
    store.snippets.remove(snippet_id);
    store.save()?;
    Ok(())
  }

  // User settings
  pub async fn save_user_settings(&self, settings: UserSettings) -> Result<()> {
    let mut store = self.store.lock().await;
    store.settings = Some(settings);
    store.save()?;
    Ok(())
  }

  pub async fn get_user_settings(&self) -> Result<Option<UserSettings>> {
    let store = self.store.lock().await;
    Ok(store.settings.clone())
  }

  // Cloud sync
  pub async fn export_encrypted_data(&self, master_password: &str) -> Result<String> {
    let store = self.store.lock().await;

    // Create export data
    let export_data = serde_json::json!({
        "hosts": store.hosts,
        "snippets": store.snippets,
        "settings": store.settings,
        "host_groups": store.host_groups,
        "export_date": Utc::now()
    });

    // Generate salt and key
    let mut salt = [0u8; 16];
    rand::rng().fill_bytes(&mut salt);

    // Derive key
    let mut hasher = Sha256::default();
    hasher.update(master_password.as_bytes());
    hasher.update(salt);
    let key = hasher.finalize();

    // Encrypt data
    let cipher = Aes256Gcm::new_from_slice(&key)?;
    let nonce = Nonce::from_slice(&salt[..12]); // Use part of salt as nonce

    let data = serde_json::to_string(&export_data)?;
    let encrypted = cipher
      .encrypt(nonce, data.as_bytes())
      .map_err(|e| anyhow::anyhow!("Failed to encrypt data: {}", e))?;

    // Combine salt and encrypted data
    let mut result = Vec::with_capacity(salt.len() + encrypted.len());
    result.extend_from_slice(&salt);
    result.extend_from_slice(&encrypted);

    Ok(BASE64.encode(result))
  }

  pub async fn import_encrypted_data(
    &self,
    encrypted_data: &str,
    master_password: &str,
  ) -> Result<bool> {
    let data = BASE64.decode(encrypted_data)?;
    if data.len() < 16 {
      return Ok(false);
    }

    // Extract salt and encrypted data
    let (salt, encrypted) = data.split_at(16);

    // Derive key
    let mut hasher = Sha256::default();
    hasher.update(master_password.as_bytes());
    hasher.update(salt);
    let key = hasher.finalize();

    // Decrypt data
    let cipher = Aes256Gcm::new_from_slice(&key)?;
    let nonce = Nonce::from_slice(&salt[..12]);

    let decrypted = match cipher.decrypt(nonce, encrypted.as_ref()) {
      Ok(data) => data,
      Err(_) => return Ok(false),
    };
    let decrypted_str = String::from_utf8(decrypted)?;
    let import_data: serde_json::Value = serde_json::from_str(&decrypted_str)?;

    // Import data
    let mut store = self.store.lock().await;

    if let Some(hosts) = import_data["hosts"].as_object() {
      store.hosts = serde_json::from_value(import_data["hosts"].clone())?;
    }

    if let Some(snippets) = import_data["snippets"].as_object() {
      store.snippets = serde_json::from_value(import_data["snippets"].clone())?;
    }

    if let Some(settings) = import_data["settings"].as_object() {
      store.settings = Some(serde_json::from_value(import_data["settings"].clone())?);
    }

    if let Some(host_groups) = import_data["host_groups"].as_object() {
      store.host_groups = serde_json::from_value(import_data["host_groups"].clone())?;
    }

    store.save()?;
    Ok(true)
  }

  // Pro feature check
  pub async fn is_pro_user(&self) -> Result<bool> {
    let store = self.store.lock().await;
    Ok(store.settings.as_ref().map_or(false, |s| s.pro_user))
  }

  pub async fn can_use_feature(&self, feature_name: &str) -> Result<bool> {
    let pro_features = [
      "cloud-sync",
      "sftp",
      "port-forwarding",
      "advanced-snippets",
      "jump-host",
      "multi-factor-auth",
    ];

    if !pro_features.contains(&feature_name) {
      return Ok(true);
    }

    self.is_pro_user().await
  }

  // Host group methods
  pub async fn save_host_group(&self, group: HostGroup) -> Result<()> {
    let mut store = self.store.lock().await;
    store.host_groups.insert(group.id.clone(), group);
    store.save()?;
    Ok(())
  }

  pub async fn get_host_group(&self, group_id: &str) -> Result<Option<HostGroup>> {
    let store = self.store.lock().await;
    Ok(store.host_groups.get(group_id).cloned())
  }

  pub async fn get_all_host_groups(&self) -> Result<Vec<HostGroup>> {
    let store = self.store.lock().await;
    Ok(store.host_groups.values().cloned().collect())
  }

  pub async fn delete_host_group(&self, group_id: &str) -> Result<()> {
    let mut store = self.store.lock().await;
    store.host_groups.remove(group_id);
    store.save()?;
    Ok(())
  }
}
