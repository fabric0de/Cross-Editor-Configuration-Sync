// Core type definitions for configuration sync
import type { ProfilesMetadata } from '../../storage/IStorageProvider';

export interface ProfileConfig {
    name: string;
    icon?: string;
    location: string;
    settings?: any;
    keybindings?: any[];
    snippets?: { [name: string]: any };
    extensions: string[];
}

export interface EditorConfig {
    default: {
        settings: any;
        keybindings: any[];
        snippets: { [name: string]: any };
        extensions: string[];
    };
    profiles?: {
        metadata: ProfilesMetadata;
        custom: ProfileConfig[];
    };
}

export interface SyncOptions {
    includeExtensions?: boolean;
    includeProfiles?: boolean;
    autoInstall?: boolean;
}
