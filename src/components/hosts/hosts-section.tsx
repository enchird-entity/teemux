import React, { useState, useEffect } from 'react';
import { HostCard } from './host-card';
import { Button } from '../ui/button';
import {
  PlusCircle,
  ChevronDown,
  ChevronRight,
  FolderPlus,
  MoreVertical,
  Search,
} from 'lucide-react';
import type { Host } from '../../../models/host';
import type { HostGroup } from '../../../models/host';
import { ipcRenderer } from 'electron';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

interface HostsSectionProps {
  hosts: Host[];
  selectedHost: string | null;
  onSelectHost: (hostId: string) => void;
  onConnect: (hostId: string) => void;
  onAddHost: () => void;
  onHostUpdated?: (host: Host) => void;
}

export function HostsSection({
  hosts,
  selectedHost,
  onSelectHost,
  onConnect,
  onAddHost,
  onHostUpdated,
}: HostsSectionProps) {
  const [groups, setGroups] = useState<HostGroup[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {}
  );
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = () => {
    // Load groups from main process
    setIsLoading(true);
    ipcRenderer
      .invoke('groups:getAll')
      .then((result: HostGroup[]) => {
        setGroups(result);
        // Initialize expanded state for all groups
        const expanded: Record<string, boolean> = {};
        result.forEach((group) => {
          expanded[group.id] = false;
        });
        setExpandedGroups(expanded);
      })
      .catch((err) => {
        console.error('Failed to load groups:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const handleCreateGroup = () => {
    const groupName = prompt('Enter group name:');
    if (groupName && groupName.trim()) {
      const newGroup = {
        id: `group-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        name: groupName.trim(),
        hosts: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      ipcRenderer
        .invoke('groups:add', newGroup)
        .then(() => {
          loadGroups();
        })
        .catch((err) => {
          console.error('Failed to create group:', err);
          alert('Failed to create group: ' + err.message);
        });
    }
  };

  // Count hosts in each group
  const getHostsInGroup = (groupId: string) => {
    return hosts.filter((host) => host.groups && host.groups.includes(groupId))
      .length;
  };

  // Add host to group
  const addHostToGroup = (hostId: string, groupId: string) => {
    // First get the host
    const host = hosts.find((h) => h.id === hostId);
    if (!host) return;

    // Add the group to the host's groups array if it's not already there
    const updatedGroups = [...(host.groups || [])];
    if (!updatedGroups.includes(groupId)) {
      updatedGroups.push(groupId);
    }

    // Update the host
    const updatedHost = {
      ...host,
      groups: updatedGroups,
    };

    ipcRenderer
      .invoke('hosts:update', updatedHost)
      .then(() => {
        // Notify parent component that host was updated
        // This would typically refresh the hosts list
        if (onHostUpdated) {
          onHostUpdated(updatedHost);
        }
      })
      .catch((err) => {
        console.error('Failed to add host to group:', err);
        alert('Failed to add host to group: ' + err.message);
      });
  };

  // Remove host from group
  const removeHostFromGroup = (hostId: string, groupId: string) => {
    // First get the host
    const host = hosts.find((h) => h.id === hostId);
    if (!host || !host.groups) return;

    // Remove the group from the host's groups array
    const updatedGroups = host.groups.filter((g) => g !== groupId);

    // Update the host
    const updatedHost = {
      ...host,
      groups: updatedGroups,
    };

    ipcRenderer
      .invoke('hosts:update', updatedHost)
      .then(() => {
        // Notify parent component that host was updated
        if (onHostUpdated) {
          onHostUpdated(updatedHost);
        }
      })
      .catch((err) => {
        console.error('Failed to remove host from group:', err);
        alert('Failed to remove host from group: ' + err.message);
      });
  };

  // Filter hosts based on search term
  const filteredHosts = hosts.filter(
    (host) =>
      searchTerm === '' ||
      host.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      host.hostname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (host.username &&
        host.username.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (hosts.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-full bg-[#252532] flex items-center justify-center mb-4">
          <PlusCircle className="w-8 h-8 text-gray-400" />
        </div>
        <h2 className="text-xl font-medium text-white mb-2">
          No hosts added yet
        </h2>
        <p className="text-gray-400 mb-6">
          Add your first host to get started with Teemux
        </p>
        <Button
          onClick={onAddHost}
          className="bg-[#f97316] hover:bg-[#ea580c] text-white">
          Add New Host
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#1a1a24]">
      {/* Search bar */}
      <div className="p-4 border-b border-[#2d2d3a]">
        <div className="relative">
          <input
            type="text"
            placeholder="Find a host or ssh user@hostname..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#252532] border border-[#2d2d3a] rounded-md pl-10 pr-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#f97316]"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex border-b border-[#2d2d3a] p-2 gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 bg-[#252532] border-[#2d2d3a] text-white hover:bg-[#2d2d3a] hover:text-white"
          onClick={onAddHost}>
          NEW HOST
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-10 bg-[#252532] border-[#2d2d3a] text-white hover:bg-[#2d2d3a] hover:text-white"
          onClick={handleCreateGroup}>
          <FolderPlus className="h-4 w-4" />
        </Button>
      </div>

      {/* Hosts section */}
      <div className="flex-1 overflow-auto">
        <div className="text-xs font-medium text-gray-400 px-4 py-2 uppercase">
          Hosts
        </div>
        <div className="flex flex-col">
          {filteredHosts
            .filter((host) => !host.groups || host.groups.length === 0)
            .map((host) => (
              <HostCard
                key={host.id}
                host={host}
                isSelected={selectedHost === host.id}
                onClick={() => onSelectHost(host.id)}
                actions={
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem disabled={groups.length === 0}>
                        Add to group
                      </DropdownMenuItem>
                      {groups.map((group) => (
                        <DropdownMenuItem
                          key={group.id}
                          className="pl-6"
                          onClick={() => addHostToGroup(host.id, group.id)}>
                          {group.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                }
              />
            ))}
        </div>

        {/* Groups section */}
        {groups.length > 0 && (
          <>
            <div className="text-xs font-medium text-gray-400 px-4 py-2 uppercase mt-4">
              Groups
            </div>
            {isLoading ? (
              <div className="px-4 py-2 text-sm text-gray-500">
                Loading groups...
              </div>
            ) : (
              groups.map((group) => (
                <div key={group.id} className="mb-1">
                  <button
                    className="w-full flex items-center justify-between px-4 py-2 text-sm text-white hover:bg-[#252532]"
                    onClick={() => toggleGroup(group.id)}>
                    <div className="flex items-center gap-2">
                      {expandedGroups[group.id] ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                      <span>{group.name}</span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {getHostsInGroup(group.id)}
                    </span>
                  </button>

                  {expandedGroups[group.id] && (
                    <div className="ml-6 border-l border-[#2d2d3a] pl-2">
                      {filteredHosts
                        .filter(
                          (host) =>
                            host.groups && host.groups.includes(group.id)
                        )
                        .map((host) => (
                          <HostCard
                            key={host.id}
                            host={host}
                            isSelected={selectedHost === host.id}
                            onClick={() => onSelectHost(host.id)}
                            compact={true}
                            actions={
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() =>
                                      removeHostFromGroup(host.id, group.id)
                                    }>
                                    Remove from group
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            }
                          />
                        ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}
