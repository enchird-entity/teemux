import React, { useState, useEffect } from 'react';
import { ipcRenderer } from 'electron';
import { SessionTab } from './session-tab';
import type { Session } from '../../models/session';
import type { Host } from '../../models/host';

interface SessionTabsProps {
  sessions: Session[];
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onCloseSession: (sessionId: string) => void;
}

export function SessionTabs({
  sessions,
  activeSessionId,
  onSelectSession,
  onCloseSession,
}: SessionTabsProps) {
  const [hostInfo, setHostInfo] = useState<
    Record<string, { label: string; hostname: string }>
  >({});

  // Load host information for all sessions
  useEffect(() => {
    const loadHostInfo = async () => {
      const info: Record<string, { label: string; hostname: string }> = {};

      for (const session of sessions) {
        try {
          const host = (await ipcRenderer.invoke(
            'hosts:getById',
            session.hostId
          )) as Host;
          if (host) {
            info[session.id] = {
              label: host.label,
              hostname: `${host.username}@${host.hostname}:${host.port || 22}`,
            };
          }
        } catch (error) {
          console.error(
            `Failed to load host info for session ${session.id}:`,
            error
          );
        }
      }

      setHostInfo(info);
    };

    loadHostInfo();
  }, [sessions]);

  if (sessions.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 px-2 overflow-x-auto">
      {sessions.map((session) => {
        const info = hostInfo[session.id] || {
          label: 'Unknown',
          hostname: 'Unknown',
        };

        return (
          <SessionTab
            key={session.id}
            session={session}
            isActive={session.id === activeSessionId}
            hostLabel={info.label}
            hostAddress={info.hostname}
            onClick={() => onSelectSession(session.id)}
            onClose={() => onCloseSession(session.id)}
          />
        );
      })}
    </div>
  );
}
