// Main exports for the package
export { StatusType, StatusConfig, STATUS_CONFIGS, setTerminalStatus, clearTerminalStatus } from './status-manager.js';
export { logEvent, getLogsDir, ensureLogsDir, getSoundPath, getPlatform, isWSL, createReadline } from './utils.js';
export { ConfigManager, HookMode, AudioHooksConfig, ClaudeConfig } from './config-manager.js';
export { Installer, InstallationOptions } from './installer.js';