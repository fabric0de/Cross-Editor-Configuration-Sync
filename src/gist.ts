import { Octokit } from '@octokit/rest';

export class GistSyncer {
    private octokit: Octokit;
    private gistId: string | null;

    constructor(token: string, gistId?: string) {
        this.octokit = new Octokit({
            auth: token
        });
        this.gistId = gistId || null;
    }

    public async createGist(description: string, files: { [key: string]: { content: string } }) {
        const response = await this.octokit.gists.create({
            description,
            public: false,
            files
        });
        this.gistId = response.data.id || null;
        return this.gistId;
    }

    public async updateGist(files: { [key: string]: { content: string } }) {
        if (!this.gistId) {
            throw new Error('Gist ID is not set. Cannot update.');
        }

        await this.octokit.gists.update({
            gist_id: this.gistId,
            files
        });
    }

    public async getGist() {
        if (!this.gistId) {
            throw new Error('Gist ID is not set.');
        }

        const response = await this.octokit.gists.get({
            gist_id: this.gistId
        });
        return response.data;
    }
}
