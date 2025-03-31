export interface Session {
  id: string;
  hostId: string;
  terminalId: string;
  startTime: string;
  endTime?: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  error?: string;
  lastActivity?: string;
  type: 'ssh' | 'serial' | 'telnet';
  sftpEnabled?: boolean;
  portForwardings?: any[];
}
