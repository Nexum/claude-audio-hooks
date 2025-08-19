#!/usr/bin/env node
import { exec } from "child_process";
import { existsSync } from "fs";
import { logEvent, getSoundPath, getPlatform } from "./utils.js";
import { ConfigManager } from "./config-manager.js";

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("readable", () => {
  let chunk;
  while ((chunk = process.stdin.read()) !== null) {
    input += chunk;
  }
});

process.stdin.on("end", async () => {
  try {
    const data = JSON.parse(input);
    
    // Log the TTS event
    logEvent("tts-summary", data);

    // Check if TTS mode is enabled
    if (!ConfigManager.isElevenLabsConfigured()) {
      console.error("TTS mode not configured properly");
      process.exit(1);
      return;
    }

    const hookType = process.argv[2]; // 'notification' or 'stop'
    const message = generateSummaryMessage(hookType, data);
    
    if (!message) {
      process.exit(0);
      return;
    }

    // Generate TTS using Claude Code's MCP connection to ElevenLabs
    await generateTTS(message);

  } catch (error) {
    console.error("Error processing TTS summary:", error);
    process.exit(2);
  }
});

function generateSummaryMessage(hookType: string, data: any): string | null {
  try {
    switch (hookType) {
      case 'notification':
        // Generate short message for attention needed
        const notificationMsg = data.message || data.type || "attention needed";
        return truncateMessage(`Attention: ${notificationMsg}`, 8);
        
      case 'stop':
        // Generate short message for task completion
        const result = data.result || data.summary || "task completed";
        const tools = data.tools_used ? data.tools_used.slice(0, 2).join(", ") : null;
        
        if (tools && tools.length > 0) {
          return truncateMessage(`Completed: ${tools}`, 8);
        } else {
          return truncateMessage(`Completed: ${result}`, 8);
        }
        
      default:
        return null;
    }
  } catch (error) {
    console.error("Error generating summary message:", error);
    return null;
  }
}

function truncateMessage(message: string, maxWords: number): string {
  const words = message.split(' ');
  if (words.length <= maxWords) {
    return message;
  }
  return words.slice(0, maxWords).join(' ');
}

async function generateTTS(message: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Use Claude Code's built-in MCP functionality to call ElevenLabs
    // This approach uses the configured MCP server via Claude Code's API
    const mcpCommand = `claude mcp call elevenlabs generate_speech --text "${message}" --voice_id "pNInz6obpgDQGcFmaJgB" --output_format "mp3_44100_128"`;
    
    exec(mcpCommand, { timeout: 10000 }, (error, stdout, stderr) => {
      if (error) {
        console.error("MCP TTS generation failed:", error.message);
        // Fallback to system TTS if available
        fallbackTTS(message);
        resolve();
        return;
      }
      
      try {
        // Parse the MCP response to get the audio data
        const response = JSON.parse(stdout);
        if (response.audio_base64) {
          // Play the base64 audio directly
          playBase64Audio(response.audio_base64);
        }
      } catch (parseError) {
        console.error("Failed to parse MCP response:", parseError);
        fallbackTTS(message);
      }
      
      resolve();
    });
  });
}

function playBase64Audio(audioBase64: string): void {
  const os_platform = getPlatform();
  
  // Create temporary file for audio playback
  const tempFile = `/tmp/tts-${Date.now()}.mp3`;
  const audioBuffer = Buffer.from(audioBase64, 'base64');
  
  require('fs').writeFileSync(tempFile, audioBuffer);
  
  let cmd: string;
  if (os_platform === "darwin") {
    cmd = `afplay -v 0.7 "${tempFile}" && rm "${tempFile}"`;
  } else if (os_platform === "win32") {
    cmd = `powershell -c "(New-Object Media.SoundPlayer '${tempFile}').PlaySync(); Remove-Item '${tempFile}'"`;
  } else {
    // Linux
    cmd = `mpg123 -q --gain 70 "${tempFile}" 2>/dev/null && rm "${tempFile}" || paplay --volume=45875 "${tempFile}" 2>/dev/null && rm "${tempFile}" || (play "${tempFile}" -v 0.7 2>/dev/null && rm "${tempFile}")`;
  }
  
  exec(cmd, (err) => {
    if (err) {
      console.error("Error playing TTS audio:", err.message);
      // Clean up temp file on error
      try {
        require('fs').unlinkSync(tempFile);
      } catch (cleanupErr) {
        // Ignore cleanup errors
      }
    }
  });
}

function fallbackTTS(message: string): void {
  const os_platform = getPlatform();
  
  // Only use system TTS on macOS as fallback
  if (os_platform === "darwin") {
    const cmd = `say -v "Samantha" -r 200 "${message}"`;
    
    exec(cmd, (err) => {
      if (err) {
        console.error("Error with fallback TTS:", err.message);
      }
    });
  } else {
    // For other platforms, just log that TTS failed
    console.log(`TTS message: ${message}`);
  }
}