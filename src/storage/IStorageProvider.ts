// Option B: Complete structure redesign
export interface EditorConfig {
    // Default profile (clearly separated)
    default: {
        settings: any;
        keybindings: any[];
        snippets: { [name: string]: any };
        extensions: string[];
    };
    // Profile system
    profiles?: {
        metadata: ProfilesMetadata; // profiles.json content
        custom: ProfileConfig[]; // Custom profile data
    };
}

export interface ProfilesMetadata {
    profiles: Array<{
        name: string;
        location: string;
        icon?: string;
        useDefaultFlags?: any;
    }>;
}

export interface ProfileConfig {
    name: string;
    icon?: string;
    location: string;
    settings?: any;
    keybindings?: any[];
    snippets?: { [name: string]: any };
    extensions: string[];
}

export interface SavedProvider {
    id: string;
    type: 'gist' | 'github' | 'local';
    name?: string;
    config?: any; // e.g. path for local
    createdAt: number;
}

export interface IStorageProvider {
    /**
     * Connect and authenticate to the storage.
     */
    connect(credentials: any): Promise<void>;

    /**
     * Read configuration data from the storage.
     */
    read(): Promise<EditorConfig | null>;

    /**
     * Write configuration data to the storage.
     */
    write(config: EditorConfig): Promise<void>;

    /**
     * Check the connection status.
     */
    isConnected(): boolean;
}
