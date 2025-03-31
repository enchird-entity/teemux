import React from 'react';
import { X, Server } from 'lucide-react';
import type { Session } from '../../models/session';

interface SessionTabProps {
  session: Session;
  isActive: boolean;
  hostLabel: string;
  hostAddress: string;
  onClick: () => void;
  onClose: () => void;
}

export function SessionTab({
  session,
  isActive,
  hostLabel,
  hostAddress,
  onClick,
  onClose,
}: SessionTabProps) {
  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  };

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-t-md cursor-pointer transition-colors ${
        isActive
          ? 'bg-[#1a1a24] text-white'
          : 'bg-[#121218] text-gray-400 hover:bg-[#1a1a24]/70'
      }`}
      onClick={onClick}>
      <Server className="w-4 h-4" />
      <span className="truncate max-w-[120px]">{hostLabel || hostAddress}</span>
      <button
        className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-[#252532] transition-colors"
        onClick={handleClose}>
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
