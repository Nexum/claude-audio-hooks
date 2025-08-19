#!/usr/bin/env node
import { createReadline } from './utils.js';
import { ConfigManager, HookMode, AudioHooksConfig } from './config-manager.js';

export interface InstallationOptions {
  mode: HookMode;
  elevenLabsApiKey?: string;
  skipPrompts?: boolean;
}

export class Installer {
  private rl: any;

  constructor() {
    this.rl = createReadline();
  }

  async promptForMode(): Promise<HookMode> {
    console.log('\n🎵 Claude Audio Hooks Installation\n');
    console.log('Choose your installation mode:\n');
    console.log('1. 📢 Standard Mode - Audio notifications and completion sounds');
    console.log('2. 🗣️  TTS Summary Mode - Audio notifications + AI-generated voice summaries');
    console.log('   (Requires ElevenLabs API key)\n');

    while (true) {
      const choice = await this.question('Select mode (1 or 2): ');
      
      if (choice.trim() === '1') {
        return 'standard';
      } else if (choice.trim() === '2') {
        return 'tts';
      } else {
        console.log('❌ Please enter 1 or 2');
      }
    }
  }

  async promptForApiKey(): Promise<string> {
    console.log('\n🔑 ElevenLabs API Key Setup\n');
    console.log('To use TTS summaries, you need an ElevenLabs API key.');
    console.log('You can get one at: https://elevenlabs.io/app/speech-synthesis');
    console.log('💡 Free tier includes 10k characters per month\n');

    while (true) {
      const apiKey = await this.question('Enter your ElevenLabs API key: ');
      
      if (!apiKey || apiKey.trim() === '') {
        console.log('❌ API key cannot be empty');
        continue;
      }
      
      if (!ConfigManager.validateElevenLabsApiKey(apiKey.trim())) {
        console.log('❌ Invalid API key format');
        continue;
      }
      
      return apiKey.trim();
    }
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

    const confirm = await this.question('Proceed with installation? (y/n): ');
    return confirm.toLowerCase().trim() === 'y' || confirm.toLowerCase().trim() === 'yes';
  }

  async runGuidedInstallation(): Promise<AudioHooksConfig | null> {
    try {
      // Check if already installed
      const existingConfig = ConfigManager.loadConfig();
      if (existingConfig) {
        console.log('⚠️  Audio hooks are already installed.');
        console.log(`Current mode: ${existingConfig.mode}`);
        
        const reinstall = await this.question('\nWould you like to reconfigure? (y/n): ');
        if (reinstall.toLowerCase().trim() !== 'y' && reinstall.toLowerCase().trim() !== 'yes') {
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

      // Confirm installation
      const confirmed = await this.confirmInstallation(mode, !!apiKey);
      if (!confirmed) {
        console.log('Installation cancelled.');
        return null;
      }

      // Create configuration
      const config = ConfigManager.createDefaultConfig(mode, apiKey);
      return config;

    } catch (error) {
      console.error('❌ Error during installation:', error);
      return null;
    } finally {
      this.rl.close();
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
      
      const confirm = await this.question(`Switch to ${newMode} mode? (y/n): `);
      if (confirm.toLowerCase().trim() !== 'y' && confirm.toLowerCase().trim() !== 'yes') {
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
    } finally {
      this.rl.close();
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

      console.log('\nWhat would you like to reconfigure?');
      console.log('1. Change installation mode');
      console.log('2. Update ElevenLabs API key');
      console.log('3. Cancel');

      const choice = await this.question('\nSelect option (1, 2, or 3): ');

      if (choice.trim() === '1') {
        return await this.switchMode();
      } else if (choice.trim() === '2') {
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
      } else if (choice.trim() === '3') {
        console.log('Reconfiguration cancelled.');
        return null;
      } else {
        console.log('❌ Invalid option.');
        return null;
      }

    } catch (error) {
      console.error('❌ Error during reconfiguration:', error);
      return null;
    } finally {
      this.rl.close();
    }
  }

  private question(prompt: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(prompt, (answer: string) => {
        resolve(answer);
      });
    });
  }
}