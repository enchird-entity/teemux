// src/services/secure-storage.ts
import * as keytar from 'keytar';
import * as crypto from 'crypto';
import ElectronStore from 'electron-store';
import { Host } from '../models/host';
import { SSHKey } from '../models/ssh-key';
import { Snippet } from '../models/snippet';
import { UserSettings } from '../models/user-settings';

// Define schema for ElectronStore
const schema = {
  hosts: {
    type: 'object' as const,
    additionalProperties: {
      type: 'object' as const,
      properties: {
        // Host properties without sensitive data
      },
    },
  },
  sshKeys: {
    type: 'object' as const,
    additionalProperties: {
      type: 'object' as const,
      properties: {
        // SSH key properties without sensitive data
      },
    },
  },
  snippets: {
    type: 'object' as const,
    additionalProperties: {
      type: 'object' as const,
      properties: {
        // Snippet properties
      },
    },
  },
  settings: {
    type: 'object' as const,
    properties: {
      // User settings properties
    },
  },
  hostGroups: {
    type: 'object' as const,
    additionalProperties: {
      type: 'object' as const,
      properties: {
        // Host group properties
      },
    },
  },
};

// Define the store data structure type
type StoreSchema = {
  hosts: Record<string, any>;
  sshKeys: Record<string, any>;
  snippets: Record<string, any>;
  settings: any;
  hostGroups: Record<string, any>;
};

export class SecureStorage {
  private store: ElectronStore<StoreSchema>;
  private encryptionKey: Buffer | null = null;
  private readonly SERVICE_NAME = 'Teemux';
  private readonly ENCRYPTION_KEY_ACCOUNT = 'encryption-key';

  constructor() {
    this.store = new ElectronStore<StoreSchema>({ schema });
    this.initializeEncryptionKey();
  }

  private async initializeEncryptionKey(): Promise<void> {
    try {
      // Try to retrieve existing encryption key
      let key = await keytar.getPassword(
        this.SERVICE_NAME,
        this.ENCRYPTION_KEY_ACCOUNT
      );

      if (!key) {
        // Generate a new encryption key if none exists
        key = crypto.randomBytes(32).toString('hex');
        await keytar.setPassword(
          this.SERVICE_NAME,
          this.ENCRYPTION_KEY_ACCOUNT,
          key
        );
      }

      this.encryptionKey = Buffer.from(key, 'hex');
    } catch (error) {
      console.error('Failed to initialize encryption key:', error);
      throw new Error('Failed to initialize secure storage');
    }
  }

  private encrypt(data: string): string {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Return IV + Auth Tag + Encrypted Data
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  private decrypt(data: string): string {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }

    const parts = data.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encryptedText = parts[2];

    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      this.encryptionKey,
      iv
    );
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  // Host management
  async saveHost(host: Host): Promise<void> {
    // Create a copy without sensitive data for the store
    const hostForStore = { ...host };

    // Store sensitive data securely
    if (host.password) {
      await keytar.setPassword(
        this.SERVICE_NAME,
        `host-${host.id}-password`,
        host.password
      );
      delete hostForStore.password;
    }

    if (host.privateKeyPassphrase) {
      await keytar.setPassword(
        this.SERVICE_NAME,
        `host-${host.id}-key-passphrase`,
        host.privateKeyPassphrase
      );
      delete hostForStore.privateKeyPassphrase;
    }

    // Save non-sensitive data to store
    const hosts = this.store.get('hosts', {}) as Record<string, any>;
    hosts[host.id] = hostForStore;
    this.store.set('hosts', hosts);
  }

  async getHost(hostId: string): Promise<Host | null> {
    const hosts = this.store.get('hosts', {}) as Record<string, any>;
    const host = hosts[hostId];

    if (!host) {
      return null;
    }

    // Retrieve sensitive data
    try {
      const password = await keytar.getPassword(
        this.SERVICE_NAME,
        `host-${hostId}-password`
      );
      const keyPassphrase = await keytar.getPassword(
        this.SERVICE_NAME,
        `host-${hostId}-key-passphrase`
      );

      return {
        ...host,
        password: password || undefined,
        privateKeyPassphrase: keyPassphrase || undefined,
      };
    } catch (error) {
      console.error('Error retrieving sensitive host data:', error);
      return host;
    }
  }

  async getAllHosts(): Promise<Host[]> {
    const hosts = this.store.get('hosts', {}) as Record<string, any>;
    return Promise.all(
      Object.keys(hosts).map((hostId) => this.getHost(hostId))
    ).then((results) => results.filter(Boolean) as Host[]);
  }

  async deleteHost(hostId: string): Promise<void> {
    // Delete sensitive data
    await keytar.deletePassword(this.SERVICE_NAME, `host-${hostId}-password`);
    await keytar.deletePassword(
      this.SERVICE_NAME,
      `host-${hostId}-key-passphrase`
    );

    // Delete from store
    const hosts = this.store.get('hosts', {}) as Record<string, any>;
    delete hosts[hostId];
    this.store.set('hosts', hosts);
  }

  // SSH Key management
  async saveSSHKey(key: SSHKey): Promise<void> {
    // Create a copy without sensitive data for the store
    const keyForStore = { ...key };

    // Store passphrase securely if it exists
    if (key.passphrase) {
      await keytar.setPassword(
        this.SERVICE_NAME,
        `key-${key.id}-passphrase`,
        key.passphrase
      );
      delete keyForStore.passphrase;
    }

    // Save non-sensitive data to store
    const keys = this.store.get('sshKeys', {}) as Record<string, any>;
    keys[key.id] = keyForStore;
    this.store.set('sshKeys', keys);
  }

  async getSSHKey(keyId: string): Promise<SSHKey | null> {
    const keys = this.store.get('sshKeys', {}) as Record<string, any>;
    const key = keys[keyId];

    if (!key) {
      return null;
    }

    // Retrieve passphrase if it exists
    try {
      const passphrase = await keytar.getPassword(
        this.SERVICE_NAME,
        `key-${keyId}-passphrase`
      );

      return {
        ...key,
        passphrase: passphrase || undefined,
      };
    } catch (error) {
      console.error('Error retrieving SSH key passphrase:', error);
      return key;
    }
  }

  async getAllSSHKeys(): Promise<SSHKey[]> {
    const keys = this.store.get('sshKeys', {}) as Record<string, any>;
    return Promise.all(
      Object.keys(keys).map((keyId) => this.getSSHKey(keyId))
    ).then((results) => results.filter(Boolean) as SSHKey[]);
  }

  async deleteSSHKey(keyId: string): Promise<void> {
    // Delete passphrase if it exists
    await keytar.deletePassword(this.SERVICE_NAME, `key-${keyId}-passphrase`);

    // Delete from store
    const keys = this.store.get('sshKeys', {}) as Record<string, any>;
    delete keys[keyId];
    this.store.set('sshKeys', keys);
  }

  // Snippet management
  async saveSnippet(snippet: Snippet): Promise<void> {
    const snippets = this.store.get('snippets', {}) as Record<string, any>;
    snippets[snippet.id] = snippet;
    this.store.set('snippets', snippets);
  }

  async getSnippet(snippetId: string): Promise<Snippet | null> {
    const snippets = this.store.get('snippets', {}) as Record<string, any>;
    return snippets[snippetId] || null;
  }

  async getAllSnippets(): Promise<Snippet[]> {
    const snippets = this.store.get('snippets', {}) as Record<string, any>;
    return Object.values(snippets);
  }

  async deleteSnippet(snippetId: string): Promise<void> {
    const snippets = this.store.get('snippets', {}) as Record<string, any>;
    delete snippets[snippetId];
    this.store.set('snippets', snippets);
  }

  // User settings
  async saveUserSettings(settings: UserSettings): Promise<void> {
    this.store.set('settings', settings);
  }

  async getUserSettings(): Promise<UserSettings> {
    return this.store.get('settings') as UserSettings;
  }

  // Cloud sync methods
  async exportEncryptedData(masterPassword: string): Promise<string> {
    // Get all data
    const hosts = await this.getAllHosts();
    const sshKeys = await this.getAllSSHKeys();
    const snippets = await this.getAllSnippets();
    const settings = await this.getUserSettings();

    // Create export object
    const exportData = {
      hosts,
      sshKeys,
      snippets,
      settings,
      exportDate: new Date(),
    };

    // Encrypt with master password
    const salt = crypto.randomBytes(16);
    const key = crypto.pbkdf2Sync(masterPassword, salt, 100000, 32, 'sha256');

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(JSON.stringify(exportData), 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Return salt + IV + Auth Tag + Encrypted Data
    return (
      salt.toString('hex') +
      ':' +
      iv.toString('hex') +
      ':' +
      authTag.toString('hex') +
      ':' +
      encrypted
    );
  }

  async importEncryptedData(
    encryptedData: string,
    masterPassword: string
  ): Promise<boolean> {
    try {
      const parts = encryptedData.split(':');
      if (parts.length !== 4) {
        throw new Error('Invalid encrypted data format');
      }

      const salt = Buffer.from(parts[0], 'hex');
      const iv = Buffer.from(parts[1], 'hex');
      const authTag = Buffer.from(parts[2], 'hex');
      const encryptedText = parts[3];

      const key = crypto.pbkdf2Sync(masterPassword, salt, 100000, 32, 'sha256');

      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      const importData = JSON.parse(decrypted);

      // Import hosts
      for (const host of importData.hosts) {
        await this.saveHost(host);
      }

      // Import SSH keys
      for (const key of importData.sshKeys) {
        await this.saveSSHKey(key);
      }

      // Import snippets
      for (const snippet of importData.snippets) {
        await this.saveSnippet(snippet);
      }

      // Import settings
      if (importData.settings) {
        await this.saveUserSettings(importData.settings);
      }

      return true;
    } catch (error) {
      console.error('Import failed:', error);
      return false;
    }
  }

  // Pro feature check
  async isProUser(): Promise<boolean> {
    const settings = await this.getUserSettings();
    return settings?.proUser || false;
  }

  // Feature gating
  async canUseFeature(featureName: string): Promise<boolean> {
    // List of features that require Pro subscription
    const proFeatures = [
      'cloud-sync',
      'sftp',
      'port-forwarding',
      'advanced-snippets',
      'jump-host',
      'multi-factor-auth',
    ];

    // If it's not a pro feature, allow it
    if (!proFeatures.includes(featureName)) {
      return true;
    }

    // Check if user has Pro subscription
    return this.isProUser();
  }

  // Host group methods
  async saveHostGroup(group: any): Promise<void> {
    const hostGroups = this.store.get('hostGroups') || {};
    hostGroups[group.id] = group;
    this.store.set('hostGroups', hostGroups);
  }

  async getHostGroup(groupId: string): Promise<any | null> {
    const hostGroups = this.store.get('hostGroups') || {};
    return hostGroups[groupId] || null;
  }

  async getAllHostGroups(): Promise<any[]> {
    const hostGroups = this.store.get('hostGroups') || {};
    return Object.values(hostGroups);
  }

  async deleteHostGroup(groupId: string): Promise<void> {
    const hostGroups = this.store.get('hostGroups') || {};
    delete hostGroups[groupId];
    this.store.set('hostGroups', hostGroups);
  }
}
