# Claude Audio Hooks

Cross-platform audio hooks for [Claude Code](https://claude.ai/code) with notifications and terminal management. Get visual and audio feedback when Claude is working, needs attention, or completes tasks.

## Features

- 🖥️ **Terminal Title Management**: See Claude's status in your terminal title with emojis
- 🔔 **Cross-platform Notifications**: Toast notifications and system sounds
- 📝 **Activity Logging**: JSON logs of all hook events
- 🎵 **Custom Sounds**: Support for custom notification sounds
- 🗣️ **Text-to-Speech**: macOS voice notifications (optional)

## Quick Install

```bash
npx claude-audio-hooks install
```

That's it! Your Claude Code instance will now have enhanced status management.

## What You Get

After installation, Claude Code will:

- **⚡ Show "Working"** in terminal title during tool execution
- **💤 Show "Idle"** when finished with tasks  
- **🔔 Send notifications** when attention is needed
- **✅ Play completion sounds** when tasks finish
- **📁 Log all activities** to `~/.claude/logs/`

## Hook Types

| Hook | Trigger | Action |
|------|---------|---------|
| `PreToolUse` | Before tool execution | Terminal shows "⚡ Working..." |
| `PostToolUse` | After tool execution | Terminal shows "💤 Idle" |
| `Notification` | When attention needed | System notification + sound |
| `Stop` | Task completion | Completion sound + transcript logging |

## Commands

```bash
# Install hooks
npx claude-audio-hooks install

# Check installation status  
npx claude-audio-hooks status

# Remove hooks
npx claude-audio-hooks uninstall

# Show help
npx claude-audio-hooks help
```

## Platform Support

### macOS
- Uses built-in system sounds (Glass.aiff, Funk.aiff)
- Optional text-to-speech with `--speak` flag
- Native terminal title support

### Windows/WSL
- Toast notifications via wsl-notify-send or PowerShell
- MP3 sound file support
- Cross-platform path handling

### Linux  
- Multiple audio player support (mpg123, paplay, sox)
- Desktop notification integration
- Terminal escape sequence support

## Custom Sounds

Place custom sound files in `~/.claude/`:

- `on-agent-complete.mp3` - Task completion sound
- `on-agent-need-attention.mp3` - Notification sound

The package includes fallback sounds, but custom files take precedence.

## Log Files

Activity logs are saved to `~/.claude/logs/`:

```
~/.claude/logs/
├── working.json      # Tool execution events
├── notifications.json # Attention notifications  
├── stop.json         # Task completion events
└── chat.json         # Chat transcripts (if enabled)
```

## Advanced Usage

### Verbose Mode
```bash
# Show colored status messages in console
node path/to/status-manager.js working --verbose
```

### Text-to-Speech (macOS)
```bash
# Enable voice notifications
node path/to/notification.js --notify --speak
```

### Chat Transcript Logging
```bash
# Enable transcript processing on completion
node path/to/stop.js --chat
```

## Programmatic Usage

```typescript
import { setTerminalStatus, STATUS_CONFIGS } from 'claude-audio-hooks';

// Set terminal status
setTerminalStatus('working', 'Processing data...');

// Available status types
const statuses = Object.keys(STATUS_CONFIGS);
// ['working', 'attention', 'completed', 'error', 'idle']
```

## Settings Integration

The CLI automatically updates your `~/.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "",
      "hooks": [{
        "type": "command",
        "command": "node /path/to/claude-audio-hooks/dist/working.js"
      }]
    }],
    "PostToolUse": [{ "..." }],
    "Notification": [{ "..." }],
    "Stop": [{ "..." }]
  }
}
```

## Troubleshooting

### No Sound on Linux
Install audio players:
```bash
# Ubuntu/Debian
sudo apt install mpg123 pulseaudio-utils sox

# Fedora/RHEL  
sudo dnf install mpg123 pulseaudio-utils sox
```

### WSL Toast Notifications
Install wsl-notify-send for Windows toast notifications in WSL:

**One-line installation:**
```bash
mkdir -p ~/.local/bin && curl -L https://github.com/stuartleeks/wsl-notify-send/releases/latest/download/wsl-notify-send_windows_amd64.zip -o /tmp/wsl-notify-send.zip && unzip /tmp/wsl-notify-send.zip -d /tmp/ && mv /tmp/wsl-notify-send.exe ~/.local/bin/ && rm /tmp/wsl-notify-send.zip && chmod +x ~/.local/bin/wsl-notify-send.exe
```

**Step-by-step installation:**
```bash
# Create local bin directory
mkdir -p ~/.local/bin

# Download and extract latest wsl-notify-send (64-bit)
curl -L https://github.com/stuartleeks/wsl-notify-send/releases/latest/download/wsl-notify-send_windows_amd64.zip -o /tmp/wsl-notify-send.zip
unzip /tmp/wsl-notify-send.zip -d /tmp/
mv /tmp/wsl-notify-send.exe ~/.local/bin/
rm /tmp/wsl-notify-send.zip

# Make executable
chmod +x ~/.local/bin/wsl-notify-send.exe

# Verify installation
~/.local/bin/wsl-notify-send.exe --help
```

### Permission Errors
Ensure Claude Code settings file is writable:
```bash
chmod 644 ~/.claude/settings.json
```

## Requirements

- Node.js >= 18.0.0
- Claude Code installed
- Write access to `~/.claude/settings.json`

## Development

```bash
git clone https://github.com/yourusername/claude-audio-hooks
cd claude-audio-hooks
npm install
npm run build
npm link
```

## License

MIT - See LICENSE file for details.

## Contributing

1. Fork the repository
2. Create your feature branch
3. Make your changes
4. Add tests if applicable  
5. Submit a pull request

---

**Made for the Claude Code community** 🤖✨