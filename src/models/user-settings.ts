export interface UserSettings {
  id: string;
  theme: 'light' | 'dark' | 'system';
  fontSize: number;
  fontFamily: string;
  terminalOptions: {
    cursorBlink: boolean;
    cursorStyle: 'block' | 'underline' | 'bar';
    scrollback: number;
    bellSound: boolean;
    bellStyle: 'none' | 'sound' | 'visual' | 'both';
  };
  autoSaveInterval: number; // In seconds
  cloudSyncEnabled: boolean;
  proUser: boolean;
  proExpiryDate?: Date;
}
