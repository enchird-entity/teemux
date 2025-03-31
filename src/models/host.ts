import { Snippet } from './snippet';

export interface Host {
  id: string;
  label: string;
  hostname: string;
  port?: number;
  username?: string;
  password?: string;
  privateKey?: string;
  privateKeyPath?: string;
  passphrase?: string;
  privateKeyPassphrase?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  lastConnected?: string;
  jumpHost?: string;
  useJumpHost?: boolean;
  sshOptions?: Record<string, string>;
  keepAliveInterval?: number;
  connectionTimeout?: number;
  description?: string;
  color?: string;
  group?: string;
  favorite?: boolean;
  groups: string[];
  authType: 'password' | 'key' | 'agent';
  snippets: Snippet[];
  connectionCount: number;
  isProFeature: false;
}

export interface HostGroup {
  id: string;
  name: string;
  color?: string;
  hosts: string[]; // Array of host IDs
  parentGroup?: string; // For nested groups
  createdAt: Date;
  updatedAt: Date;
}
