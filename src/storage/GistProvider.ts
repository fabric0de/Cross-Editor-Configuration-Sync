import { Octokit } from '@octokit/rest';
import { IStorageProvider, EditorConfig } from './IStorageProvider';

export class GistProvider implements IStorageProvider {
    private octokit?: Octokit;
    private gistId?: string;
    private connected = false;

    async connect(credentials: { token: string; gistId?: string }): Promise<void> {
        this.octokit = new Octokit({
            auth: credentials.token
        });

        // Use Gist ID if provided, otherwise search for existing or create new
        if (credentials.gistId) {
            this.gistId = credentials.gistId;
            // Validation
            try {
                await this.octokit.gists.get({ gist_id: this.gistId });
                this.connected = true;
            } catch {
                throw new Error('Invalid Gist ID.');
            }
        } else {
            // Search for existing CECS Gist
            const gists = await this.octokit.gists.list();
            const existingGist = gists.data.find(
                (gist) => gist.description === 'CECS Configuration Sync'
            );

            if (existingGist) {
                // Reuse existing Gist
                this.gistId = existingGist.id;
                this.connected = true;
            } else {
                // Create new Gist only if none exists
                const response = await this.octokit.gists.create({
                    description: 'CECS Configuration Sync',
                    public: false,
                    files: {
                        'config.json': {
                            content: JSON.stringify(
                                {
                                    settings: {},
                                    keybindings: [],
                                    snippets: {},
                                    extensions: []
                                },
                                null,
                                2
                            )
                        }
                    }
                });
                this.gistId = response.data.id;
                this.connected = true;
            }
        }
    }

    async read(): Promise<EditorConfig | null> {
        if (!this.octokit || !this.gistId) {
            throw new Error('Please call connect() first.');
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
            throw new Error('Please call connect() first.');
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
