// src/shared/ipc-channels.ts
export const IpcChannels = {
  // Host related channels
  HOST_GET_ALL: 'hosts:getAll',
  HOST_GET_BY_ID: 'hosts:getById',
  HOST_ADD: 'hosts:add',
  HOST_UPDATE: 'hosts:update',
  HOST_DELETE: 'hosts:delete',

  // Session related channels
  SESSION_START: 'session:start',
  SESSION_END: 'session:end',
  SESSION_DATA: 'session:data',
  SESSION_RESIZE: 'session:resize',
  SESSION_GET_ALL: 'sessions:getAll',

  // Session history related channels
  SESSION_HISTORY_GET_ALL: 'sessionHistory:getAll',
  SESSION_HISTORY_SEARCH: 'sessionHistory:search',
  SESSION_HISTORY_CLEAR: 'sessionHistory:clear',

  // Snippet related channels
  SNIPPET_GET_ALL: 'snippets:getAll',
  SNIPPET_ADD: 'snippets:add',
  SNIPPET_UPDATE: 'snippets:update',
  SNIPPET_DELETE: 'snippets:delete',
  SNIPPET_RUN: 'snippets:run',

  // Settings related channels
  SETTINGS_GET: 'settings:get',
  SETTINGS_UPDATE: 'settings:update',

  // SSH related channels
  SSH_CONNECT: 'ssh:connect',
  SSH_DISCONNECT: 'ssh:disconnect',
  SSH_SEND_DATA: 'ssh:sendData',

  // SFTP related channels
  SFTP_LIST_FILES: 'sftp:listFiles',
  SFTP_DOWNLOAD: 'sftp:download',
  SFTP_UPLOAD: 'sftp:upload',

  // SSH Key related channels
  KEY_GENERATE: 'key:generate',
  KEY_LIST: 'key:list',
  KEY_DELETE: 'key:delete',

  // App related channels
  APP_QUIT: 'app:quit',
  APP_MINIMIZE: 'app:minimize',
  APP_MAXIMIZE: 'app:maximize',
};
