import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { platform } from "os";

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
  // Look for sound in package installation directory
  const packageSoundPath = join(dirname(process.argv[1]), '../sounds', soundFile);
  if (existsSync(packageSoundPath)) {
    return packageSoundPath;
  }
  
  // Fallback to user's .claude directory
  const userSoundPath = join(process.env.HOME || process.cwd(), ".claude", soundFile);
  return userSoundPath;
}

export function getPlatform(): string {
  return platform();
}

export function isWSL(): boolean {
  return !!process.env.WSL_DISTRO_NAME;
}