import React, { useState, useEffect } from 'react';
import { Host, HostGroup } from '../../models/host';
import { SSHKey } from '../../models/ssh-key';
import { ipcRenderer } from 'electron';
import { Button } from './ui/button';
import { HostsSection } from './hosts/hosts-section';

interface HostManagerProps {
  onConnect: (hostId: string) => void;
}

export const HostManager: React.FC<HostManagerProps> = ({ onConnect }) => {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [groups, setGroups] = useState<HostGroup[]>([]);
  const [keys, setKeys] = useState<SSHKey[]>([]);
  const [selectedHost, setSelectedHost] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingHost, setIsAddingHost] = useState(false);
  const [newHost, setNewHost] = useState<Partial<Host>>({
    label: '',
    hostname: '',
    port: 22,
    username: '',
    authType: 'password',
    useJumpHost: false,
    snippets: [],
    groups: [],
    tags: [],
    connectionCount: 0,
  });

  useEffect(() => {
    // Load hosts from main process
    ipcRenderer.invoke('hosts:getAll').then((result: Host[]) => {
      setHosts(result);
    });

    // Load groups
    ipcRenderer.invoke('groups:getAll').then((result: HostGroup[]) => {
      setGroups(result);
    });

    // Load SSH keys
    ipcRenderer.invoke('sshKeys:getAll').then((result: SSHKey[]) => {
      setKeys(result);
    });

    // Listen for host updates
    const hostUpdateListener = (_: any, updatedHost: Host) => {
      setHosts((prevHosts) => {
        const index = prevHosts.findIndex((h) => h.id === updatedHost.id);
        if (index >= 0) {
          const newHosts = [...prevHosts];
          newHosts[index] = updatedHost;
          return newHosts;
        }
        return [...prevHosts, updatedHost];
      });
    };

    ipcRenderer.on('hosts:updated', hostUpdateListener);

    return () => {
      ipcRenderer.removeListener('hosts:updated', hostUpdateListener);
    };
  }, []);

  const filteredHosts = hosts.filter(
    (host) =>
      host.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      host.hostname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      host.tags?.some((tag) =>
        tag.toLowerCase().includes(searchTerm.toLowerCase())
      )
  );

  const handleConnect = (hostId: string) => {
    onConnect(hostId);
  };

  const handleAddHost = () => {
    if (!newHost.label || !newHost.hostname || !newHost.username) {
      // Show validation error
      return;
    }

    ipcRenderer.invoke('hosts:add', newHost).then((addedHost: Host) => {
      setHosts((prevHosts) => [...prevHosts, addedHost]);
      setIsAddingHost(false);
      setNewHost({
        label: '',
        hostname: '',
        port: 22,
        username: '',
        authType: 'password',
        useJumpHost: false,
        snippets: [],
        groups: [],
        tags: [],
        connectionCount: 0,
      });
    });
  };

  const handleDeleteHost = (hostId: string) => {
    ipcRenderer.invoke('hosts:delete', hostId).then(() => {
      setHosts((prevHosts) => prevHosts.filter((h) => h.id !== hostId));
      if (selectedHost === hostId) {
        setSelectedHost(null);
      }
    });
  };

  const handleUpdateHost = (updatedHost: Host) => {
    setHosts((prevHosts) => {
      const index = prevHosts.findIndex((h) => h.id === updatedHost.id);
      if (index >= 0) {
        const newHosts = [...prevHosts];
        newHosts[index] = updatedHost;
        return newHosts;
      }
      return prevHosts;
    });
  };

  return (
    <div className="flex h-full">
      <div className="w-1/3 border-r border-[#2d2d3a] overflow-auto">
        <div className="p-4">
          <div className="relative mb-4">
            <input
              type="text"
              placeholder="Search hosts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#252532] border border-[#2d2d3a] rounded-md px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#f97316]"
            />
          </div>
          <Button
            onClick={() => setIsAddingHost(true)}
            className="w-full bg-[#f97316] hover:bg-[#ea580c] text-white">
            Add New Host
          </Button>
        </div>

        <HostsSection
          hosts={filteredHosts}
          selectedHost={selectedHost}
          onSelectHost={setSelectedHost}
          onConnect={handleConnect}
          onAddHost={() => setIsAddingHost(true)}
          onHostUpdated={handleUpdateHost}
        />
      </div>

      {isAddingHost && (
        <div className="add-host-form">
          <h3>Add New Host</h3>
          <div className="form-group">
            <label>Label</label>
            <input
              type="text"
              value={newHost.label}
              onChange={(e) =>
                setNewHost({ ...newHost, label: e.target.value })
              }
            />
          </div>
          <div className="form-group">
            <label>Hostname</label>
            <input
              type="text"
              value={newHost.hostname}
              onChange={(e) =>
                setNewHost({ ...newHost, hostname: e.target.value })
              }
            />
          </div>
          <div className="form-group">
            <label>Port</label>
            <input
              type="number"
              value={newHost.port}
              onChange={(e) =>
                setNewHost({ ...newHost, port: Number(e.target.value) })
              }
            />
          </div>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={newHost.username}
              onChange={(e) =>
                setNewHost({ ...newHost, username: e.target.value })
              }
            />
          </div>
          <div className="form-group">
            <label>Authentication</label>
            <select
              value={newHost.authType}
              onChange={(e) =>
                setNewHost({
                  ...newHost,
                  authType: e.target.value as 'password' | 'key' | 'agent',
                })
              }>
              <option value="password">Password</option>
              <option value="key">SSH Key</option>
              <option value="agent">SSH Agent</option>
            </select>
          </div>

          {newHost.authType === 'password' && (
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                onChange={(e) =>
                  setNewHost({ ...newHost, password: e.target.value })
                }
              />
            </div>
          )}

          {newHost.authType === 'key' && (
            <div className="form-group">
              <label>SSH Key</label>
              <select
                onChange={(e) =>
                  setNewHost({ ...newHost, privateKeyPath: e.target.value })
                }>
                <option value="">Select a key</option>
                {keys.map((key) => (
                  <option key={key.id} value={key.privateKeyPath}>
                    {key.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-actions">
            <button onClick={handleAddHost}>Save</button>
            <button onClick={() => setIsAddingHost(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};
