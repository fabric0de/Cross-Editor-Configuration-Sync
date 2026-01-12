# Cross-Editor Configuration Sync

Sync your IDE settings, keybindings, snippets, and profiles across different editors with ease!

## ✨ Features

- ⚡ **Real-time Auto-Sync**: Automatically backup settings when changes are detected
- 🎨 **Modern UI**: Beautiful glassmorphism design with smooth animations
- 🔄 **Multi-Profile Sync**: Backup and restore all your VS Code profiles automatically
- 🔌 **Auto Extension Install**: One-click installation of missing extensions
- ☁️ **GitHub Gist**: Cloud backup with GitHub Gist integration
- 💾 **Local Storage**: Save to local filesystem for offline backup
- 🎯 **Multi-Provider**: Use multiple backup locations simultaneously
- 🌐 **Cross-IDE Support**: Works with VS Code, Cursor, Antigravity, Windsurf, VSCodium, and IDX

## 🚀 What Gets Synced

- ✅ Settings (`settings.json`)
- ✅ Keybindings (`keybindings.json`)
- ✅ Code Snippets (all `.code-snippets` files)
- ✅ Extensions (with auto-installation!)
- ✅ **All VS Code profiles** (Default + Custom)

## 📦 Installation

1. Install from VS Code Marketplace
2. Open the CECS sidebar (icon in activity bar)
3. Connect a storage provider (GitHub Gist or Local File)
4. Start syncing!

## 🎯 Quick Start

### GitHub Gist Setup
1. Click \"Quick Connect with GitHub\" in the CECS sidebar
2. Authorize the extension
3. Done! Your settings are now backed up to a private Gist

### Local File Setup
1. Click \"Confirm Location\" in the CECS sidebar
2. Choose a backup location (or use default: `~/.cecs/config.json`)
3. Done! Your settings are saved locally

## 🔄 Usage

### Auto-Sync (Recommended)
Enable automatic background sync when settings change:
```json
"cecs.autoSync": true
```

### Manual Sync
- **Push**: Backup your current settings to all connected providers
- **Pull**: Restore settings from your backup (overwrites current settings!)
- **Full Sync**: Intelligent 2-way synchronization

## 🎨 Multi-Profile Support

All your VS Code profiles are automatically detected and synced:
- ⭐ Default profile
- 📁 All custom profiles (Work, Personal, etc.)

**How it works:**
- Push from any profile → All profiles backed up
- Pull to new machine → All profiles restored
- No manual configuration needed!

## 🔌 Automatic Extension Installation

Missing extensions? No problem!

When you pull settings, CECS automatically:
1. Detects missing extensions
2. Shows installation progress
3. Installs all extensions with one click
4. Prompts to reload

Disable if you prefer manual installation:
```json
"cecs.autoInstallExtensions": false
```

## ⚙️ Configuration

### Auto-Sync
```json
"cecs.autoSync": false  // Default: false
```

### Auto-Install Extensions
```json
"cecs.autoInstallExtensions": true  // Default: true
```

### Custom User Data Directory
```json
"cecs.customUserDataDir": "/path/to/your/User"
```

### Custom Local Backup Path
```json
"cecs.localBackupPath": "/path/to/backup/folder"
```

## 🎨 Modern UI

The sidebar features:
- Glassmorphism design with smooth animations
- Real-time sync status indicator
- Profile list display
- Responsive provider cards

## 🔒 Privacy & Security

- GitHub Gist backups are **private by default**
- Your GitHub token is stored securely using VS Code's Secret Storage
- Local backups are stored only on your machine
- No data collection or telemetry

## 🐛 Known Issues

- Profile restoration requires IDE reload
- Auto-sync triggers a 5-second debounce to prevent excessive uploads

## 💡 Tips

- Use **Auto-Sync** for seamless workflow
- Connect **multiple providers** for redundancy
- Extensions install automatically when pulling to a new machine
- All profiles sync together - no need to switch manually

## 📝 Release Notes

See [CHANGELOG.md](CHANGELOG.md) for detailed release notes.

## 🤝 Contributing

Found a bug? Have a feature request? 
[Open an issue](https://github.com/fabric0de/Cross-Editor-Configuration-Sync/issues)

## 📄 License

MIT
