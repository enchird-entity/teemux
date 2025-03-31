import React from 'react';
import { Button } from '../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { MenuIcon, Settings, Plus, Terminal, Cloud, Key } from 'lucide-react';
import type { Session } from '../../models/session';
import { SessionTabs } from './session-tabs';

interface HeaderProps {
  toggleSidebar: () => void;
  activeSessions: Session[];
  activeTab: string | null;
  onTabChange: (sessionId: string) => void;
  onCloseTab: (sessionId: string) => void;
  onNewHost: () => void;
  onOpenSettings: () => void;
}

export function Header({
  toggleSidebar,
  activeSessions,
  activeTab,
  onTabChange,
  onCloseTab,
  onNewHost,
  onOpenSettings,
}: HeaderProps) {
  return (
    <div>
      <div className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:h-[60px]">
        <Button variant="ghost" size="icon" onClick={toggleSidebar}>
          <MenuIcon className="h-5 w-5" />
        </Button>
        <div className="font-semibold">Teemux</div>
        <div className="flex-1">
          <SessionTabs
            sessions={activeSessions}
            activeSessionId={activeTab}
            onSelectSession={onTabChange}
            onCloseSession={onCloseTab}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onNewHost}>
            <Plus className="mr-2 h-4 w-4" />
            New Host
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Settings</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onOpenSettings}>
                <Settings className="mr-2 h-4 w-4" />
                Preferences
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Key className="mr-2 h-4 w-4" />
                SSH Keys
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Cloud className="mr-2 h-4 w-4" />
                Cloud Sync
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
