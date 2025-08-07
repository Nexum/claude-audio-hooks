#!/usr/bin/env node
import { exec } from "child_process";
import { existsSync } from "fs";
import { logEvent, getSoundPath, getPlatform, isWSL } from "./utils.js";

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

    // Log the notification
    logEvent("notifications", data);

    // Play notification sound if --notify flag is present
    if (process.argv.includes("--notify")) {
      const os_platform = getPlatform();

      // Set terminal status to attention required
      process.stdout.write(`\x1b]0;🔔 Claude - ${data.message || data.type || 'Attention needed'}\x1b\\`);
      
      // Show Windows toast notification if on Windows or WSL
      if (os_platform === "win32" || isWSL()) {
        const title = data.message || "Claude Hook";
        const message = data.type || "Action required";
        
        // Try wsl-notify-send first (if installed), fallback to terminal flash
        const wslNotifyCmd = `~/.local/bin/wsl-notify-send.exe --category "Claude" "${title}: ${message}"`;
        
        exec(wslNotifyCmd, (err) => {
          if (err) {
            console.log("wsl-notify-send error:", err.message);
            console.log("Using terminal flash as fallback");
          }
        });
      }

      // Check if --speak flag is present and on macOS
      if (process.argv.includes("--speak") && os_platform === "darwin") {
        const message = "Your agent needs attention";
        const cmd = `say "${message}"`;

        exec(cmd, (err) => {
          if (err) {
            console.error("Error speaking notification:", err.message);
          }
          process.exit(0);
        });
      } else {
        // Default behavior: play sound file
        let cmd: string;

        // Try to use custom sound file first
        const soundFile = getSoundPath("on-agent-need-attention.mp3");

        if (existsSync(soundFile)) {
          if (os_platform === "darwin") {
            cmd = `afplay -v 0.5 "${soundFile}"`;
          } else if (os_platform === "win32") {
            cmd = `powershell -c "(New-Object Media.SoundPlayer '${soundFile}').PlaySync()"`;
          } else {
            // Linux - try multiple players at 50% volume for MP3
            cmd = `mpg123 -q --gain 50 "${soundFile}" 2>/dev/null || paplay --volume=32767 "${soundFile}" 2>/dev/null || play "${soundFile}" -v 0.5 2>/dev/null`;
          }
        } else {
          if (os_platform === "darwin") {
            // Fallback to macOS built-in system sound at 50% volume
            cmd = `afplay -v 0.5 /System/Library/Sounds/Funk.aiff`;
          } else {
            console.error(`Sound file not found: ${soundFile}`);
            console.error("Please ensure on-agent-need-attention.mp3 exists");
            process.exit(0);
          }
        }

        exec(cmd, (err) => {
          if (err) {
            console.error("Error playing sound:", err.message);
          }
          process.exit(0);
        });
      }
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error("Error processing notification:", error);
    process.exit(2);
  }
});