import React, { useState, useEffect } from 'react';
import { ipcRenderer } from 'electron';
import { Server, ChevronDown, Share2, Key } from 'lucide-react';
import { Button } from '../ui/button';
import type { Host } from '../../../models/host';

interface HostDetailsProps {
  hostId: string | null;
  onConnect: (hostId: string) => void;
}

export function HostDetails({ hostId, onConnect }: HostDetailsProps) {
  const [host, setHost] = useState<Host | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!hostId) {
      setHost(null);
      return;
    }

    setIsLoading(true);
    ipcRenderer
      .invoke('hosts:getById', hostId)
      .then((result: Host) => {
        setHost(result);
      })
      .catch((error) => {
        console.error('Failed to fetch host details:', error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [hostId]);

  if (!hostId || !host) {
    return (
      <div className="w-80 bg-[#1a1a24] border-l border-[#2d2d3a] p-4 flex flex-col items-center justify-center text-gray-400">
        <Server className="w-12 h-12 mb-4" />
        <p className="text-center">Select a host to view details</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-80 bg-[#1a1a24] border-l border-[#2d2d3a] p-4 flex flex-col items-center justify-center">
        <p className="text-white">Loading...</p>
      </div>
    );
  }

  return (
    <div className="w-80 bg-[#1a1a24] border-l border-[#2d2d3a] flex flex-col h-full overflow-auto">
      <div className="p-4 border-b border-[#2d2d3a] flex items-center justify-between">
        <h2 className="text-white font-medium">Host Details</h2>
        <div className="flex items-center gap-2">
          <button className="text-gray-400 hover:text-white">
            <ChevronDown className="w-5 h-5" />
          </button>
          <button className="text-gray-400 hover:text-white">
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="p-4 border-b border-[#2d2d3a]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-md bg-[#f97316] flex items-center justify-center">
            <Server className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-white font-medium">{host.label}</h3>
            <p className="text-xs text-gray-400">Personal vault</p>
          </div>
        </div>

        <Button
          onClick={() => onConnect(host.id)}
          className="w-full bg-[#f97316] hover:bg-[#ea580c] text-white mt-2">
          Connect
        </Button>
      </div>

      <div className="p-4 border-b border-[#2d2d3a]">
        <h3 className="text-sm text-gray-400 mb-3">Address</h3>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-md bg-[#f97316] flex items-center justify-center">
            <Server className="w-4 h-4 text-white" />
          </div>
          <input
            type="text"
            value={host.hostname}
            readOnly
            className="flex-1 bg-[#252532] border border-[#2d2d3a] rounded text-white text-sm px-3 py-2"
          />
        </div>
      </div>

      <div className="p-4 border-b border-[#2d2d3a]">
        <h3 className="text-sm text-gray-400 mb-3">General</h3>
        <input
          type="text"
          value={host.label}
          readOnly
          className="w-full bg-[#252532] border border-[#2d2d3a] rounded text-white text-sm px-3 py-2 mb-2"
        />

        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-md bg-[#252532] border border-[#2d2d3a] flex items-center justify-center">
            <span className="text-white text-xs">kn</span>
          </div>
          <input
            type="text"
            value="Parent Group"
            readOnly
            className="flex-1 bg-[#252532] border border-[#2d2d3a] rounded text-white text-sm px-3 py-2"
          />
        </div>
      </div>

      <div className="p-4 border-b border-[#2d2d3a]">
        <h3 className="text-sm text-gray-400 mb-3">
          SSH on <span className="text-white">22</span> port
        </h3>

        <div className="mb-3">
          <p className="text-sm text-gray-400 mb-1">
            Credentials from <span className="text-white">Personal vault</span>
          </p>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-[#252532] border border-[#2d2d3a] flex items-center justify-center">
              <Key className="w-4 h-4 text-white" />
            </div>
            <input
              type="text"
              value={host.username || 'username'}
              readOnly
              className="flex-1 bg-[#252532] border border-[#2d2d3a] rounded text-white text-sm px-3 py-2"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-[#252532] border border-[#2d2d3a] flex items-center justify-center">
            <Key className="w-4 h-4 text-white" />
          </div>
          <input
            type="password"
            value="••••••••••••"
            readOnly
            className="flex-1 bg-[#252532] border border-[#2d2d3a] rounded text-white text-sm px-3 py-2"
          />
        </div>
      </div>

      <div className="p-4">
        <Button className="w-full text-green-500 border border-green-500 bg-transparent hover:bg-green-500/10">
          <Share2 className="w-4 h-4 mr-2" />
          Share this host
        </Button>
      </div>
    </div>
  );
}
