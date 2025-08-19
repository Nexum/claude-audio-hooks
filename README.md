# Claude Audio Hooks

Cross-platform audio feedback for [Claude Code](https://claude.ai/code) with intelligent installation modes. Get audio notifications, voice summaries, and activity logging when Claude is working, needs attention, or completes tasks.

## ✨ Features

### 🎵 Two Installation Modes

**📢 Standard Mode**
- 🔔 Audio notifications for attention needed
- ✅ Completion sounds when tasks finish
- 📝 Activity logging for debugging

**🗣️ TTS Summary Mode** *(New!)*
- 🎙️ AI-generated voice summaries powered by ElevenLabs
- 🧠 Contextual messages describing what Claude is doing
- 🔄 Automatic ElevenLabs MCP server configuration

### 🌍 Cross-Platform Support
- **macOS**: System sounds, TTS fallback, native notifications
- **Windows/WSL**: Toast notifications, MP3 playback
- **Linux**: Multiple audio backends, desktop notifications

## 🚀 Quick Start

```bash
npx claude-audio-hooks install
```

This launches an **interactive installation wizard** where you can:
1. Choose between Standard or TTS mode
2. Configure your ElevenLabs API key (for TTS mode)
3. Automatically set up all necessary configurations

## 🎯 Installation Modes

### Standard Mode
Perfect for basic audio feedback:
- **PreToolUse**: Activity logging
- **Notification**: Sound alerts when Claude needs attention
- **Stop**: Completion sounds when tasks finish

### TTS Summary Mode  
AI-powered voice feedback (requires [ElevenLabs API key](https://elevenlabs.io/app/speech-synthesis)):
- **PreToolUse**: Activity logging
- **Notification**: Voice summary like *"Attention: file not found"*
- **Stop**: Voice summary like *"Completed: git commit"*
- **Auto-setup**: ElevenLabs MCP server automatically configured

> 💡 **Free Tier Available**: ElevenLabs offers 10k characters per month free

## 🛠️ Commands

### Basic Commands
```bash
# Interactive installation with mode selection
npx claude-audio-hooks install

# Check current configuration and status
npx claude-audio-hooks status

# Remove all hooks and configuration
npx claude-audio-hooks uninstall

# Show all available commands
npx claude-audio-hooks help
```

### Advanced Commands
```bash
# Change settings (API keys, etc.)
npx claude-audio-hooks configure

# Switch between Standard and TTS modes
npx claude-audio-hooks switch-mode
```

## 📊 What You Get

After installation, Claude Code will provide feedback based on your chosen mode:

### Standard Mode
- **⚡ Working**: Claude is executing tools
- **🔔 Attention**: Claude needs your input
- **✅ Complete**: Tasks finished successfully
- **📁 Logs**: Activity saved to `~/.claude/logs/`

### TTS Mode
- **⚡ Working**: Same activity logging
- **🗣️ Voice Alerts**: AI-generated summaries instead of beeps
- **🎙️ Contextual**: Messages like "Attention: permission denied" or "Completed: database updated"
- **📁 Logs**: Enhanced logging with TTS events

## 🔧 Technical Details

### Hook Integration

The package installs these Claude Code hooks:

| Hook | Standard Mode | TTS Mode |
|------|---------------|----------|
| `PreToolUse` | Activity logging | Activity logging |
| `Notification` | Sound notifications | TTS voice summaries |
| `Stop` | Completion sounds | TTS voice summaries |

### Configuration Files

- **`~/.claude/audio-hooks-config.json`**: Your installation preferences
- **`~/.claude.json`**: ElevenLabs MCP server config (TTS mode only)
- **`~/.claude/settings.json`**: Claude Code hook configuration
- **`~/.claude/logs/`**: Activity and event logs

### MCP Integration (TTS Mode)

When you choose TTS mode, the installer automatically:
1. Configures ElevenLabs MCP server in `~/.claude.json`
2. Validates your API key format
3. Sets up secure environment variables
4. Tests MCP connectivity

## 🎨 Customization

### Custom Sound Files (Standard Mode)
Place custom sound files in `~/.claude/`:
- `on-agent-complete.mp3` - Task completion sound
- `on-agent-need-attention.mp3` - Notification sound

### Voice Settings (TTS Mode)
TTS uses ElevenLabs "Adam" voice by default. Modify `src/tts-summary.ts` to use different voices.

## 📱 Platform-Specific Setup

### macOS
Works out of the box with system sounds. TTS mode includes system TTS fallback.

### Windows/WSL
For enhanced notifications, install [wsl-notify-send](https://github.com/stuartleeks/wsl-notify-send):

```bash
# Quick install
mkdir -p ~/.local/bin && curl -L https://github.com/stuartleeks/wsl-notify-send/releases/latest/download/wsl-notify-send_windows_amd64.zip -o /tmp/wsl-notify-send.zip && unzip /tmp/wsl-notify-send.zip -d /tmp/ && mv /tmp/wsl-notify-send.exe ~/.local/bin/ && chmod +x ~/.local/bin/wsl-notify-send.exe
```

### Linux
Install audio players for sound support:
```bash
# Ubuntu/Debian
sudo apt install mpg123 pulseaudio-utils sox

# Fedora/RHEL
sudo dnf install mpg123 pulseaudio-utils sox
```

## 🐛 Troubleshooting

### TTS Mode Issues
- **API Key Invalid**: Ensure your ElevenLabs API key is correct
- **MCP Not Working**: Restart Claude Code after installation
- **No Voice Output**: Check audio system and volume settings

### General Issues
- **Hooks Not Working**: Run `npx claude-audio-hooks status` to verify installation
- **Permission Errors**: Ensure `~/.claude/settings.json` is writable
- **Audio Issues**: Install platform-specific audio players (see Platform Setup)

### Getting Help
1. Run `npx claude-audio-hooks status` for diagnostics
2. Check `~/.claude/logs/` for error details
3. Try switching between modes with `npx claude-audio-hooks switch-mode`

## 🔄 Migration from v1.x

If upgrading from an older version:

```bash
# Remove old installation
npx claude-audio-hooks uninstall

# Install new version with guided setup
npx claude-audio-hooks install
```

The new version uses a different configuration system and adds TTS capabilities.

## 💻 Programmatic Usage

```typescript
import { 
  ConfigManager, 
  setTerminalStatus, 
  STATUS_CONFIGS 
} from 'claude-audio-hooks';

// Check current mode
const mode = ConfigManager.getCurrentMode();
console.log(`Running in ${mode} mode`);

// Set terminal status (Standard mode only)
setTerminalStatus('working', 'Processing data...');

// Available status types
const statuses = Object.keys(STATUS_CONFIGS);
// ['working', 'attention', 'completed', 'error', 'idle']
```

## 🚧 Requirements

- **Node.js** >= 18.0.0
- **Claude Code** installed and configured
- **ElevenLabs API Key** (for TTS mode only)
- Write access to `~/.claude/` directory

## 🧪 Development

```bash
git clone https://github.com/Nexum/claude-audio-hooks
cd claude-audio-hooks
npm install
npm run build

# Test locally
npm link
npx claude-audio-hooks install
```

## 📄 License

MIT - See [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🆕 Changelog

### v1.1.0 *(Latest)*
- ✨ Interactive installation wizard
- 🗣️ TTS Summary mode with ElevenLabs integration
- ⚙️ Automatic MCP server configuration
- 🔄 Mode switching capabilities
- 📊 Enhanced status reporting
- 🛠️ New CLI commands: `configure`, `switch-mode`

### v1.0.x
- Basic audio hooks and terminal status management

---

**Made for the Claude Code community** 🤖✨

*Get instant audio feedback and never miss when Claude needs your attention!*