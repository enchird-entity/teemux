import * as SFTPClient from 'ssh2-sftp-client';
import { Client } from 'ssh2';
import { EventEmitter } from 'events';

export interface FileEntry {
  type: string;
  name: string;
  size: number;
  modifyTime: Date;
  accessTime: Date;
  rights: {
    user: string;
    group: string;
    other: string;
  };
  owner: number;
  group: number;
  path: string;
}

export class SFTPManager extends EventEmitter {
  private sftpClients: Map<string, any> = new Map();

  async createSFTPClient(
    sessionId: string,
    sshClient: Client
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      sshClient.sftp((err, sftp) => {
        if (err) {
          this.emit('error', { sessionId, error: err });
          reject(err);
          return;
        }

        const sftpClient = new SFTPClient.default();
        (sftpClient as any).client = sftp;

        const sftpId = `sftp-${sessionId}`;
        this.sftpClients.set(sftpId, sftpClient);

        this.emit('sftp-ready', { sessionId, sftpId });
        resolve(sftpId);
      });
    });
  }

  async listDirectory(
    sftpId: string,
    remotePath: string
  ): Promise<FileEntry[]> {
    const sftpClient = this.sftpClients.get(sftpId);
    if (!sftpClient) {
      throw new Error('SFTP client not found');
    }

    try {
      const list = await sftpClient.list(remotePath);
      return list.map((item: any) => ({
        type: item.type,
        name: item.name,
        size: item.size,
        modifyTime: new Date(item.modifyTime),
        accessTime: new Date(item.accessTime),
        rights: item.rights,
        owner: item.owner,
        group: item.group,
        path: `${remotePath}/${item.name}`.replace(/\/\//g, '/'),
      }));
    } catch (error) {
      this.emit('error', { sftpId, error });
      throw error;
    }
  }

  async downloadFile(
    sftpId: string,
    remotePath: string,
    localPath: string,
    onProgress?: (transferred: number, total: number) => void
  ): Promise<void> {
    const sftpClient = this.sftpClients.get(sftpId);
    if (!sftpClient) {
      throw new Error('SFTP client not found');
    }

    try {
      // Get file stats for progress reporting
      const stats = await sftpClient.stat(remotePath);
      const totalSize = stats.size;

      let transferred = 0;

      // Set up progress tracking
      if (onProgress) {
        sftpClient.on('transfer', (info: any) => {
          transferred += info.bytesRead;
          onProgress(transferred, totalSize);
        });
      }

      await sftpClient.fastGet(remotePath, localPath);

      this.emit('download-complete', { sftpId, remotePath, localPath });
    } catch (error) {
      this.emit('error', {
        sftpId,
        error,
        operation: 'download',
        remotePath,
        localPath,
      });
      throw error;
    }
  }

  async uploadFile(
    sftpId: string,
    localPath: string,
    remotePath: string,
    onProgress?: (transferred: number, total: number) => void
  ): Promise<void> {
    const sftpClient = this.sftpClients.get(sftpId);
    if (!sftpClient) {
      throw new Error('SFTP client not found');
    }

    try {
      // Get file stats for progress reporting
      const fs = require('fs');
      const stats = fs.statSync(localPath);
      const totalSize = stats.size;

      let transferred = 0;

      // Set up progress tracking
      if (onProgress) {
        sftpClient.on('transfer', (info: any) => {
          transferred += info.bytesWritten;
          onProgress(transferred, totalSize);
        });
      }

      await sftpClient.fastPut(localPath, remotePath);

      this.emit('upload-complete', { sftpId, localPath, remotePath });
    } catch (error) {
      this.emit('error', {
        sftpId,
        error,
        operation: 'upload',
        localPath,
        remotePath,
      });
      throw error;
    }
  }

  async createDirectory(sftpId: string, remotePath: string): Promise<void> {
    const sftpClient = this.sftpClients.get(sftpId);
    if (!sftpClient) {
      throw new Error('SFTP client not found');
    }

    try {
      await sftpClient.mkdir(remotePath, true);
      this.emit('directory-created', { sftpId, remotePath });
    } catch (error) {
      this.emit('error', { sftpId, error, operation: 'mkdir', remotePath });
      throw error;
    }
  }

  async deleteFile(sftpId: string, remotePath: string): Promise<void> {
    const sftpClient = this.sftpClients.get(sftpId);
    if (!sftpClient) {
      throw new Error('SFTP client not found');
    }

    try {
      await sftpClient.delete(remotePath);
      this.emit('file-deleted', { sftpId, remotePath });
    } catch (error) {
      this.emit('error', { sftpId, error, operation: 'delete', remotePath });
      throw error;
    }
  }

  async deleteDirectory(sftpId: string, remotePath: string): Promise<void> {
    const sftpClient = this.sftpClients.get(sftpId);
    if (!sftpClient) {
      throw new Error('SFTP client not found');
    }

    try {
      await sftpClient.rmdir(remotePath, true);
      this.emit('directory-deleted', { sftpId, remotePath });
    } catch (error) {
      this.emit('error', { sftpId, error, operation: 'rmdir', remotePath });
      throw error;
    }
  }

  async rename(
    sftpId: string,
    oldPath: string,
    newPath: string
  ): Promise<void> {
    const sftpClient = this.sftpClients.get(sftpId);
    if (!sftpClient) {
      throw new Error('SFTP client not found');
    }

    try {
      await sftpClient.rename(oldPath, newPath);
      this.emit('renamed', { sftpId, oldPath, newPath });
    } catch (error) {
      this.emit('error', {
        sftpId,
        error,
        operation: 'rename',
        oldPath,
        newPath,
      });
      throw error;
    }
  }

  closeSFTPClient(sftpId: string): void {
    const sftpClient = this.sftpClients.get(sftpId);
    if (sftpClient) {
      sftpClient.end();
      this.sftpClients.delete(sftpId);
      this.emit('sftp-closed', { sftpId });
    }
  }
}
