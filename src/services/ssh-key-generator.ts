import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';
import { exec } from 'child_process';
import { SSHKey } from '../models/ssh-key';

const execPromise = util.promisify(exec);

export class SSHKeyGenerator {
  private keysDir: string;
  
  constructor(appDataPath: string) {
    this.keysDir = path.join(appDataPath, 'ssh-keys');
    
    // Ensure keys directory exists
    if (!fs.existsSync(this.keysDir)) {
      fs.mkdirSync(this.keysDir, { recursive: true });
    }
  }
  
  async generateKey(
    name: string,
    type: 'rsa' | 'dsa' | 'ecdsa' | 'ed25519',
    bits?: number,
    passphrase?: string
  ): Promise<SSHKey> {
    const id = `key-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const privateKeyPath = path.join(this.keysDir, `${id}`);
    const publicKeyPath = `${privateKeyPath}.pub`;
    
    let command = `ssh-keygen -t ${type}`;
    
    if (type === 'rsa' && bits) {
      command += ` -b ${bits}`;
    }
    
    command += ` -f "${privateKeyPath}"`;
    
    if (passphrase) {
      command += ` -N "${passphrase}"`;
    } else {
      command += ' -N ""';
    }
    
    try {
      await execPromise(command);
      
      const sshKey: SSHKey = {
        id,
        name,
        type,
        bits: type === 'rsa' ? bits : undefined,
        privateKeyPath,
        publicKeyPath,
        passphrase,
        hostIds: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      return sshKey;
    } catch (error) {
      console.error('Failed to generate SSH key:', error);
      throw new Error(`Failed to generate SSH key: ${error}`);
    }
  }
  
  async importKey(
    name: string,
    privateKeyContent: string,
    publicKeyContent?: string,
    passphrase?: string
  ): Promise<SSHKey> {
    const id = `key-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const privateKeyPath = path.join(this.keysDir, `${id}`);
    const publicKeyPath = `${privateKeyPath}.pub`;
    
    try {
      // Write private key
      fs.writeFileSync(privateKeyPath, privateKeyContent, { mode: 0o600 });
      
      // Write public key if provided, or generate it
      if (publicKeyContent) {
        fs.writeFileSync(publicKeyPath, publicKeyContent);
      } else {
        // Generate public key from private key
        const command = `ssh-keygen -y -f "${privateKeyPath}"${passphrase ? ` -P "${passphrase}"` : ' -P ""'} > "${publicKeyPath}"`;
        await execPromise(command);
      }
      
      // Determine key type
      const keyTypeCommand = `ssh-keygen -l -f "${privateKeyPath}"`;
      const { stdout } = await execPromise(keyTypeCommand);
      
      let type: 'rsa' | 'dsa' | 'ecdsa' | 'ed25519' = 'rsa';
      let bits: number | undefined;
      
      if (stdout.includes('RSA')) {
        type = 'rsa';
        const match = stdout.match(/(\d+)/);
        if (match) {
          bits = parseInt(match[1], 10);
        }
      } else if (stdout.includes('DSA')) {
        type = 'dsa';
      } else if (stdout.includes('ECDSA')) {
        type = 'ecdsa';
      } else if (stdout.includes('ED25519')) {
        type = 'ed25519';
      }
      
      const sshKey: SSHKey = {
        id,
        name,
        type,
        bits,
        privateKeyPath,
        publicKeyPath,
        passphrase,
        hostIds: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      return sshKey;
    } catch (error) {
      console.error('Failed to import SSH key:', error);
      throw new Error(`Failed to import SSH key: ${error}`);
    }
  }
  
  async exportKey(keyId: string, includePrivateKey: boolean): Promise<{ privateKey?: string, publicKey: string }> {
    const privateKeyPath = path.join(this.keysDir, keyId);
    const publicKeyPath = `${privateKeyPath}.pub`;
    
    try {
      const publicKey = fs.readFileSync(publicKeyPath, 'utf8');
      
      if (includePrivateKey) {
        const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
        return { privateKey, publicKey };
      }
      
      return { publicKey };
    } catch (error) {
      console.error('Failed to export SSH key:', error);
      throw new Error(`Failed to export SSH key: ${error}`);
    }
  }
  
  async deleteKey(keyId: string): Promise<void> {
    const privateKeyPath = path.join(this.keysDir, keyId);
    const publicKeyPath = `${privateKeyPath}.pub`;
    
    try {
      if (fs.existsSync(privateKeyPath)) {
        fs.unlinkSync(privateKeyPath);
      }
      
      if (fs.existsSync(publicKeyPath)) {
        fs.unlinkSync(publicKeyPath);
      }
    } catch (error) {
      console.error('Failed to delete SSH key:', error);
      throw new Error(`Failed to delete SSH key: ${error}`);
    }
  }
}