import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ConnectionErrorToastProps {
  hostLabel: string;
  errorMessage: string;
}

export const ConnectionErrorToast: React.FC<ConnectionErrorToastProps> = ({
  hostLabel,
  errorMessage,
}) => {
  return (
    <div className="flex items-start space-x-2">
      <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-medium">Failed to connect to {hostLabel}</p>
        <p className="text-sm text-muted-foreground mt-1">{errorMessage}</p>
        <p className="text-xs text-muted-foreground mt-2">
          Check connection details in the error panel
        </p>
      </div>
    </div>
  );
};
