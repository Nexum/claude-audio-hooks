# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript-based npm package that provides audio notifications and terminal status management for Claude Code. The package integrates with Claude's hook system to provide real-time feedback during AI interactions through sounds, terminal titles, and system notifications.

## Development Commands

```bash
# Build and development
npm run build          # Compile TypeScript to dist/
npm run build:watch    # Watch mode compilation  
npm run clean          # Remove dist/ directory
npm run prepare        # Auto-build on npm install

# Hook management
npm run install-hooks  # Install hooks to Claude settings
npm run uninstall-hooks # Remove hooks from Claude settings

# CLI testing
npx claude-audio-hooks install    # Install hooks
npx claude-audio-hooks uninstall  # Remove hooks  
npx claude-audio-hooks status     # Check installation
```

## Architecture

### Hook System Integration
The package modifies `~/.claude/settings.json` to register four main hooks:
- **PreToolUse**: Sets "⚡ Working..." status via `working.ts`
- **PostToolUse**: Resets to idle status via `status-manager.ts`  
- **Notification**: Plays attention sounds via `notification.ts`
- **Stop**: Handles completion sounds and logging via `stop.ts`

### Core Modules

**Status Manager** (`src/status-manager.ts`): Terminal title management with emoji indicators for different states (working, attention, completed, error, idle).

**Cross-Platform Sound System**: Handles audio across macOS (system sounds + TTS), Windows/WSL (toast notifications), and Linux (multiple audio backends with fallback chain).

**Event Logging**: All hooks log activity to JSON files in `~/.claude/logs/` for debugging and analytics.

### Platform-Specific Behavior
- **macOS**: Uses built-in sounds (Glass.aiff, Funk.aiff) and `say` command
- **Windows/WSL**: PowerShell Media.SoundPlayer and wsl-notify-send
- **Linux**: Attempts mpg123, paplay, sox with automatic fallback

## File Structure

```
src/
├── cli.ts           # Main CLI executable
├── index.ts         # Package exports
├── status-manager.ts # Terminal title management
├── working.ts       # PreToolUse hook handler
├── notification.ts  # Notification hook handler  
├── stop.ts          # Stop hook handler
└── utils.ts         # Cross-platform utilities

sounds/              # Bundled audio files
~/.claude/
├── settings.json    # Hook configurations
├── logs/           # Activity logs (JSON)
└── *.mp3           # Optional custom sounds
```

## Key Implementation Details

### Stdin/JSON Processing
All hook handlers read JSON input from stdin to receive Claude's execution context and tool information.

### Sound Priority System
1. Custom user sounds in `~/.claude/`
2. Package-bundled sounds in `sounds/`  
3. System default sounds

### TypeScript Configuration
- Target: ES2020 with strict mode
- Output: `dist/` with declaration files
- Node.js >=18.0.0 required

### Testing
Manual testing via CLI commands - no automated test suite. Use `npm run install-hooks` and trigger Claude interactions to test hook functionality.