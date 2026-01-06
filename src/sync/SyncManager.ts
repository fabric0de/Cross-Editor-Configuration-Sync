import { window, SecretStorage } from 'vscode';
import { extractConfig, applyLocalConfig } from '../syncer';
import { GistProvider } from '../storage/GistProvider';
import { LocalFileProvider } from '../storage/LocalFileProvider';
import { IStorageProvider, EditorConfig, SavedProvider } from '../storage/IStorageProvider';

export class SyncManager {

    constructor(private readonly secrets: SecretStorage) { }

    /**
     * 저장된 모든 Provider의 인스턴스를 초기화하여 반환
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
            throw new Error('연결된 저장소가 없습니다. 먼저 저장소를 추가하세요.');
        }

        const instances: IStorageProvider[] = [];
        const token = await this.secrets.get('cecs_github_token');
        const gistId = await this.secrets.get('cecs_gist_id');

        for (const saved of savedProviders) {
            try {
                if (saved.type === 'gist' || saved.type === 'github') {
                    if (!token) continue; // Skip if no token
                    const p = new GistProvider();
                    
                    try {
                        await p.connect({ token, gistId });
                    } catch (error: any) {
                        // If Gist ID is invalid, try creating a new one
                        if (error.message.includes('유효하지 않은 Gist ID')) {
                            console.log('Invalid Gist ID detected, creating new Gist...');
                            await this.secrets.delete('cecs_gist_id');
                            await p.connect({ token }); // Create new Gist
                        } else {
                            throw error;
                        }
                    }
                    
                    // Update Gist ID if missing or recreated
                    if (p.getGistId()) {
                        await this.secrets.store('cecs_gist_id', p.getGistId()!);
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
            throw new Error('유효한 저장소 연결이 없습니다.');
        }

        return instances;
    }

    /**
     * Push: 로컬 설정을 모든 저장소에 업로드
     */
    async push(): Promise<void> {
        try {
            window.showInformationMessage('⬆️ Syncing to all providers...');

            const config = await extractConfig();
            const providers = await this.initProviders();

            const results = await Promise.allSettled(providers.map(p => p.write(config)));

            const failed = results.filter(r => r.status === 'rejected');
            if (failed.length > 0) {
                window.showWarningMessage(`Some providers failed (${failed.length}/${providers.length})`);
            } else {
                window.showInformationMessage('✅ All providers updated!');
            }
        } catch (error: any) {
            window.showErrorMessage(`Upload failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Pull: 저장소에서 설정을 다운로드 (첫 번째 성공한 것 사용 or 병합?)
     * 현재 정책: 첫 번째로 성공한 Provider의 설정을 사용 (우선순위: 리스트 순서)
     */
    async pull(): Promise<void> {
        try {
            window.showInformationMessage('⬇️ Downloading from providers...');

            const providers = await this.initProviders();
            let config: EditorConfig | null = null;
            let successProvider = '';

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
     * Sync: Push (Pull은 아직 미니멀하게)
     */
    async sync(): Promise<void> {
        await this.push();
        // await this.pull(); // Conflict resolution is hard
    }
}
