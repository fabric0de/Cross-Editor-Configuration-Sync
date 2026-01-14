import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { parse } from 'jsonc-parser';
import { EditorType, getUserDataDir } from './paths';
import type { EditorConfig, ProfileConfig, ProfilesMetadata } from './storage/IStorageProvider';

export class Syncer {
    private userDataDir: string;

    constructor(editorType: EditorType) {
        this.userDataDir = getUserDataDir(editorType);
    }

    public async readLocalConfig(): Promise<EditorConfig> {
        console.log(`Reading config from ${this.userDataDir}`);

        const settingsPath = path.join(this.userDataDir, 'settings.json');
        const keybindingsPath = path.join(this.userDataDir, 'keybindings.json');
        const snippetsDir = path.join(this.userDataDir, 'snippets');

        const settings = this.readJsonFile(settingsPath);
        const keybindings = this.readJsonFile(keybindingsPath) || [];
        const snippets = this.readSnippets(snippetsDir);
        const extensions = await this.getExtensions();

        // Read all profiles
        const allProfiles = await this.readAllProfiles();
        const profilesMetadata = this.readProfileMetadata();

        const config: EditorConfig = {
            default: {
                settings,
                keybindings,
                snippets,
                extensions
            }
        };

        // Add profiles if they exist
        if (profilesMetadata && allProfiles.custom.length > 0) {
            config.profiles = {
                metadata: profilesMetadata,
                custom: allProfiles.custom
            };
        }

        return config;
    }

    private readJsonFile(filePath: string): any {
        if (fs.existsSync(filePath)) {
            try {
                // Strip comments if necessary (JSONC). VS Code files are often JSONC.
                // Simple workaround: use a JSONC parser or just simple strip if simple.
                // For now, let's assume standard JSON or try to parse.
                // In production, use 'jsonc-parser'.
                const content = fs.readFileSync(filePath, 'utf8');
                return parse(content) || {};
            } catch (e) {
                console.error(`Failed to parse ${filePath}`, e);
                return {};
            }
        }
        return {};
    }

    private readSnippets(dirPath: string): { [name: string]: any } {
        const snippets: { [name: string]: any } = {};
        if (fs.existsSync(dirPath)) {
            const files = fs.readdirSync(dirPath);
            for (const file of files) {
                if (file.endsWith('.json') || file.endsWith('.code-snippets')) {
                    snippets[file] = this.readJsonFile(path.join(dirPath, file));
                }
            }
        }
        return snippets;
    }

    private async getExtensions(): Promise<string[]> {
        // Use VS Code API to get installed extensions
        return vscode.extensions.all
            .filter((ext) => !ext.packageJSON.isBuiltin)
            .map((ext) => ext.id);
    }

    public async writeLocalConfig(config: EditorConfig): Promise<void> {
        if (!fs.existsSync(this.userDataDir)) {
            fs.mkdirSync(this.userDataDir, { recursive: true });
        }

        // Restore default profile
        if (config.default) {
            // Settings
            if (config.default.settings) {
                const settingsPath = path.join(this.userDataDir, 'settings.json');
                this.writeJsonFile(settingsPath, config.default.settings);
            }

            // Keybindings
            if (config.default.keybindings) {
                const keybindingsPath = path.join(this.userDataDir, 'keybindings.json');
                this.writeJsonFile(keybindingsPath, config.default.keybindings);
            }

            // Snippets
            if (config.default.snippets) {
                const snippetsDir = path.join(this.userDataDir, 'snippets');
                if (!fs.existsSync(snippetsDir)) {
                    fs.mkdirSync(snippetsDir, { recursive: true });
                }
                for (const [name, content] of Object.entries(config.default.snippets)) {
                    const snippetPath = path.join(snippetsDir, name);
                    this.writeJsonFile(snippetPath, content);
                }
            }

            // Extensions (only for current/default profile)
            if (config.default.extensions) {
                await this.installExtensions(config.default.extensions);
            }
        }

        // Restore profiles metadata and custom profiles
        if (config.profiles) {
            // Restore profiles.json
            const profilesJsonPath = path.join(this.userDataDir, 'profiles.json');
            this.writeJsonFile(profilesJsonPath, config.profiles.metadata);

            // Restore custom profile folders
            if (config.profiles.custom && config.profiles.custom.length > 0) {
                await this.restoreCustomProfiles(config.profiles.custom);
            }
        }
    }

    private writeJsonFile(filePath: string, content: any): void {
        try {
            fs.writeFileSync(filePath, JSON.stringify(content, null, 4), 'utf8');
        } catch (e) {
            console.error(`Failed to write ${filePath}`, e);
        }
    }

    /**
     * Read profiles.json metadata
     */
    private readProfileMetadata(): ProfilesMetadata | null {
        // Try standard profiles.json first (VS Code)
        const profilesJsonPath = path.join(this.userDataDir, 'profiles.json');
        if (fs.existsSync(profilesJsonPath)) {
            const data = this.readJsonFile(profilesJsonPath);
            if (data && data.profiles) {
                return data;
            }
        }

        // Try Antigravity's globalStorage/storage.json
        const storageJsonPath = path.join(this.userDataDir, 'globalStorage', 'storage.json');
        if (fs.existsSync(storageJsonPath)) {
            const data = this.readJsonFile(storageJsonPath);
            if (data && data.userDataProfiles) {
                // Convert to standard format
                return {
                    profiles: data.userDataProfiles
                };
            }
        }

        return null;
    }

    /**
     * Read all profiles (default + custom)
     */
    public async readAllProfiles(): Promise<{ default: ProfileConfig; custom: ProfileConfig[] }> {
        // Default profile
        const defaultProfile: ProfileConfig = {
            name: 'Default',
            location: '',
            settings: this.readJsonFile(path.join(this.userDataDir, 'settings.json')),
            keybindings: this.readJsonFile(path.join(this.userDataDir, 'keybindings.json')) || [],
            snippets: this.readSnippets(path.join(this.userDataDir, 'snippets')),
            extensions: await this.getExtensions()
        };

        const customProfiles: ProfileConfig[] = [];

        // Read profile metadata (works for both VS Code and Antigravity)
        const profilesMetadata = this.readProfileMetadata();
        if (!profilesMetadata || !profilesMetadata.profiles) {
            return { default: defaultProfile, custom: customProfiles };
        }

        const profilesDir = path.join(this.userDataDir, 'profiles');
        if (!fs.existsSync(profilesDir)) {
            return { default: defaultProfile, custom: customProfiles };
        }

        for (const profile of profilesMetadata.profiles) {
            const profileDir = path.join(profilesDir, profile.location);

            // Include profile even if folder doesn't exist (metadata-only)
            const profileConfig: ProfileConfig = {
                name: profile.name || 'Unnamed Profile',
                location: profile.location,
                icon: profile.icon,
                settings: fs.existsSync(profileDir)
                    ? this.readJsonFile(path.join(profileDir, 'settings.json'))
                    : {},
                keybindings: fs.existsSync(profileDir)
                    ? this.readJsonFile(path.join(profileDir, 'keybindings.json')) || []
                    : [],
                snippets: fs.existsSync(profileDir)
                    ? this.readSnippets(path.join(profileDir, 'snippets'))
                    : {},
                extensions: [] // Extensions are shared
            };

            customProfiles.push(profileConfig);
        }

        return { default: defaultProfile, custom: customProfiles };
    }

    /**
     * Restore custom profiles from backup data
     */
    public async restoreCustomProfiles(profiles: ProfileConfig[]): Promise<void> {
        if (!profiles || profiles.length === 0) {
            return;
        }

        const profilesDir = path.join(this.userDataDir, 'profiles');
        if (!fs.existsSync(profilesDir)) {
            fs.mkdirSync(profilesDir, { recursive: true });
        }

        // Read or create profiles.json
        const profilesJsonPath = path.join(this.userDataDir, 'profiles.json');
        const profilesMetadata: any = this.readProfileMetadata() || { profiles: [] };
        if (!profilesMetadata.profiles) {
            profilesMetadata.profiles = [];
        }

        for (const profile of profiles) {
            // Generate profile directory name (hash-like)
            const profileHash = `-${Date.now().toString(36)}${Math.random().toString(36).substr(2, 9)}`;
            const profileDir = path.join(profilesDir, profileHash);

            // Create profile directory
            if (!fs.existsSync(profileDir)) {
                fs.mkdirSync(profileDir, { recursive: true });
            }

            // Write profile settings
            if (profile.settings) {
                this.writeJsonFile(path.join(profileDir, 'settings.json'), profile.settings);
            }

            // Write profile keybindings
            if (profile.keybindings) {
                this.writeJsonFile(path.join(profileDir, 'keybindings.json'), profile.keybindings);
            }

            // Write profile snippets
            if (profile.snippets && Object.keys(profile.snippets).length > 0) {
                const snippetsDir = path.join(profileDir, 'snippets');
                if (!fs.existsSync(snippetsDir)) {
                    fs.mkdirSync(snippetsDir, { recursive: true });
                }
                for (const [name, content] of Object.entries(profile.snippets)) {
                    this.writeJsonFile(path.join(snippetsDir, name), content);
                }
            }

            // Add profile to metadata if not already present
            const existingProfile = profilesMetadata.profiles.find(
                (p: any) => p.name === profile.name
            );
            if (!existingProfile) {
                profilesMetadata.profiles.push({
                    name: profile.name,
                    location: profileHash,
                    icon: profile.icon || undefined
                });
            }
        }

        // Save updated profiles metadata
        this.writeJsonFile(profilesJsonPath, profilesMetadata);
    }

    private async installExtensions(extensions: string[]): Promise<void> {
        const currentExtensions = await this.getExtensions();
        const missingExtensions = extensions.filter((ext) => !currentExtensions.includes(ext));

        if (missingExtensions.length === 0) {
            return;
        }

        // Check if auto-install is enabled
        const config = vscode.workspace.getConfiguration('cecs');
        const autoInstall = config.get<boolean>('autoInstallExtensions', true);

        if (!autoInstall) {
            // Just notify if auto-install is disabled
            const message = `Missing ${missingExtensions.length} extension(s). Please install them manually.`;
            vscode.window.showInformationMessage(message);
            return;
        }

        // Auto-install extensions
        vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: `Installing ${missingExtensions.length} extension(s)...`,
                cancellable: false
            },
            async (progress) => {
                let installed = 0;
                const failed: string[] = [];

                for (const extensionId of missingExtensions) {
                    try {
                        progress.report({
                            message: `${extensionId} (${installed + 1}/${missingExtensions.length})`,
                            increment: 100 / missingExtensions.length
                        });

                        await vscode.commands.executeCommand(
                            'workbench.extensions.installExtension',
                            extensionId
                        );
                        installed++;
                    } catch (e) {
                        console.error(`Failed to install ${extensionId}`, e);
                        failed.push(extensionId);
                    }
                }

                // Show result
                if (failed.length === 0) {
                    vscode.window
                        .showInformationMessage(
                            `✅ Installed ${installed} extension(s)! Reload to activate.`,
                            'Reload Window'
                        )
                        .then((selection) => {
                            if (selection === 'Reload Window') {
                                vscode.commands.executeCommand('workbench.action.reloadWindow');
                            }
                        });
                } else {
                    vscode.window.showWarningMessage(
                        `Installed ${installed}/${missingExtensions.length} extensions. Failed: ${failed.join(', ')}`
                    );
                }
            }
        );
    }
}

/**
 * Helper function to extract config from current editor
 */
export async function extractConfig(): Promise<EditorConfig> {
    const { getCurrentEditorType } = await import('./paths');
    const editorType = getCurrentEditorType();
    const syncer = new Syncer(editorType);

    // readLocalConfig now returns the complete structure
    return await syncer.readLocalConfig();
}

/**
 * Helper function to apply config to current editor
 */
export async function applyLocalConfig(config: EditorConfig): Promise<void> {
    const { getCurrentEditorType } = await import('./paths');
    const editorType = getCurrentEditorType();
    const syncer = new Syncer(editorType);

    // Apply default profile (backward compatibility)
    await syncer.writeLocalConfig(config);

    // Apply custom profiles if present
    if (config.profiles?.custom && config.profiles.custom.length > 0) {
        await syncer.restoreCustomProfiles(config.profiles.custom);
        vscode.window.showInformationMessage(
            `Restored ${config.profiles.custom.length} custom profile(s). Please reload to see them.`
        );
    }
}
