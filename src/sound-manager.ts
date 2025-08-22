import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { playSound } from './utils.js';
import inquirer from 'inquirer';

export interface SoundOption {
  id: string;
  name: string;
  description: string;
  file: string | null;
}

export interface EventType {
  key: string;
  name: string;
  description: string;
}

export interface SoundConfig {
  availableSounds: SoundOption[];
  eventTypes: EventType[];
}

export interface UserSoundSelection {
  notification: string;
  completion: string;
}

export class SoundManager {
  private config: SoundConfig;
  
  constructor() {
    this.config = this.loadSoundConfig();
  }
  
  private loadSoundConfig(): SoundConfig {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const configPath = join(__dirname, 'sound-config.json');
    
    if (!existsSync(configPath)) {
      throw new Error(`Sound config not found: ${configPath}`);
    }
    
    return JSON.parse(readFileSync(configPath, 'utf8'));
  }
  
  getAvailableSounds(): SoundOption[] {
    return this.config.availableSounds;
  }
  
  getEventTypes(): EventType[] {
    return this.config.eventTypes;
  }
  
  getSoundById(id: string): SoundOption | undefined {
    return this.config.availableSounds.find(sound => sound.id === id);
  }
  
  async previewSound(soundId: string): Promise<void> {
    const sound = this.getSoundById(soundId);
    
    if (!sound) {
      throw new Error(`Sound not found: ${soundId}`);
    }
    
    if (!sound.file) {
      console.log('🔇 Silent - no sound to preview');
      return;
    }
    
    console.log(`🎵 Playing: ${sound.name}`);
    
    try {
      await playSound(sound.file);
    } catch (error) {
      console.log(`❌ Error playing sound: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  async selectSoundsInteractively(): Promise<UserSoundSelection> {
    const selection: UserSoundSelection = {
      notification: 'attention',
      completion: 'complete'
    };
    
    console.log('\n🎵 Sound Selection\n');
    
    for (const eventType of this.config.eventTypes) {
      const choices = this.config.availableSounds.map(sound => ({
        name: `${sound.file ? '🎵' : '🔇'} ${sound.name} - ${sound.description}`,
        value: sound.id,
        short: sound.name
      }));
      
      // Add preview option
      choices.push({
        name: '🎧 Preview sounds',
        value: 'preview',
        short: 'Preview'
      });
      
      let selectedSound: string | undefined;
      
      do {
        const { choice } = await inquirer.prompt([
          {
            type: 'list',
            name: 'choice',
            message: `Select sound for ${eventType.name}:`,
            choices,
            pageSize: 10
          }
        ]);
        
        if (choice === 'preview') {
          const { soundToPreview } = await inquirer.prompt([
            {
              type: 'list',
              name: 'soundToPreview',
              message: 'Which sound would you like to preview?',
              choices: this.config.availableSounds
                .filter(sound => sound.file) // Only show sounds that can be played
                .map(sound => ({
                  name: sound.name,
                  value: sound.id
                }))
            }
          ]);
          
          await this.previewSound(soundToPreview);
          console.log(''); // Add spacing after preview
        } else {
          selectedSound = choice;
        }
      } while (!selectedSound);
      
      selection[eventType.key as keyof UserSoundSelection] = selectedSound;
      const selectedSoundObj = this.getSoundById(selectedSound);
      console.log(`✅ Selected: ${selectedSoundObj?.name}\n`);
    }
    
    return selection;
  }
}