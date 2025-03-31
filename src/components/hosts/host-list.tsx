import React from 'react';
import { HostCard } from './host-card';
import { Button } from '../ui/button';
import type { Host } from '../../../models/host';

interface HostListProps {
  hosts: Host[];
  onHostSelect?: (host: Host) => void;
  onHostConnect?: (host: Host) => void;
  onAddHost?: () => void;
  onEditHost?: (host: Host) => void;
  onDeleteHost?: (host: Host) => void;
  selectedHostId?: string;
  searchQuery?: string;
  viewMode?: 'grid' | 'list';
}

export function HostList({
  hosts,
  onHostSelect,
  onHostConnect,
  onAddHost,
  onEditHost,
  onDeleteHost,
  selectedHostId,
  searchQuery = '',
  viewMode = 'grid',
}: HostListProps) {
  const filteredHosts = hosts.filter((host) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      host.label.toLowerCase().includes(query) ||
      host.hostname.toLowerCase().includes(query) ||
      (host.username && host.username.toLowerCase().includes(query)) ||
      (host.tags && host.tags.some((tag) => tag.toLowerCase().includes(query)))
    );
  });

  return (
    <div className="flex flex-col h-full bg-[#1e1e2a]">
      <div className="flex-1 overflow-y-auto p-4">
        {filteredHosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            {hosts.length === 0 ? (
              <>
                <p className="text-gray-400 mb-2">No hosts found</p>
                <p className="text-gray-500 text-sm mb-4">
                  Add your first host to get started
                </p>
                {onAddHost && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onAddHost}
                    className="border-[#2d2d3a] text-[#f97316] hover:text-[#f97316] hover:bg-[#252532]">
                    Add Host
                  </Button>
                )}
              </>
            ) : (
              <>
                <p className="text-gray-400 mb-2">No hosts match your search</p>
                <p className="text-gray-500 text-sm">
                  Try a different search term
                </p>
              </>
            )}
          </div>
        ) : (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
                : 'flex flex-col gap-2'
            }>
            {filteredHosts.map((host) => (
              <HostCard
                key={host.id}
                host={host}
                isSelected={selectedHostId === host.id}
                onClick={(hostId) => onHostSelect && onHostSelect(host)}
                onEdit={onEditHost ? (hostId) => onEditHost(host) : undefined}
                onDelete={
                  onDeleteHost ? (hostId) => onDeleteHost(host) : undefined
                }
                compact={viewMode === 'list'}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
