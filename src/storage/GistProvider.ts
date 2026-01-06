import { Octokit } from '@octokit/rest';
import { IStorageProvider, EditorConfig } from './IStorageProvider';

export class GistProvider implements IStorageProvider {
    private octokit?: Octokit;
    private gistId?: string;
    private connected: boolean = false;

    async connect(credentials: { token: string; gistId?: string }): Promise<void> {
        this.octokit = new Octokit({
            auth: credentials.token
        });

        // Gist ID가 제공되면 사용, 아니면 새로 생성
        if (credentials.gistId) {
            this.gistId = credentials.gistId;
            // 유효성 검증
            try {
                await this.octokit.gists.get({ gist_id: this.gistId });
                this.connected = true;
            } catch (error) {
                throw new Error('유효하지 않은 Gist ID입니다.');
            }
        } else {
            // 새 Gist 생성
            const response = await this.octokit.gists.create({
                description: 'CECS Configuration Sync',
                public: false,
                files: {
                    'config.json': {
                        content: JSON.stringify({
                            settings: {},
                            keybindings: [],
                            snippets: {},
                            extensions: []
                        }, null, 2)
                    }
                }
            });
            this.gistId = response.data.id;
            this.connected = true;
        }
    }

    async read(): Promise<EditorConfig | null> {
        if (!this.octokit || !this.gistId) {
            throw new Error('먼저 connect()를 호출하세요.');
        }

        const response = await this.octokit.gists.get({
            gist_id: this.gistId
        });

        const files = response.data.files;
        if (!files || !files['config.json']?.content) {
            return null;
        }

        // Read entire config from single file
        return JSON.parse(files['config.json'].content);
    }

    async write(config: EditorConfig): Promise<void> {
        if (!this.octokit || !this.gistId) {
            throw new Error('먼저 connect()를 호출하세요.');
        }

        // Save entire config as a single file (same format as LocalFileProvider)
        const files: any = {
            'config.json': {
                content: JSON.stringify(config, null, 2)
            }
        };

        await this.octokit.gists.update({
            gist_id: this.gistId,
            files
        });
    }

    isConnected(): boolean {
        return this.connected;
    }

    getGistId(): string | undefined {
        return this.gistId;
    }
}
