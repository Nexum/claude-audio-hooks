#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface HookConfig {
  matcher: string;
  hooks: Array<{
    type: string;
    command: string;
  }>;
}

interface ClaudeSettings {
  hooks?: {
    PreToolUse?: HookConfig[];
    Notification?: HookConfig[];
    Stop?: HookConfig[];
    SubagentStop?: HookConfig[];
  };
  [key: string]: any;
}

const CLAUDE_SETTINGS_PATH = join(process.env.HOME || process.cwd(), '.claude', 'settings.json');
const CLAUDE_LOGS_DIR = join(process.env.HOME || process.cwd(), '.claude', 'logs');

function loadSettings(): ClaudeSettings {
  if (!existsSync(CLAUDE_SETTINGS_PATH)) {
    throw new Error(`Claude settings file not found at: ${CLAUDE_SETTINGS_PATH}`);
  }
  
  try {
    return JSON.parse(readFileSync(CLAUDE_SETTINGS_PATH, 'utf8'));
  } catch (error) {
    throw new Error(`Failed to parse Claude settings: ${error}`);
  }
}

function saveSettings(settings: ClaudeSettings): void {
  writeFileSync(CLAUDE_SETTINGS_PATH, JSON.stringify(settings, null, 2));
}

function getHookCommands(): { [key: string]: string } {
  const distPath = resolve(__dirname);
  
  return {
    PreToolUse: `node "${join(distPath, 'working.js')}"`,
    Notification: `node "${join(distPath, 'notification.js')}" --notify`,
    Stop: `node "${join(distPath, 'stop.js')}" --chat`
  };
}

function installHooks(): void {
  try {
    console.log('Installing Claude Code hooks...');
    
    // Ensure logs directory exists
    if (!existsSync(CLAUDE_LOGS_DIR)) {
      mkdirSync(CLAUDE_LOGS_DIR, { recursive: true });
    }
    
    // Load current settings
    const settings = loadSettings();
    
    // Initialize hooks object if it doesn't exist
    if (!settings.hooks) {
      settings.hooks = {};
    }
    
    const hookCommands = getHookCommands();
    
    // Install each hook type
    Object.entries(hookCommands).forEach(([hookType, command]) => {
      const hookConfig: HookConfig = {
        matcher: "",
        hooks: [{
          type: "command",
          command: command
        }]
      };
      
      // @ts-ignore - We know these are valid hook types
      settings.hooks[hookType] = [hookConfig];
    });
    
    // Ensure SubagentStop exists (empty by default)
    if (!settings.hooks.SubagentStop) {
      settings.hooks.SubagentStop = [{
        matcher: "",
        hooks: []
      }];
    }
    
    // Save updated settings
    saveSettings(settings);
    
    console.log('✅ Claude Code hooks installed successfully!');
    console.log('\\nHooks installed:');
    console.log('  ⚡ PreToolUse - Logs tool usage activity');
    console.log('  🔔 Notification - System notifications with sound');
    console.log('  ✅ Stop - Task completion with sound');
    
  } catch (error) {
    console.error('❌ Failed to install hooks:', error);
    process.exit(1);
  }
}

function uninstallHooks(): void {
  try {
    console.log('Uninstalling Claude Code hooks...');
    
    const settings = loadSettings();
    
    if (!settings.hooks) {
      console.log('No hooks found to uninstall.');
      return;
    }
    
    // Remove hook configurations
    delete settings.hooks.PreToolUse;
    delete settings.hooks.Notification;
    delete settings.hooks.Stop;
    
    // Save updated settings
    saveSettings(settings);
    
    console.log('✅ Claude Code hooks uninstalled successfully!');
    
  } catch (error) {
    console.error('❌ Failed to uninstall hooks:', error);
    process.exit(1);
  }
}

function showStatus(): void {
  try {
    const settings = loadSettings();
    
    console.log('Claude Code Hooks Status:\\n');
    
    if (!settings.hooks) {
      console.log('❌ No hooks configuration found');
      return;
    }
    
    const hookTypes = ['PreToolUse', 'Notification', 'Stop'];
    
    hookTypes.forEach(hookType => {
      // @ts-ignore
      const hooks = settings.hooks[hookType];
      
      if (hooks && hooks.length > 0) {
        const actualCommand = hooks[0]?.hooks?.[0]?.command;
        const isInstalled = actualCommand?.includes('claude-audio-hooks') || actualCommand?.includes(hookType.toLowerCase());
        console.log(`${isInstalled ? '✅' : '⚠️'} ${hookType}: ${isInstalled ? 'Installed' : 'Different hook detected'}`);
      } else {
        console.log(`❌ ${hookType}: Not installed`);
      }
    });
    
  } catch (error) {
    console.error('❌ Failed to check status:', error);
    process.exit(1);
  }
}

function showHelp(): void {
  console.log(`
Claude Audio Hooks CLI

Usage: npx claude-audio-hooks <command>

Commands:
  install     Install hooks to Claude Code settings
  uninstall   Remove hooks from Claude Code settings
  status      Show current hook installation status
  help        Show this help message

Examples:
  npx claude-audio-hooks install
  npx claude-audio-hooks status
  npx claude-audio-hooks uninstall
  `);
}

// Main CLI logic
const command = process.argv[2];

switch (command) {
  case 'install':
    installHooks();
    break;
  case 'uninstall':
    uninstallHooks();
    break;
  case 'status':
    showStatus();
    break;
  case 'help':
  case '--help':
  case '-h':
    showHelp();
    break;
  default:
    if (command) {
      console.error(`Unknown command: ${command}`);
    }
    showHelp();
    process.exit(1);
}