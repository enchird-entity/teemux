import { Snippet } from '../models/snippet';
import { SecureStorage } from './secure-storage';
import { ipcMain } from 'electron';

export class SnippetManager {
  private secureStorage: SecureStorage;

  constructor(secureStorage: SecureStorage) {
    this.secureStorage = secureStorage;
  }

  async runSnippet(snippet: Snippet, terminalId: string): Promise<boolean> {
    try {
      // Send the command to the terminal
      const windows = require('electron').BrowserWindow.getAllWindows();
      for (const window of windows) {
        if (!window.isDestroyed()) {
          window.webContents.send('terminal:data', {
            terminalId,
            data: snippet.command + '\n',
          });
        }
      }

      return true;
    } catch (error) {
      console.error('Failed to run snippet:', error);
      return false;
    }
  }

  async runSnippetsOnConnect(
    snippetIds: string[],
    terminalId: string
  ): Promise<void> {
    try {
      // Get all snippets
      const snippets = await Promise.all(
        snippetIds.map((id) => this.secureStorage.getSnippet(id))
      );

      // Filter out null values and snippets that shouldn't run on connect
      const snippetsToRun = snippets.filter(
        (s): s is Snippet => s !== null && s.runOnConnect
      );

      // Run each snippet with a small delay between them
      for (const snippet of snippetsToRun) {
        await this.runSnippet(snippet, terminalId);
        // Small delay to ensure commands execute in order
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error('Failed to run snippets on connect:', error);
    }
  }
}
