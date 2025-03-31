// Host related channels
pub const HOST_GET_ALL: &str = "hosts:getAll";
pub const HOST_GET_BY_ID: &str = "hosts:getById";
pub const HOST_ADD: &str = "hosts:add";
pub const HOST_UPDATE: &str = "hosts:update";
pub const HOST_DELETE: &str = "hosts:delete";

// Session related channels
pub const SESSION_START: &str = "session:start";
pub const SESSION_END: &str = "session:end";
pub const SESSION_DATA: &str = "session:data";
pub const SESSION_RESIZE: &str = "session:resize";
pub const SESSION_GET_ALL: &str = "sessions:getAll";

// Session history related channels
pub const SESSION_HISTORY_GET_ALL: &str = "sessionHistory:getAll";
pub const SESSION_HISTORY_SEARCH: &str = "sessionHistory:search";
pub const SESSION_HISTORY_CLEAR: &str = "sessionHistory:clear";

// Snippet related channels
pub const SNIPPET_GET_ALL: &str = "snippets:getAll";
pub const SNIPPET_ADD: &str = "snippets:add";
pub const SNIPPET_UPDATE: &str = "snippets:update";
pub const SNIPPET_DELETE: &str = "snippets:delete";
pub const SNIPPET_RUN: &str = "snippets:run";

// Settings related channels
pub const SETTINGS_GET: &str = "settings:get";
pub const SETTINGS_UPDATE: &str = "settings:update";

// SSH related channels
pub const SSH_CONNECT: &str = "ssh:connect";
pub const SSH_DISCONNECT: &str = "ssh:disconnect";
pub const SSH_SEND_DATA: &str = "ssh:sendData";

// SFTP related channels
pub const SFTP_LIST_FILES: &str = "sftp:listFiles";
pub const SFTP_DOWNLOAD: &str = "sftp:download";
pub const SFTP_UPLOAD: &str = "sftp:upload";

// SSH Key related channels
pub const KEY_GENERATE: &str = "key:generate";
pub const KEY_LIST: &str = "key:list";
pub const KEY_DELETE: &str = "key:delete";

// App related channels
pub const APP_QUIT: &str = "app:quit";
pub const APP_MINIMIZE: &str = "app:minimize";
pub const APP_MAXIMIZE: &str = "app:maximize"; 