#!/usr/bin/env node

import * as path from 'path';

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

// Animation states for working status
const WORKING_ANIMATIONS = ['⚡', '💫', '✨', '🔥', '💥'];
const LOADING_DOTS = ['', '.', '..', '...'];
let animationInterval: NodeJS.Timeout | null = null;
let currentFrame = 0;

export function setTerminalStatus(status: StatusType, customMessage?: string) {
  const config = STATUS_CONFIGS[status];
  const message = customMessage || config.message;
  
  // Stop any existing animation
  stopAnimation();
  
  // Get current folder name
  const currentFolder = path.basename(process.cwd());
  
  // For working status, start animation
  if (status === 'working') {
    startWorkingAnimation(currentFolder, message);
  } else {
    // Set static terminal title for non-working statuses
    process.stdout.write(`\x1b]0;${currentFolder} ${config.emoji} Claude - ${message}\x1b\\`);
  }
  
  // Optional: Also log to console with color (can be disabled)
  if (process.argv.includes('--verbose')) {
    console.log(`${config.color}${config.emoji} ${message}\x1b[0m`);
  }
}

function startWorkingAnimation(folder: string, message: string) {
  currentFrame = 0;
  animationInterval = setInterval(() => {
    const emoji = WORKING_ANIMATIONS[currentFrame % WORKING_ANIMATIONS.length];
    const dots = LOADING_DOTS[Math.floor(currentFrame / 2) % LOADING_DOTS.length];
    const animatedMessage = `Working${dots}`;
    
    process.stdout.write(`\x1b]0;${folder} ${emoji} Claude - ${animatedMessage}\x1b\\`);
    currentFrame++;
  }, 500); // Update every 500ms for smooth animation
}

function stopAnimation() {
  if (animationInterval) {
    clearInterval(animationInterval);
    animationInterval = null;
  }
}

export function clearTerminalStatus() {
  // Stop any running animation
  stopAnimation();
  
  // Get current folder name
  const currentFolder = path.basename(process.cwd());
  
  // Reset to default terminal title with folder
  process.stdout.write(`\x1b]0;${currentFolder} Claude Code\x1b\\`);
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