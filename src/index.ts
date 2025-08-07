// Main exports for the package
export { StatusType, StatusConfig, STATUS_CONFIGS, setTerminalStatus, clearTerminalStatus } from './status-manager.js';
export { logEvent, getLogsDir, ensureLogsDir, getSoundPath, getPlatform, isWSL } from './utils.js';