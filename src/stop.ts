#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { logEvent, getSoundPath, getPlatform, getLogsDir } from './utils.js';

// Read input from stdin
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('readable', () => {
  let chunk;
  while ((chunk = process.stdin.read()) !== null) {
    input += chunk;
  }
});

process.stdin.on('end', async () => {
  try {
    const data = JSON.parse(input);
    
    // Log the stop event
    logEvent('stop', data);
    
    // Set terminal status to completed
    const result = data.result || data.summary || "Task completed";
    process.stdout.write(`\x1b]0;✅ Claude - ${result}\x1b\\`);
    
    // Play completion sound or speak notification
    const os_platform = getPlatform();
    
    // Define the callback for after notification
    const afterNotification = () => {
      // If --chat flag is present, process the transcript
      if (process.argv.includes('--chat') && data.transcript_path) {
        try {
          const transcriptPath = data.transcript_path;
          if (existsSync(transcriptPath)) {
            const transcriptContent = readFileSync(transcriptPath, 'utf8');
            const lines = transcriptContent.split('\n').filter(line => line.trim());
            const chatData = [];
            
            for (const line of lines) {
              try {
                chatData.push(JSON.parse(line));
              } catch (e) {
                // Skip invalid lines
              }
            }
            
            const chatLogFile = join(getLogsDir(), 'chat.json');
            writeFileSync(chatLogFile, JSON.stringify(chatData, null, 2));
          }
        } catch (e) {
          console.error('Error processing transcript:', e);
        }
      }
      
      process.exit(0);
    };
    
    // Check if --speak flag is present and on macOS
    if (process.argv.includes('--speak') && os_platform === 'darwin') {
      const message = "Your agent has finished";
      const cmd = `say "${message}"`;
      
      exec(cmd, (err) => {
        if (err) {
          console.error('Error speaking notification:', err.message);
        }
        afterNotification();
      });
    } else {
      // Default behavior: play sound file
      let cmd: string;
      
      if (os_platform === 'darwin') {
        // Use macOS built-in system sound at 50% volume
        cmd = `afplay -v 0.5 /System/Library/Sounds/Glass.aiff`;
        
        exec(cmd, (err) => {
          if (err) {
            console.error('Error playing sound:', err.message);
          }
          afterNotification();
        });
      } else {
        // For non-macOS platforms, try to use custom sound file
        const soundFile = getSoundPath('on-agent-complete.mp3');
        
        // Check if sound file exists
        if (existsSync(soundFile)) {
          // Determine the command based on the platform
          if (os_platform === 'win32') {
            cmd = `powershell -c "(New-Object Media.SoundPlayer '${soundFile}').PlaySync()"`;
          } else {
            // Linux - try multiple players at 50% volume for MP3
            cmd = `mpg123 -q --gain 50 "${soundFile}" 2>/dev/null || paplay --volume=32767 "${soundFile}" 2>/dev/null || play "${soundFile}" -v 0.5 2>/dev/null`;
          }
          
          exec(cmd, (err) => {
            if (err) {
              console.error('Error playing sound:', err.message);
            }
            afterNotification();
          });
        } else {
          console.error(`Sound file not found: ${soundFile}`);
          console.error('Please ensure on-agent-complete.mp3 exists');
          afterNotification();
        }
      }
    }
  } catch (error) {
    console.error('Error processing stop event:', error);
    process.exit(1);
  }
});