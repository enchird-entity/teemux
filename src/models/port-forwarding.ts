export interface PortForwarding {
  id: string;
  hostId: string;
  type: 'local' | 'remote' | 'dynamic';
  localPort: number;
  remoteHost?: string;
  remotePort?: number;
  description?: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  isProFeature: boolean;
}
