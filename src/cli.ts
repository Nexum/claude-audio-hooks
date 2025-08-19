#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { Installer } from './installer.js';
import { ConfigManager, HookMode } from './config-manager.js';

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

function getHookCommands(mode: HookMode = 'standard'): { [key: string]: string } {
  const distPath = resolve(__dirname);
  
  if (mode === 'tts') {
    return {
      PreToolUse: `node "${join(distPath, 'working.js')}"`,
      Notification: `node "${join(distPath, 'tts-summary.js')}" notification`,
      Stop: `node "${join(distPath, 'tts-summary.js')}" stop`
    };
  }
  
  return {
    PreToolUse: `node "${join(distPath, 'working.js')}"`,
    Notification: `node "${join(distPath, 'notification.js')}" --notify`,
    Stop: `node "${join(distPath, 'stop.js')}" --chat`
  };
}

async function installHooks(): Promise<void> {
  try {
    // Run guided installation
    const installer = new Installer();
    const config = await installer.runGuidedInstallation();
    
    if (!config) {
      console.log('Installation cancelled.');
      process.exit(0);
      return;
    }
    
    // Save configuration
    ConfigManager.saveConfig(config);
    
    // Configure ElevenLabs MCP if TTS mode
    if (config.mode === 'tts' && config.elevenLabsApiKey) {
      ConfigManager.configureElevenLabsMcp(config.elevenLabsApiKey);
      console.log('✅ ElevenLabs MCP server configured');
    }
    
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
    
    const hookCommands = getHookCommands(config.mode);
    
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
    
    console.log('\n✅ Claude Code hooks installed successfully!');
    console.log(`\nInstalled in ${config.mode} mode:`);
    
    if (config.mode === 'tts') {
      console.log('  ⚡ PreToolUse - Logs tool usage activity');
      console.log('  🗣️ Notification - AI-generated TTS summaries');
      console.log('  🗣️ Stop - AI-generated TTS summaries');
      console.log('  🎙️ ElevenLabs TTS - Powered by ElevenLabs API');
    } else {
      console.log('  ⚡ PreToolUse - Logs tool usage activity');
      console.log('  🔔 Notification - System notifications with sound');
      console.log('  ✅ Stop - Task completion with sound');
    }
    
    console.log('\n📝 Configuration saved to ~/.claude/audio-hooks-config.json');
    if (config.mode === 'tts') {
      console.log('🔧 ElevenLabs MCP configured in ~/.claude.json');
      console.log('\n💡 Restart Claude Code to activate the TTS features');
    }
    
  } catch (error) {
    console.error('❌ Failed to install hooks:', error);
    process.exit(1);
  }
}

function uninstallHooks(): void {
  try {
    console.log('Uninstalling Claude Code hooks...');
    
    // Check if hooks are installed
    const config = ConfigManager.loadConfig();
    if (!config) {
      console.log('No hooks installation found.');
      return;
    }
    
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
    
    // Remove ElevenLabs MCP configuration if it was in TTS mode
    if (config.mode === 'tts') {
      ConfigManager.removeElevenLabsMcp();
      console.log('✅ ElevenLabs MCP server configuration removed');
    }
    
    // Remove configuration file
    ConfigManager.removeConfig();
    
    console.log('✅ Claude Code hooks uninstalled successfully!');
    
  } catch (error) {
    console.error('❌ Failed to uninstall hooks:', error);
    process.exit(1);
  }
}

function showStatus(): void {
  try {
    const config = ConfigManager.loadConfig();
    const settings = loadSettings();
    
    console.log('🎵 Claude Audio Hooks Status\n');
    
    if (!config) {
      console.log('❌ No audio hooks installation found');
      console.log('\nRun `npx claude-audio-hooks install` to set up audio hooks');
      return;
    }
    
    console.log(`📋 Installation Details:`);
    console.log(`   Mode: ${config.mode === 'tts' ? '🗣️ TTS Summary' : '📢 Standard'}`);
    console.log(`   Installed: ${new Date(config.installedAt).toLocaleDateString()}`);
    console.log(`   Version: ${config.version}`);
    
    if (config.mode === 'tts') {
      console.log(`   ElevenLabs API: ${config.elevenLabsApiKey ? '✅ Configured' : '❌ Not configured'}`);
      
      // Check MCP server configuration
      const claudeConfig = ConfigManager.loadClaudeConfig();
      const mcpConfigured = claudeConfig.mcpServers?.elevenlabs ? '✅' : '❌';
      console.log(`   MCP Server: ${mcpConfigured} ${mcpConfigured === '✅' ? 'Configured' : 'Not configured'}`);
    }
    
    console.log('\n🔧 Hook Status:');
    
    if (!settings.hooks) {
      console.log('❌ No hooks configuration found in Claude settings');
      return;
    }
    
    const hookTypes = ['PreToolUse', 'Notification', 'Stop'];
    
    hookTypes.forEach(hookType => {
      // @ts-ignore
      const hooks = settings.hooks[hookType];
      
      if (hooks && hooks.length > 0) {
        const actualCommand = hooks[0]?.hooks?.[0]?.command;
        const isInstalled = actualCommand?.includes('claude-audio-hooks') || actualCommand?.includes('working.js') || actualCommand?.includes('notification.js') || actualCommand?.includes('stop.js');
        
        let description = '';
        if (hookType === 'PreToolUse') description = 'Tool usage logging';
        else if (hookType === 'Notification') description = config.mode === 'tts' ? 'TTS summaries' : 'Sound notifications';
        else if (hookType === 'Stop') description = config.mode === 'tts' ? 'TTS summaries' : 'Sound completion';
        
        console.log(`   ${isInstalled ? '✅' : '⚠️'} ${hookType}: ${description}`);
      } else {
        console.log(`   ❌ ${hookType}: Not configured`);
      }
    });
    
    console.log('\n💡 Commands:');
    console.log('   npx claude-audio-hooks configure     - Change settings');
    console.log('   npx claude-audio-hooks switch-mode   - Toggle between modes');
    console.log('   npx claude-audio-hooks uninstall     - Remove hooks');
    
  } catch (error) {
    console.error('❌ Failed to check status:', error);
    process.exit(1);
  }
}

async function configureHooks(): Promise<void> {
  try {
    const installer = new Installer();
    const config = await installer.reconfigure();
    
    if (!config) {
      return;
    }
    
    // Save new configuration
    ConfigManager.saveConfig(config);
    
    // Update MCP configuration if needed
    if (config.mode === 'tts' && config.elevenLabsApiKey) {
      ConfigManager.configureElevenLabsMcp(config.elevenLabsApiKey);
    } else if (config.mode === 'standard') {
      ConfigManager.removeElevenLabsMcp();
    }
    
    // Reinstall hooks with new configuration
    await reinstallHooks(config.mode);
    
    console.log(`\n✅ Configuration updated to ${config.mode} mode!`);
    if (config.mode === 'tts') {
      console.log('💡 Restart Claude Code to activate TTS features');
    }
    
  } catch (error) {
    console.error('❌ Failed to configure hooks:', error);
    process.exit(1);
  }
}

async function switchMode(): Promise<void> {
  try {
    const installer = new Installer();
    const config = await installer.switchMode();
    
    if (!config) {
      return;
    }
    
    // Save new configuration
    ConfigManager.saveConfig(config);
    
    // Update MCP configuration if needed
    if (config.mode === 'tts' && config.elevenLabsApiKey) {
      ConfigManager.configureElevenLabsMcp(config.elevenLabsApiKey);
    } else if (config.mode === 'standard') {
      ConfigManager.removeElevenLabsMcp();
    }
    
    // Reinstall hooks with new mode
    await reinstallHooks(config.mode);
    
    console.log(`\n✅ Switched to ${config.mode} mode!`);
    if (config.mode === 'tts') {
      console.log('💡 Restart Claude Code to activate TTS features');
    }
    
  } catch (error) {
    console.error('❌ Failed to switch mode:', error);
    process.exit(1);
  }
}

async function reinstallHooks(mode: HookMode): Promise<void> {
  const settings = loadSettings();
  const hookCommands = getHookCommands(mode);
  
  // Remove existing hooks
  delete settings.hooks?.PreToolUse;
  delete settings.hooks?.Notification;
  delete settings.hooks?.Stop;
  
  // Install new hooks
  Object.entries(hookCommands).forEach(([hookType, command]) => {
    const hookConfig: HookConfig = {
      matcher: "",
      hooks: [{
        type: "command",
        command: command
      }]
    };
    
    if (!settings.hooks) {
      settings.hooks = {};
    }
    
    // @ts-ignore
    settings.hooks[hookType] = [hookConfig];
  });
  
  saveSettings(settings);
}

function showHelp(): void {
  console.log(`
🎵 Claude Audio Hooks CLI

Usage: npx claude-audio-hooks <command>

Commands:
  install       Guided installation with mode selection
  uninstall     Remove all hooks and configuration
  status        Show current installation status
  configure     Change settings (API keys, etc.)
  switch-mode   Toggle between Standard and TTS modes
  help          Show this help message

Installation Modes:
  📢 Standard   - Audio notifications and completion sounds
  🗣️ TTS       - AI-generated voice summaries (requires ElevenLabs API key)

Examples:
  npx claude-audio-hooks install      # Interactive installation
  npx claude-audio-hooks status       # Check current setup
  npx claude-audio-hooks switch-mode  # Toggle between modes
  npx claude-audio-hooks uninstall    # Remove everything
  `);
}

// Main CLI logic
async function main() {
  const command = process.argv[2];

  switch (command) {
    case 'install':
      await installHooks();
      break;
    case 'uninstall':
      uninstallHooks();
      break;
    case 'status':
      showStatus();
      break;
    case 'configure':
      await configureHooks();
      break;
    case 'switch-mode':
      await switchMode();
      break;
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
    default:
      if (command) {
        console.error(`❌ Unknown command: ${command}`);
        console.log('\nRun `npx claude-audio-hooks help` to see available commands.\n');
      } else {
        showHelp();
      }
      process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});