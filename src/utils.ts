import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { platform } from "os";
import { createInterface } from "readline";

export function getLogsDir(): string {
  return join(process.env.HOME || process.cwd(), ".claude", "logs");
}

export function ensureLogsDir(): void {
  const logsDir = getLogsDir();
  if (!existsSync(logsDir)) {
    mkdirSync(logsDir, { recursive: true });
  }
}

export function logEvent(eventType: string, data: any): void {
  ensureLogsDir();
  const logFile = join(getLogsDir(), `${eventType}.json`);

  let logs = [];
  if (existsSync(logFile)) {
    try {
      logs = JSON.parse(readFileSync(logFile, "utf8"));
    } catch (e) {
      logs = [];
    }
  }

  logs.push({
    timestamp: new Date().toISOString(),
    ...data,
  });

  writeFileSync(logFile, JSON.stringify(logs, null, 2));
}

export function getSoundPath(soundFile: string): string {
  // prefer user's .claude directory
  const userSoundPath = join(
    process.env.HOME || process.cwd(),
    ".claude",
    soundFile
  );
  if (existsSync(userSoundPath)) {
    return userSoundPath;
  }

  // Look for sound in package installation directory
  const packageSoundPath = join(
    dirname(process.argv[1]),
    "../sounds",
    soundFile
  );
  // fallback to package installation directory
  return packageSoundPath;
}

export function getPlatform(): string {
  return platform();
}

export function isWSL(): boolean {
  return !!process.env.WSL_DISTRO_NAME;
}

export function getHookStateFile(): string {
  return join(getLogsDir(), "hook-state.json");
}

export function setHookTimestamp(hookType: string): void {
  ensureLogsDir();
  const stateFile = getHookStateFile();

  let state: Record<string, number> = {};
  if (existsSync(stateFile)) {
    try {
      state = JSON.parse(readFileSync(stateFile, "utf8"));
    } catch (e) {
      state = {};
    }
  }

  state[hookType] = Date.now();
  writeFileSync(stateFile, JSON.stringify(state, null, 2));
}

export function getHookTimestamp(hookType: string): number | null {
  const stateFile = getHookStateFile();

  if (!existsSync(stateFile)) {
    return null;
  }

  try {
    const state: Record<string, number> = JSON.parse(
      readFileSync(stateFile, "utf8")
    );
    return state[hookType] || null;
  } catch (e) {
    return null;
  }
}

export function createReadline() {
  return createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

export function playSound(soundFile: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!soundFile) {
      resolve();
      return;
    }

    const soundPath = getSoundPath(soundFile);
    
    if (!existsSync(soundPath)) {
      reject(new Error(`Sound file not found: ${soundPath}`));
      return;
    }

    const os_platform = getPlatform();
    let cmd: string;

    if (os_platform === "darwin") {
      cmd = `afplay -v 0.5 "${soundPath}"`;
    } else if (os_platform === "win32") {
      cmd = `powershell -c "(New-Object Media.SoundPlayer '${soundPath}').PlaySync()"`;
    } else {
      cmd = `mpg123 -q --gain 50 "${soundPath}" 2>/dev/null || paplay --volume=32767 "${soundPath}" 2>/dev/null || play "${soundPath}" -v 0.5 2>/dev/null`;
    }

    import("child_process").then(({ exec }) => {
      exec(cmd, (err: any) => {
        if (err) {
          reject(new Error(`Error playing sound: ${err.message}`));
        } else {
          resolve();
        }
      });
    }).catch(reject);
  });
}
