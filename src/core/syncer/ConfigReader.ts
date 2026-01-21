// Configuration Reader - reads local config and profiles
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as jsonc from 'jsonc-parser';
import type { EditorConfig, ProfileConfig } from '../types/config';
import type { ProfilesMetadata } from '../../storage/IStorageProvider';
import { getUserDataDir, EditorType } from '../../paths';

export class ConfigReader {
    private userDataDir: string;

    constructor(editorType: EditorType) {
        this.userDataDir = getUserDataDir(editorType);
    }

    /**
     * Read local configuration (default + all profiles)
     */
    async readLocalConfig(): Promise<EditorConfig> {
        // Read default profile
        const defaultConfig = {
            settings: await this.readSettings(path.join(this.userDataDir, 'settings.json')),
            keybindings: await this.readKeybindings(
                path.join(this.userDataDir, 'keybindings.json')
            ),
            snippets: await this.readSnippets(path.join(this.userDataDir, 'snippets')),
            extensions: await this.getInstalledExtensions()
        };

        // Read all profiles
        const profileMetadata = await this.readProfileMetadata();
        const customProfiles = await this.readAllProfiles();

        return {
            default: defaultConfig,
            profiles: profileMetadata
                ? {
                      metadata: profileMetadata,
                      custom: customProfiles
                  }
                : undefined
        };
    }

    /**
     * Read settings.json
     */
    async readSettings(settingsPath: string): Promise<any> {
        try {
            if (!fs.existsSync(settingsPath)) {
                return {};
            }
            const content = fs.readFileSync(settingsPath, 'utf8');
            return jsonc.parse(content) || {};
        } catch (error) {
            console.error('Error reading settings:', error);
            return {};
        }
    }

    /**
     * Read keybindings.json
     */
    async readKeybindings(keybindingsPath: string): Promise<any[]> {
        try {
            if (!fs.existsSync(keybindingsPath)) {
                return [];
            }
            const content = fs.readFileSync(keybindingsPath, 'utf8');
            return jsonc.parse(content) || [];
        } catch (error) {
            console.error('Error reading keybindings:', error);
            return [];
        }
    }

    /**
     * Read all snippets
     */
    async readSnippets(snippetsDir: string): Promise<{ [name: string]: any }> {
        const snippets: { [name: string]: any } = {};

        try {
            if (!fs.existsSync(snippetsDir)) {
                return snippets;
            }

            const files = fs.readdirSync(snippetsDir);
            for (const file of files) {
                if (file.endsWith('.json') || file.endsWith('.code-snippets')) {
                    const content = fs.readFileSync(path.join(snippetsDir, file), 'utf8');
                    snippets[file] = jsonc.parse(content) || {};
                }
            }
        } catch (error) {
            console.error('Error reading snippets:', error);
        }

        return snippets;
    }

    /**
     * Get installed extensions
     */
    async getInstalledExtensions(): Promise<string[]> {
        return vscode.extensions.all
            .filter((ext) => !ext.packageJSON.isBuiltin)
            .map((ext) => ext.id);
    }

    /**
     * Read profiles metadata from globalStorage/storage.json -> userDataProfiles
     * We no longer read from profiles.json as it is considered legacy/unused.
     */
    async readProfileMetadata(): Promise<ProfilesMetadata | null> {
        try {
            const allProfiles: Array<{ name: string; location: string; icon?: string }> = [];
            const seenLocations = new Set<string>();

            // Read from globalStorage/storage.json -> userDataProfiles
            const storageJsonPath = path.join(this.userDataDir, 'globalStorage', 'storage.json');
            if (fs.existsSync(storageJsonPath)) {
                const storageContent = fs.readFileSync(storageJsonPath, 'utf8');
                const storageData = jsonc.parse(storageContent);
                const userDataProfiles = storageData?.userDataProfiles as
                    | Array<{ name: string; location: string; icon?: string }>
                    | undefined;

                if (userDataProfiles) {
                    for (const profile of userDataProfiles) {
                        if (!seenLocations.has(profile.location)) {
                            allProfiles.push(profile);
                            seenLocations.add(profile.location);
                        }
                    }
                }
            }

            if (allProfiles.length === 0) {
                return null;
            }

            return { profiles: allProfiles };
        } catch (error) {
            console.error('Error reading profile metadata:', error);
            return null;
        }
    }

    /**
     * Read extensions.json from profile directory
     * Handles both VS Code's object format [{identifier: {id: "ext.id"}}] and simple string array ["ext.id"]
     */
    async readExtensions(extensionsPath: string): Promise<string[]> {
        try {
            if (!fs.existsSync(extensionsPath)) {
                return [];
            }
            const content = fs.readFileSync(extensionsPath, 'utf8');
            const parsed = jsonc.parse(content);
            if (!Array.isArray(parsed)) {
                return [];
            }
            // Handle both formats: object array (VS Code format) or string array
            return parsed
                .map((item: any) => {
                    if (typeof item === 'string') {
                        return item;
                    }
                    // VS Code extensions.json format: { identifier: { id: "publisher.name" } }
                    if (item?.identifier?.id) {
                        return item.identifier.id;
                    }
                    return null;
                })
                .filter((id): id is string => id !== null);
        } catch (error) {
            console.error('Error reading profile extensions:', error);
            return [];
        }
    }

    /**
     * Read all custom profiles
     */
    async readAllProfiles(): Promise<ProfileConfig[]> {
        const profiles: ProfileConfig[] = [];
        const metadata = await this.readProfileMetadata();

        if (!metadata || !metadata.profiles) {
            return profiles;
        }

        const profilesDir = path.join(this.userDataDir, 'profiles');

        for (const profile of metadata.profiles) {
            const profilePath = path.join(profilesDir, profile.location);
            const exists = fs.existsSync(profilePath);

            const profileConfig: ProfileConfig = {
                name: profile.name,
                icon: profile.icon,
                location: profile.location,
                settings: exists
                    ? await this.readSettings(path.join(profilePath, 'settings.json'))
                    : {},
                keybindings: exists
                    ? await this.readKeybindings(path.join(profilePath, 'keybindings.json'))
                    : [],
                snippets: exists ? await this.readSnippets(path.join(profilePath, 'snippets')) : {},
                extensions: exists
                    ? await this.readExtensions(path.join(profilePath, 'extensions.json'))
                    : []
            };

            profiles.push(profileConfig);
        }

        return profiles;
    }
}
