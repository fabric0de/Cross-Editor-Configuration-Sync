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
     * Returns merged profiles if profiles were synced, or null
     */
    async writeLocalConfig(config: EditorConfig): Promise<any[]> {
        // userDataDir already points to the User directory (e.g., ~/Library/.../Antigravity/User)
        const userDir = this.userDataDir;

        // Write default profile
        await this.writeSettings(path.join(userDir, 'settings.json'), config.default.settings);
        await this.writeKeybindings(
            path.join(userDir, 'keybindings.json'),
            config.default.keybindings
        );
        await this.writeSnippets(path.join(userDir, 'snippets'), config.default.snippets);
        await this.writeExtensions(
            path.join(userDir, 'extensions.json'),
            config.default.extensions || []
        );

        let mergedProfiles: any[] = [];

        // Write profiles if present
        if (config.profiles) {
            // Get merged profile metadata (do NOT write to storage.json yet, as IDE will overwrite it)
            // We return this list to be handled by the detached helper script
            mergedProfiles = await this.getMergedProfiles(config.profiles.metadata);

            // Write custom profile data files (these won't be overwritten by IDE)
            await this.restoreCustomProfiles(config.profiles.custom);
        }

        return mergedProfiles;
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
     * Get merged profile metadata (read storage.json + merge new profiles)
     * Does NOT write to storage.json
     */
    async getMergedProfiles(metadata: any): Promise<any[]> {
        try {
            const storageJsonPath = path.join(this.userDataDir, 'globalStorage', 'storage.json');
            console.log('[CECS DEBUG] getMergedProfiles - reading:', storageJsonPath);

            // Read existing storage.json (even if potentially stale/cached by IDE, it's the best we have on disk)
            let storageData: any = {};
            if (fs.existsSync(storageJsonPath)) {
                const content = fs.readFileSync(storageJsonPath, 'utf8');
                storageData = JSON.parse(content);
            }

            // Merge profiles - keep existing profiles, add/update new ones
            const existingProfiles: any[] = storageData.userDataProfiles || [];
            const newProfiles: any[] = metadata.profiles || [];

            const seenLocations = new Set<string>();
            const seenNames = new Set<string>();
            const mergedProfiles: any[] = [];

            // Add new profiles first (they take priority)
            for (const profile of newProfiles) {
                // Ensure uniqueness by name as well
                if (!seenLocations.has(profile.location)) {
                    mergedProfiles.push({
                        name: profile.name,
                        location: profile.location,
                        ...(profile.icon && { icon: profile.icon })
                    });
                    seenLocations.add(profile.location);
                    seenNames.add(profile.name);
                }
            }

            // Keep existing profiles that weren't in new profiles AND don't share a name
            for (const profile of existingProfiles) {
                // Skip if duplicate location OR duplicate name
                // If a new profile has the same name as an old one, the new one (from Gist) wins.
                if (!seenLocations.has(profile.location) && !seenNames.has(profile.name)) {
                    mergedProfiles.push(profile);
                    seenLocations.add(profile.location);
                    seenNames.add(profile.name);
                }
            }

            console.log('[CECS DEBUG] Merged profiles count:', mergedProfiles.length);
            return mergedProfiles;
        } catch (error) {
            console.error('[CECS DEBUG] Error merging profile metadata:', error);
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

            if (profile.extensions && Array.isArray(profile.extensions)) {
                await this.writeExtensions(
                    path.join(profilePath, 'extensions.json'),
                    profile.extensions
                );
            }
        }
    }

    /**
     * Write extensions.json
     */
    async writeExtensions(extensionsPath: string, extensions: string[]): Promise<void> {
        try {
            const dir = path.dirname(extensionsPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(extensionsPath, JSON.stringify(extensions, null, 4), 'utf8');
        } catch (error) {
            console.error('Error writing extensions:', error);
            throw error;
        }
    }
}
