import React from 'react';
import { HostDialog } from './host-dialog';
import type { Host } from '../../../models/host';

interface NewHostDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddHost: (host: Partial<Host>) => void;
}

export function NewHostDialog({
  isOpen,
  onClose,
  onAddHost,
}: NewHostDialogProps) {
  return <HostDialog isOpen={isOpen} onClose={onClose} onSave={onAddHost} />;
}
