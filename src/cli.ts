#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { Command } from 'commander';
import { Installer } from './installer.js';
import { ConfigManager, HookMode } from './config-manager.js';
import { SoundManager } from './sound-manager.js';
import { getEventSoundPath } from './utils.js';

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
    
    // Play the configured completion sound
    await playCompletionSound();
    
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
    
    // Play the configured completion sound
    await playCompletionSound();
    
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
    
    // Play the configured completion sound
    await playCompletionSound();
    
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

async function playCompletionSound(): Promise<void> {
  try {
    const { exec } = await import('child_process');
    const { getPlatform } = await import('./utils.js');
    
    // Get the configured completion sound from user's config
    const config = ConfigManager.loadConfig();
    if (!config) return;
    
    const soundManager = new SoundManager();
    const selectedSoundId = config.soundSelection?.completion || 'complete';
    const selectedSound = soundManager.getSoundById(selectedSoundId);
    
    if (!selectedSound || !selectedSound.file) {
      // Silent mode, don't play anything
      return;
    }
    
    const soundFile = getEventSoundPath(selectedSound.file, 'completion');
    const os_platform = getPlatform();
    
    if (!existsSync(soundFile)) {
      // Sound file doesn't exist, skip quietly
      return;
    }
    
    let cmd: string;
    if (os_platform === "darwin") {
      cmd = `afplay -v 0.5 "${soundFile}"`;
    } else if (os_platform === "win32") {
      cmd = `powershell -c "(New-Object Media.SoundPlayer '${soundFile}').PlaySync()"`;
    } else {
      // Linux - try multiple players at 50% volume for MP3
      cmd = `mpg123 -q --gain 50 "${soundFile}" 2>/dev/null || paplay --volume=32767 "${soundFile}" 2>/dev/null || play "${soundFile}" -v 0.5 2>/dev/null`;
    }
    
    exec(cmd, (err) => {
      if (err) {
        // Fail silently for sound issues
        console.log('🎵 Installation complete!');
      }
    });
  } catch (error) {
    // Fail silently if sound playback fails
  }
}

// Main CLI setup with commander
const program = new Command();

program
  .name('claude-audio-hooks')
  .description('🎵 Cross-platform audio hooks for Claude Code with notifications and terminal management')
  .version('1.0.3');

program
  .command('install')
  .description('Guided installation with mode selection')
  .action(async () => {
    try {
      await installHooks();
    } catch (error) {
      console.error('❌ Installation failed:', error);
      process.exit(1);
    }
  });

program
  .command('uninstall')
  .description('Remove all hooks and configuration')
  .action(() => {
    try {
      uninstallHooks();
    } catch (error) {
      console.error('❌ Uninstallation failed:', error);
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Show current installation status')
  .action(() => {
    try {
      showStatus();
    } catch (error) {
      console.error('❌ Status check failed:', error);
      process.exit(1);
    }
  });

program
  .command('configure')
  .description('Change settings (API keys, sound selections, etc.)')
  .action(async () => {
    try {
      await configureHooks();
    } catch (error) {
      console.error('❌ Configuration failed:', error);
      process.exit(1);
    }
  });

program
  .command('switch-mode')
  .description('Toggle between Standard and TTS modes')
  .action(async () => {
    try {
      await switchMode();
    } catch (error) {
      console.error('❌ Mode switch failed:', error);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();