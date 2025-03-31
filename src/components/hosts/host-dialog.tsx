import React from 'react';
import { Dialog, DialogContent, DialogOverlay } from '../ui/dialog';
import { HostForm } from './host-form';
import type { Host } from '../../../models/host';

interface HostDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (host: Partial<Host>) => void;
  host?: Host;
}

export function HostDialog({ isOpen, onClose, onSave, host }: HostDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogOverlay className="bg-black/50" />
      <DialogContent className="p-0 border-none bg-transparent shadow-xl max-w-md mx-auto">
        <HostForm host={host} onSubmit={onSave} onCancel={onClose} />
      </DialogContent>
    </Dialog>
  );
}
