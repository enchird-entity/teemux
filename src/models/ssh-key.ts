export interface SSHKey {
  id: string;
  name: string;
  type: 'rsa' | 'dsa' | 'ecdsa' | 'ed25519';
  bits?: number; // For RSA keys
  privateKeyPath: string;
  publicKeyPath: string;
  passphrase?: string; // Only stored encrypted
  hostIds: string[]; // Hosts using this key
  createdAt: Date;
  updatedAt: Date;
}
