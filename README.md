# Cross-Editor Configuration Sync

Sync your IDE settings, keybindings, snippets, and profiles across different editors with ease!

## ✨ Features

- 🔄 **Multi-Profile Sync**: Backup and restore all your custom profiles
- ☁️ **GitHub Gist**: Cloud backup with GitHub Gist integration
- 💾 **Local Storage**: Save to local filesystem for offline backup
- 🎯 **Multi-Provider**: Use multiple backup locations simultaneously
- 🔌 **Cross-IDE Support**: Works with VS Code, Cursor, Antigravity, Windsurf, VSCodium, and IDX

## 🚀 What Gets Synced

- ✅ Settings (`settings.json`)
- ✅ Keybindings (`keybindings.json`)
- ✅ Code Snippets (all `.code-snippets` files)
- ✅ Extensions list
- ✅ **All custom profiles** (not just the default!)

## 📦 Installation

1. Install from VS Code Marketplace
2. Open the CECS sidebar (icon in activity bar)
3. Connect a storage provider (GitHub Gist or Local File)
4. Start syncing!

## 🎯 Quick Start

### GitHub Gist Setup
1. Click "GitHub Login (Auto)" in the CECS sidebar
2. Authorize the extension
3. Done! Your settings are now backed up to a private Gist

### Local File Setup
1. Click "Connect Local" in the CECS sidebar
2. Choose a backup location (or use default: `~/.cecs/config.json`)
3. Done! Your settings are saved locally

## 🔄 Usage

### Push (Backup)
Click **Push All** to backup your current settings to all connected providers.

### Pull (Restore)
Click **Pull All** to restore settings from your backup.  
⚠️ This will overwrite your current settings!

### Sync (Smart Merge)
Click **Sync All** for intelligent 2-way synchronization.

## 🎨 Multi-Profile Support

All your custom profiles are automatically included in backups:
- Profile-specific settings
- Profile-specific keybindings
- Profile-specific snippets

After restoring, **reload your IDE** to see the restored profiles.

## ⚙️ Configuration

### Custom User Data Directory
```json
"cecs.customUserDataDir": "/path/to/your/User"
```

### Custom Local Backup Path
```json
"cecs.localBackupPath": "/path/to/backup/config.json"
```

## 🔒 Privacy & Security

- GitHub Gist backups are **private by default**
- Your GitHub token is stored securely using VS Code's Secret Storage
- Local backups are stored only on your machine

## 🐛 Known Issues

- Profile restoration requires IDE reload
- Extension installation is not automated (you'll see a list to install manually)

## 📝 Release Notes

See [CHANGELOG.md](CHANGELOG.md) for detailed release notes.

## 🤝 Contributing

Found a bug? Have a feature request? 
[Open an issue](https://github.com/fabric0de/Cross-Editor-Configuration-Sync/issues)

## 📄 License

MIT
