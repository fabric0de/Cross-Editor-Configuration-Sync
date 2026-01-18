# Change Log

All notable changes to the "Cross-Editor Configuration Sync" extension will be documented in this file.

## [0.3.1] - 2026-01-16

### 🚀 Reliability Improvements

#### Detached Profile Sync
- **Process-Safe Updates**: Implemented a standalone helper script to update profiles while the IDE is closed, preventing the "overwrite on exit" issue.
- **Robust Relaunch Strategy**: New relaunch logic prioritizes direct CLI binary execution (`code .` equivalent) for reliable restart, falling back to `osascript` and `open`.
- **Zero-Delay Restart**: Optimized script to restart the editor immediately after profile updates.
- **Cross-Platform Foundation**: Structured `ProfileSyncHelper` to support macOS (bash) and future Windows/Linux expansion.

## [0.3.0] - 2026-01-14

### 🎨 Major UI Overhaul

#### Svelte + Vite Migration
- **Complete UI Rewrite**: Migrated from HTML template literals to Svelte reactive components
- **Modern Build System**: Vite for fast builds and HMR support
- **Type-Safe**: Full TypeScript support in webview code
- **Component-Based**: Modular, maintainable component architecture

#### VS Code Codicons Integration
- **Native Icons**: Using official `@vscode/codicons` for consistent UI
- **Beautiful Design**: Professional, modern interface matching VS Code aesthetics
- **Refresh Button**: Easy profile refresh with codicon button

### ✨ Complete Profile Synchronization

#### Option B Implementation
- **Restructured EditorConfig**: Separate `default` and `profiles` structure
- **Full Profile Data**: Sync settings, keybindings, snippets for all profiles
- **Metadata Sync**: `profiles.json` automatically synchronized
- **Empty Profile Support**: Profiles without folders still sync metadata

### 🔧 Technical Improvements

#### Build System
- `build:webview`: Vite builds Svelte components to `dist/webview`
- `build:extension`: esbuild builds extension code
- `build`: Combined build script
- Parallel watch modes for development

#### Architecture
- Svelte Store for reactive state management
- Clean separation: extension code vs webview code
- Removed legacy `ViewContent.ts`
- Updated `SidebarProvider` and `SetupPanel` to load Vite builds
- Modularized syncer: Split `syncer.ts` (395 lines) into focused modules
  - `ConfigReader.ts` (175 lines) - Read operations
  - `ConfigWriter.ts` (145 lines) - Write operations
  - `Syncer.ts` (37 lines) - Core orchestration
  - `types/config.ts` (30 lines) - Type definitions

#### TypeScript
- Added mocha types to tsconfig for test support
- Improved type safety across codebase
- Zero compilation errors

### 📦 Dependencies
- Added: `svelte`, `vite`, `@sveltejs/vite-plugin-svelte`
- Added: `@vscode/codicons` for icons
- Updated: `@types/node` to latest for Vite compatibility

## [0.2.0] - 2026-01-13

### 🎉 Major Features

#### Real-time Auto-Sync
- **Auto-sync on change**: Automatically push settings when VS Code configuration files change
- **Smart debouncing**: 5-second delay to prevent excessive cloud uploads
- **Configuration toggle**: `cecs.autoSync` setting to enable/disable
- Monitors `settings.json`, `keybindings.json`, and `snippets/` directory

#### Modern UI/UX Overhaul
- **✨ Glassmorphism design**: Beautiful semi-transparent cards with blur effects
- **🎨 Smooth animations**: FadeIn, slideUp, slideDown, and hover transitions
- **🔄 Floating sync indicator**: Real-time \"Syncing...\" status in bottom-right corner
- **📊 Improved layouts**: Clean, modern provider and profile cards
- **🎯 Gradient buttons**: Eye-catching sync button with purple gradient

#### VS Code Native Profile Integration
- **Automatic profile detection**: Reads all VS Code profiles from `profiles.json`
- **Complete profile sync**: Default + all custom profiles synced together
- **Cross-editor compatible**: Works with VS Code, Cursor, Windsurf, VSCodium
- **Profile display**: Shows all synced profiles in sidebar UI
- Push from any profile → all profiles backed up
- Pull to new machine → all profiles restored

#### Automatic Extension Installation
- **One-click install**: Missing extensions installed automatically when pulling
- **Progress indicator**: Real-time installation progress with extension names
- **Smart detection**: Compares installed vs. required extensions
- **Error handling**: Gracefully handles installation failures
- **Configuration toggle**: `cecs.autoInstallExtensions` setting (default: true)
- **Reload prompt**: Offers to reload window after successful installation

### 🐛 Bug Fixes
- Fixed provider deletion button not working (CSP inline onclick issue)
- Resolved event delegation pattern for better CSP compliance

### 🔧 Infrastructure
- Migrated to ESLint v9 Flat Config
- Updated TypeScript and linting rules
- Improved bundling with esbuild
- Code quality improvements with Prettier integration

## [0.0.1] - 2026-01-07

### Added
- Multi-profile synchronization support
- GitHub Gist integration for cloud backup
- Local file storage provider
- Unified single-screen UI
- Support for VS Code, Cursor, Antigravity, Windsurf, VSCodium, and IDX
- Automatic profile detection and backup
- Settings, keybindings, snippets, and extensions sync
- Multi-provider support (use multiple backup locations)
