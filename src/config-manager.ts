#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export type HookMode = 'standard' | 'tts';

export interface SoundSelection {
  notification: string;
  completion: string;
}

export interface AudioHooksConfig {
  mode: HookMode;
  elevenLabsApiKey?: string;
  soundSelection: SoundSelection;
  installedAt: string;
  version: string;
}

export interface ClaudeConfig {
  mcpServers?: {
    [serverName: string]: {
      type?: string;
      command: string;
      args: string[];
      env?: { [key: string]: string };
    };
  };
  [key: string]: any;
}

export class ConfigManager {
  private static readonly CONFIG_PATH = join(process.env.HOME || process.cwd(), '.claude', 'audio-hooks-config.json');
  private static readonly CLAUDE_CONFIG_PATH = join(process.env.HOME || process.cwd(), '.claude.json');
  private static readonly CLAUDE_SETTINGS_PATH = join(process.env.HOME || process.cwd(), '.claude', 'settings.json');

  static loadConfig(): AudioHooksConfig | null {
    if (!existsSync(this.CONFIG_PATH)) {
      return null;
    }
    
    try {
      return JSON.parse(readFileSync(this.CONFIG_PATH, 'utf8'));
    } catch (error) {
      console.error(`Failed to parse audio hooks config: ${error}`);
      return null;
    }
  }

  static saveConfig(config: AudioHooksConfig): void {
    const configDir = join(process.env.HOME || process.cwd(), '.claude');
    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true });
    }
    
    writeFileSync(this.CONFIG_PATH, JSON.stringify(config, null, 2));
  }

  static loadClaudeConfig(): ClaudeConfig {
    if (!existsSync(this.CLAUDE_CONFIG_PATH)) {
      return {};
    }
    
    try {
      return JSON.parse(readFileSync(this.CLAUDE_CONFIG_PATH, 'utf8'));
    } catch (error) {
      return {};
    }
  }

  static saveClaudeConfig(config: ClaudeConfig): void {
    writeFileSync(this.CLAUDE_CONFIG_PATH, JSON.stringify(config, null, 2));
  }

  static loadClaudeSettings(): any {
    if (!existsSync(this.CLAUDE_SETTINGS_PATH)) {
      return {};
    }
    
    try {
      return JSON.parse(readFileSync(this.CLAUDE_SETTINGS_PATH, 'utf8'));
    } catch (error) {
      return {};
    }
  }

  static saveClaudeSettings(settings: any): void {
    const settingsDir = join(process.env.HOME || process.cwd(), '.claude');
    if (!existsSync(settingsDir)) {
      mkdirSync(settingsDir, { recursive: true });
    }
    
    writeFileSync(this.CLAUDE_SETTINGS_PATH, JSON.stringify(settings, null, 2));
  }

  static configureElevenLabsMcp(apiKey: string): void {
    const claudeConfig = this.loadClaudeConfig();
    
    if (!claudeConfig.mcpServers) {
      claudeConfig.mcpServers = {};
    }
    
    claudeConfig.mcpServers.elevenlabs = {
      type: "stdio",
      command: "uvx",
      args: ["elevenlabs-mcp"],
      env: {
        ELEVENLABS_API_KEY: apiKey
      }
    };
    
    this.saveClaudeConfig(claudeConfig);
  }

  static removeElevenLabsMcp(): void {
    const claudeConfig = this.loadClaudeConfig();
    
    if (claudeConfig.mcpServers && claudeConfig.mcpServers.elevenlabs) {
      delete claudeConfig.mcpServers.elevenlabs;
      this.saveClaudeConfig(claudeConfig);
    }
  }

  static validateElevenLabsApiKey(apiKey: string): boolean {
    // Basic validation - ElevenLabs API keys typically start with 'sk-'
    return typeof apiKey === 'string' && apiKey.length > 10 && apiKey.trim() !== '';
  }

  static getCurrentMode(): HookMode {
    const config = this.loadConfig();
    return config?.mode || 'standard';
  }

  static isElevenLabsConfigured(): boolean {
    const config = this.loadConfig();
    return config?.mode === 'tts' && !!config?.elevenLabsApiKey;
  }

  static getElevenLabsApiKey(): string | null {
    const config = this.loadConfig();
    return config?.elevenLabsApiKey || null;
  }

  static createDefaultConfig(mode: HookMode, apiKey?: string, soundSelection?: SoundSelection): AudioHooksConfig {
    return {
      mode,
      elevenLabsApiKey: apiKey,
      soundSelection: soundSelection || {
        notification: 'attention',
        completion: 'complete'
      },
      installedAt: new Date().toISOString(),
      version: '1.0.2' // Hard-coded for now, can be made dynamic later
    };
  }

  static removeConfig(): void {
    if (existsSync(this.CONFIG_PATH)) {
      writeFileSync(this.CONFIG_PATH, '');
    }
  }
}