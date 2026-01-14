import { window, SecretStorage } from 'vscode';
import { extractConfig, applyLocalConfig } from '../syncer';
import { GistProvider } from '../storage/GistProvider';
import { LocalFileProvider } from '../storage/LocalFileProvider';
import { IStorageProvider, EditorConfig, SavedProvider } from '../storage/IStorageProvider';

export class SyncManager {
    private pushTimer?: NodeJS.Timeout;

    constructor(private readonly secrets: SecretStorage) {}

    /**
     * Initialize and return instances of all saved providers.
     */
    private async initProviders(): Promise<IStorageProvider[]> {
        const providersStr = await this.secrets.get('cecs_providers');
        let savedProviders: SavedProvider[] = [];

        try {
            if (providersStr) {
                savedProviders = JSON.parse(providersStr);
            }
        } catch (e) {
            console.error('Failed to parse providers', e);
        }

        // Migration: If no new list, check old single provider
        if (savedProviders.length === 0) {
            const oldType = await this.secrets.get('cecs_provider');
            if (oldType) {
                const legacyProvider: SavedProvider = {
                    id: 'legacy_1',
                    type: oldType as any,
                    name: oldType === 'local' ? 'Local Storage' : 'Gist Storage',
                    createdAt: Date.now()
                };
                savedProviders.push(legacyProvider);
            }
        }

        if (savedProviders.length === 0) {
            throw new Error('No linked storage. Please add a storage first.');
        }

        const instances: IStorageProvider[] = [];
        const token = await this.secrets.get('cecs_github_token');
        const gistId = await this.secrets.get('cecs_gist_id');

        for (const saved of savedProviders) {
            try {
                if (saved.type === 'gist' || saved.type === 'github') {
                    if (!token) {
                        continue;
                    } // Skip if no token
                    const p = new GistProvider();

                    try {
                        await p.connect({ token, gistId });
                    } catch (error: any) {
                        // If Gist ID is invalid, try creating a new one
                        if (error.message.includes('Invalid Gist ID')) {
                            console.log('Invalid Gist ID detected, creating new Gist...');
                            await this.secrets.delete('cecs_gist_id');
                            await p.connect({ token }); // Create new Gist
                        } else {
                            throw error;
                        }
                    }

                    // Update Gist ID if missing or recreated
                    const newGistId = p.getGistId();
                    if (newGistId) {
                        await this.secrets.store('cecs_gist_id', newGistId);
                    }
                    instances.push(p);
                } else if (saved.type === 'local') {
                    const p = new LocalFileProvider();
                    // If specific config overrides exist, we could pass them here
                    // e.g., p.setPath(saved.config.path)
                    await p.connect();
                    instances.push(p);
                }
            } catch (e) {
                console.error(`Failed to init provider ${saved.type}`, e);
            }
        }

        if (instances.length === 0) {
            throw new Error('No valid storage connection found.');
        }

        return instances;
    }

    /**
     * Push: Upload local settings to all providers.
     * @param quiet If true, minimal notification will be shown.
     */
    async push(quiet = false): Promise<void> {
        try {
            if (!quiet) {
                window.showInformationMessage('Syncing to all providers...');
            }

            const config = await extractConfig();
            const providers = await this.initProviders();

            const results = await Promise.allSettled(providers.map((p) => p.write(config)));

            const failed = results.filter((r) => r.status === 'rejected');
            if (failed.length > 0) {
                window.showWarningMessage(
                    `Some providers failed (${failed.length}/${providers.length})`
                );
            } else if (!quiet) {
                window.showInformationMessage('✅ All providers updated!');
            }
        } catch (error: any) {
            window.showErrorMessage(`Upload failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Pull: Download settings from providers.
     * Policy: Use settings from the first successful provider (Priority: list order).
     */
    async pull(): Promise<void> {
        try {
            window.showInformationMessage('Downloading from providers...');

            const providers = await this.initProviders();
            let config: EditorConfig | null = null;

            for (const p of providers) {
                try {
                    const c = await p.read();
                    if (c) {
                        config = c;
                        // successProvider = p.constructor.name;
                        break; // Found valid config
                    }
                } catch (e) {
                    console.warn('Read failed', e);
                }
            }

            if (!config) {
                window.showWarningMessage('No settings found in any provider.');
                return;
            }

            await applyLocalConfig(config);
            window.showInformationMessage('✅ Settings downloaded and applied!');
        } catch (error: any) {
            window.showErrorMessage(`Download failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Debounced push for auto-sync.
     */
    async debouncedPush(delay = 5000): Promise<void> {
        if (this.pushTimer) {
            clearTimeout(this.pushTimer);
        }

        this.pushTimer = setTimeout(async () => {
            try {
                await this.push(true);
            } catch (e) {
                console.error('Auto-push failed', e);
            }
        }, delay);
    }

    /**
     * Sync: Push (Pull is still minimal).
     */
    async sync(): Promise<void> {
        await this.push();
        // await this.pull(); // Conflict resolution is hard
    }
}
