import React, { useState, useEffect } from 'react';
import { ipcRenderer } from 'electron';
import {
  Folder,
  File,
  ArrowUp,
  RefreshCw,
  Upload,
  Download,
  Trash2,
  Plus,
  Edit,
  Server,
  HardDrive,
  Columns,
  Maximize2,
  ChevronDown,
} from 'lucide-react';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modifiedTime: string;
}

interface SftpBrowserProps {
  sessionId?: string;
  hostId?: string;
}

export function SftpBrowser({ sessionId, hostId }: SftpBrowserProps) {
  const [localPath, setLocalPath] = useState('');
  const [remotePath, setRemotePath] = useState('');
  const [localFiles, setLocalFiles] = useState<FileItem[]>([]);
  const [remoteFiles, setRemoteFiles] = useState<FileItem[]>([]);
  const [selectedLocalFiles, setSelectedLocalFiles] = useState<string[]>([]);
  const [selectedRemoteFiles, setSelectedRemoteFiles] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hosts, setHosts] = useState<any[]>([]);
  const [selectedHost, setSelectedHost] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'split' | 'local' | 'remote'>(
    'split'
  );

  useEffect(() => {
    // Load hosts
    ipcRenderer.invoke('hosts:getAll').then((result) => {
      setHosts(result);
    });

    // Load initial local files
    loadLocalFiles('');
  }, []);

  useEffect(() => {
    if (hostId) {
      setSelectedHost(hostId);
      connectToSftp(hostId);
    }
  }, [hostId]);

  const loadLocalFiles = (path: string) => {
    setIsLoading(true);
    ipcRenderer
      .invoke('sftp:listLocalFiles', path)
      .then((files: FileItem[]) => {
        setLocalFiles(files);
        setLocalPath(path);
      })
      .catch((error) => {
        console.error('Failed to load local files:', error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const loadRemoteFiles = (path: string) => {
    if (!isConnected || !selectedHost) return;

    setIsLoading(true);
    ipcRenderer
      .invoke('sftp:listRemoteFiles', { hostId: selectedHost, path })
      .then((files: FileItem[]) => {
        setRemoteFiles(files);
        setRemotePath(path);
      })
      .catch((error) => {
        console.error('Failed to load remote files:', error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const connectToSftp = (hostId: string) => {
    setIsLoading(true);
    ipcRenderer
      .invoke('sftp:connect', hostId)
      .then(() => {
        setIsConnected(true);
        loadRemoteFiles('/');
      })
      .catch((error) => {
        console.error('Failed to connect to SFTP:', error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handleLocalFileClick = (file: FileItem, isCtrlPressed: boolean) => {
    if (file.isDirectory) {
      loadLocalFiles(file.path);
      setSelectedLocalFiles([]);
    } else {
      if (isCtrlPressed) {
        setSelectedLocalFiles((prev) =>
          prev.includes(file.path)
            ? prev.filter((p) => p !== file.path)
            : [...prev, file.path]
        );
      } else {
        setSelectedLocalFiles([file.path]);
      }
    }
  };

  const handleRemoteFileClick = (file: FileItem, isCtrlPressed: boolean) => {
    if (file.isDirectory) {
      loadRemoteFiles(file.path);
      setSelectedRemoteFiles([]);
    } else {
      if (isCtrlPressed) {
        setSelectedRemoteFiles((prev) =>
          prev.includes(file.path)
            ? prev.filter((p) => p !== file.path)
            : [...prev, file.path]
        );
      } else {
        setSelectedRemoteFiles([file.path]);
      }
    }
  };

  const handleLocalParentDirectory = () => {
    if (!localPath || localPath === '/') return;

    const parentPath = localPath.split('/').slice(0, -1).join('/');
    loadLocalFiles(parentPath || '/');
  };

  const handleRemoteParentDirectory = () => {
    if (!remotePath || remotePath === '/') return;

    const parentPath = remotePath.split('/').slice(0, -1).join('/');
    loadRemoteFiles(parentPath || '/');
  };

  const handleUpload = () => {
    if (!isConnected || selectedLocalFiles.length === 0) return;

    setIsLoading(true);
    ipcRenderer
      .invoke('sftp:upload', {
        hostId: selectedHost,
        localPaths: selectedLocalFiles,
        remotePath: remotePath,
      })
      .then(() => {
        loadRemoteFiles(remotePath);
        setSelectedLocalFiles([]);
      })
      .catch((error) => {
        console.error('Failed to upload files:', error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handleDownload = () => {
    if (!isConnected || selectedRemoteFiles.length === 0) return;

    setIsLoading(true);
    ipcRenderer
      .invoke('sftp:download', {
        hostId: selectedHost,
        remotePaths: selectedRemoteFiles,
        localPath: localPath,
      })
      .then(() => {
        loadLocalFiles(localPath);
        setSelectedRemoteFiles([]);
      })
      .catch((error) => {
        console.error('Failed to download files:', error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Function to toggle view mode
  const toggleViewMode = (mode: 'split' | 'local' | 'remote') => {
    setViewMode(mode);
  };

  if (!selectedHost && !hostId) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6">
        <Server className="w-16 h-16 text-gray-400 mb-4" />
        <h2 className="text-xl font-medium text-white mb-2">
          Connect to a host
        </h2>
        <p className="text-gray-400 mb-6 text-center">
          Select a host to start transferring files via SFTP
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl w-full">
          {hosts.map((host) => (
            <button
              key={host.id}
              className="p-4 bg-[#252532] border border-[#2d2d3a] rounded-lg hover:bg-[#2d2d3a] text-left"
              onClick={() => {
                setSelectedHost(host.id);
                connectToSftp(host.id);
              }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-[#f97316] flex items-center justify-center">
                  <Server className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-medium">{host.label}</h3>
                  <p className="text-xs text-gray-400">
                    {host.username}@{host.hostname}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#1a1a24]">
      <div className="flex items-center justify-between p-4 border-b border-[#2d2d3a]">
        <h2 className="text-white font-medium">SFTP Browser</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className={`text-gray-400 hover:text-white ${
              viewMode === 'split' ? 'text-white' : ''
            }`}
            onClick={() => toggleViewMode('split')}
            title="Split View">
            <Columns className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`text-gray-400 hover:text-white ${
              viewMode === 'local' ? 'text-white' : ''
            }`}
            onClick={() => toggleViewMode('local')}
            title="Local Files Only">
            <HardDrive className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`text-gray-400 hover:text-white ${
              viewMode === 'remote' ? 'text-white' : ''
            }`}
            onClick={() => toggleViewMode('remote')}
            title="Remote Files Only">
            <Server className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Local Files Panel - Hidden in remote-only mode */}
        {viewMode !== 'remote' && (
          <div
            className={`flex flex-col ${
              viewMode === 'split' ? 'w-1/2' : 'w-full'
            } border-r border-[#2d2d3a]`}>
            <div className="p-3 border-b border-[#2d2d3a] flex items-center justify-between">
              <h3 className="text-white font-medium text-sm">Local Files</h3>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white"
                  onClick={() => loadLocalFiles(localPath)}
                  title="Refresh">
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="p-2 border-b border-[#2d2d3a] flex items-center">
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white"
                onClick={handleLocalParentDirectory}
                disabled={!localPath}>
                <ArrowUp className="w-4 h-4" />
              </Button>
              <input
                type="text"
                value={localPath}
                onChange={(e) => setLocalPath(e.target.value)}
                onKeyDown={(e) =>
                  e.key === 'Enter' && loadLocalFiles(localPath)
                }
                className="flex-1 bg-[#252532] border border-[#2d2d3a] rounded text-white text-sm px-3 py-1 ml-2"
              />
            </div>

            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#252532]">
                  <tr>
                    <th className="text-left text-gray-400 px-4 py-2">Name</th>
                    <th className="text-right text-gray-400 px-4 py-2">Size</th>
                    <th className="text-right text-gray-400 px-4 py-2">
                      Modified
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {localFiles.map((file) => (
                    <tr
                      key={file.path}
                      className={`hover:bg-[#252532] cursor-pointer ${
                        selectedLocalFiles.includes(file.path)
                          ? 'bg-[#2d2d3a]'
                          : ''
                      }`}
                      onClick={(e) =>
                        handleLocalFileClick(file, e.ctrlKey || e.metaKey)
                      }
                      onDoubleClick={() => {
                        if (file.isDirectory) {
                          loadLocalFiles(file.path);
                        }
                      }}>
                      <td className="px-4 py-2 flex items-center gap-2">
                        {file.isDirectory ? (
                          <Folder className="w-4 h-4 text-yellow-500" />
                        ) : (
                          <File className="w-4 h-4 text-blue-500" />
                        )}
                        <span className="text-white">{file.name}</span>
                      </td>
                      <td className="text-right text-gray-400 px-4 py-2">
                        {file.isDirectory ? '--' : formatFileSize(file.size)}
                      </td>
                      <td className="text-right text-gray-400 px-4 py-2">
                        {formatDate(file.modifiedTime)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Remote Files Panel - Hidden in local-only mode */}
        {viewMode !== 'local' && (
          <div
            className={`flex flex-col ${
              viewMode === 'split' ? 'w-1/2' : 'w-full'
            }`}>
            <div className="p-3 border-b border-[#2d2d3a] flex items-center justify-between">
              <h3 className="text-white font-medium text-sm">Remote Files</h3>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white"
                  onClick={() => loadRemoteFiles(remotePath)}
                  disabled={!isConnected}
                  title="Refresh">
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="p-2 border-b border-[#2d2d3a] flex items-center">
              {!isConnected ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="gap-2 bg-[#252532] border-[#2d2d3a] text-white hover:bg-[#2d2d3a]">
                      <span>Select Host</span>
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-[#252532] border-[#2d2d3a] text-white">
                    {hosts.map((host) => (
                      <DropdownMenuItem
                        key={host.id}
                        onClick={() => {
                          setSelectedHost(host.id);
                          connectToSftp(host.id);
                        }}
                        className="hover:bg-[#2d2d3a]">
                        {host.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-white"
                    onClick={handleRemoteParentDirectory}
                    disabled={!remotePath}>
                    <ArrowUp className="w-4 h-4" />
                  </Button>
                  <input
                    type="text"
                    value={remotePath}
                    onChange={(e) => setRemotePath(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === 'Enter' && loadRemoteFiles(remotePath)
                    }
                    className="flex-1 bg-[#252532] border border-[#2d2d3a] rounded text-white text-sm px-3 py-1 ml-2"
                  />
                </>
              )}
            </div>

            <div className="flex-1 overflow-auto">
              {isConnected ? (
                <table className="w-full text-sm">
                  <thead className="bg-[#252532]">
                    <tr>
                      <th className="text-left text-gray-400 px-4 py-2">
                        Name
                      </th>
                      <th className="text-right text-gray-400 px-4 py-2">
                        Size
                      </th>
                      <th className="text-right text-gray-400 px-4 py-2">
                        Modified
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {remoteFiles.map((file) => (
                      <tr
                        key={file.path}
                        className={`hover:bg-[#252532] cursor-pointer ${
                          selectedRemoteFiles.includes(file.path)
                            ? 'bg-[#2d2d3a]'
                            : ''
                        }`}
                        onClick={(e) =>
                          handleRemoteFileClick(file, e.ctrlKey || e.metaKey)
                        }
                        onDoubleClick={() => {
                          if (file.isDirectory) {
                            loadRemoteFiles(file.path);
                          }
                        }}>
                        <td className="px-4 py-2 flex items-center gap-2">
                          {file.isDirectory ? (
                            <Folder className="w-4 h-4 text-yellow-500" />
                          ) : (
                            <File className="w-4 h-4 text-blue-500" />
                          )}
                          <span className="text-white">{file.name}</span>
                        </td>
                        <td className="text-right text-gray-400 px-4 py-2">
                          {file.isDirectory ? '--' : formatFileSize(file.size)}
                        </td>
                        <td className="text-right text-gray-400 px-4 py-2">
                          {formatDate(file.modifiedTime)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <Server className="w-12 h-12 mb-4" />
                  <p className="text-center">
                    Connect to a host to browse remote files
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actions Footer */}
      <div className="p-3 border-t border-[#2d2d3a] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 bg-[#252532] border-[#2d2d3a] text-white hover:bg-[#2d2d3a]"
            onClick={handleUpload}
            disabled={!isConnected || selectedLocalFiles.length === 0}>
            <Upload className="w-4 h-4" />
            <span>Upload</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 bg-[#252532] border-[#2d2d3a] text-white hover:bg-[#2d2d3a]"
            onClick={handleDownload}
            disabled={!isConnected || selectedRemoteFiles.length === 0}>
            <Download className="w-4 h-4" />
            <span>Download</span>
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 bg-[#252532] border-[#2d2d3a] text-white hover:bg-[#2d2d3a]">
            <Plus className="w-4 h-4" />
            <span>New Folder</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 bg-[#252532] border-[#2d2d3a] text-white hover:bg-[#2d2d3a]">
            <Trash2 className="w-4 h-4" />
            <span>Delete</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
