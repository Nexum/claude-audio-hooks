#!/usr/bin/env node

export interface StatusConfig {
  emoji: string;
  message: string;
  color?: string;
}

export const STATUS_CONFIGS = {
  working: {
    emoji: '⚡',
    message: 'Claude is working...',
    color: '\x1b[33m' // Yellow
  },
  attention: {
    emoji: '🔔',
    message: 'Attention required',
    color: '\x1b[31m' // Red
  },
  completed: {
    emoji: '✅',
    message: 'Task completed',
    color: '\x1b[32m' // Green
  },
  error: {
    emoji: '❌',
    message: 'Error occurred',
    color: '\x1b[31m' // Red
  },
  idle: {
    emoji: '💤',
    message: 'Claude is idle',
    color: '\x1b[37m' // White/Default
  }
} as const;

export type StatusType = keyof typeof STATUS_CONFIGS;

export function setTerminalStatus(status: StatusType, customMessage?: string) {
  const config = STATUS_CONFIGS[status];
  const message = customMessage || config.message;
  
  // Debug logging to stderr (won't interfere with hook output)
  if (process.env.DEBUG_HOOKS) {
    process.stderr.write(`[DEBUG] Setting terminal status: ${status} - ${message}\n`);
  }
  
  // Optional: Log to console with color (can be enabled with --verbose)
  if (process.argv.includes('--verbose')) {
    console.log(`${config.color}${config.emoji} ${message}\x1b[0m`);
  }
}

export function clearTerminalStatus() {
  // No-op - let Claude handle terminal titles
}

// CLI usage when called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const statusArg = process.argv[2] as StatusType;
  const customMessage = process.argv[3];
  
  if (statusArg && statusArg in STATUS_CONFIGS) {
    setTerminalStatus(statusArg, customMessage);
  } else {
    console.log('Usage: status-manager.ts <status> [custom-message]');
    console.log('Available statuses:', Object.keys(STATUS_CONFIGS).join(', '));
  }
}