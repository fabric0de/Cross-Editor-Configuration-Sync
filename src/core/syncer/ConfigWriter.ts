// Configuration Writer - writes config and profiles
import * as fs from 'fs';
import * as path from 'path';
import type { EditorConfig } from '../types/config';
import { getUserDataDir, EditorType } from '../../paths';

export class ConfigWriter {
    private userDataDir: string;

    constructor(editorType: EditorType) {
        this.userDataDir = getUserDataDir(editorType);
    }

    /**
     * Write local configuration
     */
    async writeLocalConfig(config: EditorConfig): Promise<void> {
        const userDataPath = this.userDataDir;
        const userDir = path.join(userDataPath, 'User');

        // Write default profile
        await this.writeSettings(path.join(userDir, 'settings.json'), config.default.settings);
        await this.writeKeybindings(
            path.join(userDir, 'keybindings.json'),
            config.default.keybindings
        );
        await this.writeSnippets(path.join(userDir, 'snippets'), config.default.snippets);

        // Write profiles if present
        if (config.profiles) {
            // Write profiles.json
            await this.writeProfileMetadata(config.profiles.metadata);

            // Write custom profiles
            await this.restoreCustomProfiles(config.profiles.custom);
        }
    }

    /**
     * Write settings.json
     */
    async writeSettings(settingsPath: string, settings: any): Promise<void> {
        try {
            const dir = path.dirname(settingsPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 4), 'utf8');
        } catch (error) {
            console.error('Error writing settings:', error);
            throw error;
        }
    }

    /**
     * Write keybindings.json
     */
    async writeKeybindings(keybindingsPath: string, keybindings: any[]): Promise<void> {
        try {
            const dir = path.dirname(keybindingsPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            fs.writeFileSync(keybindingsPath, JSON.stringify(keybindings, null, 4), 'utf8');
        } catch (error) {
            console.error('Error writing keybindings:', error);
            throw error;
        }
    }

    /**
     * Write snippets
     */
    async writeSnippets(snippetsDir: string, snippets: { [name: string]: any }): Promise<void> {
        try {
            if (!fs.existsSync(snippetsDir)) {
                fs.mkdirSync(snippetsDir, { recursive: true });
            }

            for (const [filename, content] of Object.entries(snippets)) {
                const snippetPath = path.join(snippetsDir, filename);
                fs.writeFileSync(snippetPath, JSON.stringify(content, null, 4), 'utf8');
            }
        } catch (error) {
            console.error('Error writing snippets:', error);
            throw error;
        }
    }

    /**
     * Write profiles.json metadata
     */
    async writeProfileMetadata(metadata: any): Promise<void> {
        try {
            const profilesJsonPath = path.join(this.userDataDir, 'profiles.json');
            const dir = path.dirname(profilesJsonPath);

            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            fs.writeFileSync(profilesJsonPath, JSON.stringify(metadata, null, 4), 'utf8');
        } catch (error) {
            console.error('Error writing profile metadata:', error);
            throw error;
        }
    }

    /**
     * Restore custom profiles
     */
    async restoreCustomProfiles(profiles: any[]): Promise<void> {
        const profilesDir = path.join(this.userDataDir, 'profiles');

        for (const profile of profiles) {
            const profilePath = path.join(profilesDir, profile.location);

            // Create profile directory
            if (!fs.existsSync(profilePath)) {
                fs.mkdirSync(profilePath, { recursive: true });
            }

            // Write profile data
            if (profile.settings) {
                await this.writeSettings(path.join(profilePath, 'settings.json'), profile.settings);
            }

            if (profile.keybindings) {
                await this.writeKeybindings(
                    path.join(profilePath, 'keybindings.json'),
                    profile.keybindings
                );
            }

            if (profile.snippets) {
                await this.writeSnippets(path.join(profilePath, 'snippets'), profile.snippets);
            }
        }
    }
}
