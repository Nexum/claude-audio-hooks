#!/usr/bin/env node
import inquirer from 'inquirer';
import { ConfigManager, HookMode, AudioHooksConfig, SoundSelection } from './config-manager.js';
import { SoundManager } from './sound-manager.js';

export interface InstallationOptions {
  mode: HookMode;
  elevenLabsApiKey?: string;
  skipPrompts?: boolean;
}

export class Installer {
  constructor() {
  }

  async promptForMode(): Promise<HookMode> {
    console.log('\n🎵 Claude Audio Hooks Installation\n');
    
    const { mode } = await inquirer.prompt([
      {
        type: 'list',
        name: 'mode',
        message: 'Choose your installation mode:',
        choices: [
          {
            name: '📢 Standard Mode - Audio notifications and completion sounds',
            value: 'standard',
            short: 'Standard'
          },
          {
            name: '🗣️ TTS Summary Mode - Audio notifications + AI-generated voice summaries (Requires ElevenLabs API key)',
            value: 'tts',
            short: 'TTS'
          }
        ]
      }
    ]);
    
    return mode;
  }

  async promptForApiKey(): Promise<string> {
    console.log('\n🔑 ElevenLabs API Key Setup\n');
    console.log('To use TTS summaries, you need an ElevenLabs API key.');
    console.log('You can get one at: https://elevenlabs.io/app/speech-synthesis');
    console.log('💡 Free tier includes 10k characters per month\n');

    const { apiKey } = await inquirer.prompt([
      {
        type: 'password',
        name: 'apiKey',
        message: 'Enter your ElevenLabs API key:',
        mask: '*',
        validate: (input: string) => {
          if (!input || input.trim() === '') {
            return 'API key cannot be empty';
          }
          if (!ConfigManager.validateElevenLabsApiKey(input.trim())) {
            return 'Invalid API key format';
          }
          return true;
        }
      }
    ]);
    
    return apiKey.trim();
  }

  async confirmInstallation(mode: HookMode, hasApiKey: boolean): Promise<boolean> {
    console.log('\n📋 Installation Summary\n');
    console.log(`Mode: ${mode === 'standard' ? '📢 Standard' : '🗣️ TTS Summary'}`);
    
    if (mode === 'tts') {
      console.log(`ElevenLabs API: ${hasApiKey ? '✅ Configured' : '❌ Not configured'}`);
      console.log('Features:');
      console.log('  • 🔔 Audio notifications for attention needed');
      console.log('  • ✅ Audio notifications for task completion');
      console.log('  • 🗣️ AI-generated voice summaries of actions');
    } else {
      console.log('Features:');
      console.log('  • 🔔 Audio notifications for attention needed');
      console.log('  • ✅ Audio notifications for task completion');
      console.log('  • 📝 Activity logging');
    }
    
    console.log('\nThis will:');
    console.log('  • Install hooks to ~/.claude/settings.json');
    if (mode === 'tts') {
      console.log('  • Configure ElevenLabs MCP server in ~/.claude.json');
    }
    console.log('  • Create logs directory at ~/.claude/logs/');
    console.log('  • Save configuration to ~/.claude/audio-hooks-config.json\n');

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Proceed with installation?',
        default: true
      }
    ]);
    
    return confirm;
  }

  async runGuidedInstallation(): Promise<AudioHooksConfig | null> {
    try {
      // Check if already installed
      const existingConfig = ConfigManager.loadConfig();
      if (existingConfig) {
        console.log('⚠️  Audio hooks are already installed.');
        console.log(`Current mode: ${existingConfig.mode}`);
        
        const { reinstall } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'reinstall',
            message: 'Would you like to reconfigure?',
            default: false
          }
        ]);
        
        if (!reinstall) {
          console.log('Installation cancelled.');
          return null;
        }
      }

      // Prompt for installation mode
      const mode = await this.promptForMode();
      let apiKey: string | undefined;

      // If TTS mode, get API key
      if (mode === 'tts') {
        apiKey = await this.promptForApiKey();
      }

      // Sound selection
      const soundManager = new SoundManager();
      const soundSelection = await soundManager.selectSoundsInteractively();

      // Confirm installation
      const confirmed = await this.confirmInstallation(mode, !!apiKey);
      if (!confirmed) {
        console.log('Installation cancelled.');
        return null;
      }

      // Create configuration
      const config = ConfigManager.createDefaultConfig(mode, apiKey, soundSelection);
      return config;

    } catch (error) {
      console.error('❌ Error during installation:', error);
      return null;
    }
  }

  async switchMode(): Promise<AudioHooksConfig | null> {
    try {
      const currentConfig = ConfigManager.loadConfig();
      if (!currentConfig) {
        console.log('❌ No existing installation found. Run install first.');
        return null;
      }

      console.log(`\n🔄 Current mode: ${currentConfig.mode}`);
      const newMode = currentConfig.mode === 'standard' ? 'tts' : 'standard';
      
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `Switch to ${newMode} mode?`,
          default: true
        }
      ]);
      
      if (!confirm) {
        console.log('Mode switch cancelled.');
        return null;
      }

      let apiKey = currentConfig.elevenLabsApiKey;
      
      // If switching to TTS and no API key exists, prompt for it
      if (newMode === 'tts' && !apiKey) {
        apiKey = await this.promptForApiKey();
      }

      const newConfig: AudioHooksConfig = {
        ...currentConfig,
        mode: newMode,
        elevenLabsApiKey: apiKey
      };

      return newConfig;

    } catch (error) {
      console.error('❌ Error during mode switch:', error);
      return null;
    }
  }

  async reconfigure(): Promise<AudioHooksConfig | null> {
    try {
      const currentConfig = ConfigManager.loadConfig();
      if (!currentConfig) {
        console.log('❌ No existing installation found. Run install first.');
        return null;
      }

      console.log('\n⚙️  Reconfigure Audio Hooks\n');
      console.log(`Current mode: ${currentConfig.mode}`);
      if (currentConfig.elevenLabsApiKey) {
        console.log('ElevenLabs API key: ✅ Configured');
      }

      const { choice } = await inquirer.prompt([
        {
          type: 'list',
          name: 'choice',
          message: 'What would you like to reconfigure?',
          choices: [
            { name: 'Change installation mode', value: 'mode' },
            { name: 'Update ElevenLabs API key', value: 'apikey' },
            { name: 'Cancel', value: 'cancel' }
          ]
        }
      ]);

      if (choice === 'mode') {
        return await this.switchMode();
      } else if (choice === 'apikey') {
        if (currentConfig.mode !== 'tts') {
          console.log('❌ ElevenLabs API key is only used in TTS mode.');
          return null;
        }
        
        const newApiKey = await this.promptForApiKey();
        const newConfig: AudioHooksConfig = {
          ...currentConfig,
          elevenLabsApiKey: newApiKey
        };
        return newConfig;
      } else if (choice === 'cancel') {
        console.log('Reconfiguration cancelled.');
        return null;
      } else {
        console.log('❌ Invalid option.');
        return null;
      }

    } catch (error) {
      console.error('❌ Error during reconfiguration:', error);
      return null;
    }
  }
}