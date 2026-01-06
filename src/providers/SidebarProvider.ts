import {
    WebviewView,
    WebviewViewProvider,
    Uri,
    window,
    SecretStorage,
    authentication,
    commands,
    workspace
} from 'vscode';
import { getHtmlForWebview } from './ViewContent';

export class SidebarProvider implements WebviewViewProvider {
    _view?: WebviewView;

    constructor(
        private readonly _extensionUri: Uri,
        private readonly _secrets: SecretStorage
    ) {}

    public resolveWebviewView(webviewView: WebviewView) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        // Use shared view content
        webviewView.webview.html = getHtmlForWebview(webviewView.webview, this._extensionUri);

        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'saveToken': {
                    try {
                        await this._secrets.store('cecs_github_token', data.token);
                        // Add provider to list
                        await this._addProvider('gist', 'Gist Storage');

                        window.showInformationMessage('✅ GitHub token saved successfully!');
                        this._sendState();
                    } catch (e: any) {
                        window.showErrorMessage(`Failed to save token: ${e.message}`);
                    }
                    break;
                }
                case 'startOAuth': {
                    const provider = data.provider;
                    if (provider === 'gist' || provider === 'github') {
                        await this._startGitHubAuth();
                    }
                    break;
                }
                case 'connectLocal': {
                    const home = process.env.HOME || process.env.USERPROFILE || '';
                    const config = workspace.getConfiguration('cecs');
                    const customPath = config.get<string>('localBackupPath');
                    const finalPath = customPath
                        ? `${customPath}/config.json`
                        : `${home}/.cecs/config.json`;

                    await this._addProvider('local', 'Local File', { path: finalPath });

                    window.showInformationMessage(`✅ Local storage connected! (${finalPath})`);
                    this._sendState();
                    break;
                }
                case 'changeLocalPath': {
                    const uri = await window.showOpenDialog({
                        canSelectFiles: false,
                        canSelectFolders: true,
                        canSelectMany: false,
                        openLabel: '백업 폴더 선택'
                    });
                    if (uri && uri[0]) {
                        const newPath = uri[0].fsPath;
                        await workspace
                            .getConfiguration('cecs')
                            .update('localBackupPath', newPath, true);
                        window.showInformationMessage(
                            `✅ Storage path changed. Please reconnect local storage.`
                        );
                        this._view?.webview.postMessage({ type: 'pathChanged', path: newPath });
                    }
                    break;
                }
                case 'action': {
                    const cmd = data.cmd;
                    commands.executeCommand(`cecs.${cmd}`);
                    break;
                }
                case 'checkState': {
                    await this._sendState();
                    break;
                }
                case 'removeProvider': {
                    await this._removeProvider(data.id);
                    this._sendState();
                    break;
                }
                case 'reset': {
                    // Legacy clear all
                    await this._secrets.delete('cecs_providers');
                    await this._secrets.delete('cecs_provider');
                    this._sendState();
                    break;
                }
            }
        });
    }

    // Helper to add provider
    private async _addProvider(type: 'gist' | 'local', name: string, config?: any) {
        try {
            const existingStr = await this._secrets.get('cecs_providers');
            const providers: any[] = existingStr ? JSON.parse(existingStr) : [];

            // Check for duplicates
            const isDuplicate = providers.some((p) => {
                if (p.type !== type) {
                    return false;
                }

                // For local providers, check if path is the same
                if (type === 'local' && config?.path) {
                    return p.config?.path === config.path;
                }

                // For gist, just check type (one gist per account)
                if (type === 'gist') {
                    return true; // Already have a gist provider
                }

                return false;
            });

            if (isDuplicate) {
                window.showWarningMessage(`This ${type} provider is already connected.`);
                return;
            }

            const newProvider = {
                id: Date.now().toString(),
                type,
                name,
                config,
                createdAt: Date.now()
            };

            providers.push(newProvider);
            await this._secrets.store('cecs_providers', JSON.stringify(providers));
        } catch (e: any) {
            window.showErrorMessage(`Failed to add provider: ${e.message}`);
        }
    }

    // Helper to remove provider
    private async _removeProvider(id: string) {
        try {
            const existingStr = await this._secrets.get('cecs_providers');
            if (!existingStr) {
                return;
            }

            let providers: any[] = JSON.parse(existingStr);
            providers = providers.filter((p) => p.id !== id);
            await this._secrets.store('cecs_providers', JSON.stringify(providers));
        } catch (e: any) {
            window.showErrorMessage(`Failed to remove provider: ${e.message}`);
        }
    }

    // Helper to send current state
    private async _sendState() {
        let providers: any[] = [];
        try {
            const providersStr = await this._secrets.get('cecs_providers');

            if (providersStr) {
                providers = JSON.parse(providersStr);
            } else {
                // Migration check
                try {
                    const oldType = await this._secrets.get('cecs_provider');
                    if (oldType) {
                        const home = process.env.HOME || process.env.USERPROFILE || '';
                        const legacyConfig =
                            oldType === 'local' ? { path: `${home}/.cecs/config.json` } : undefined;

                        providers = [
                            {
                                id: 'legacy',
                                type: oldType,
                                name: oldType === 'local' ? 'Local Storage' : 'Gist',
                                config: legacyConfig
                            }
                        ];
                        // Migrate immediately? Try to store but don't block
                        try {
                            await this._secrets.store('cecs_providers', JSON.stringify(providers));
                        } catch (e: any) {
                            console.warn('Migration save failed', e);
                        }
                    }
                } catch (e) {
                    console.warn('Migration check failed', e);
                }
            }
        } catch (e: any) {
            console.error('Failed to read state', e);
        } finally {
            this._view?.webview.postMessage({ type: 'connected', providers });
        }
    }

    public revive(panel: WebviewView) {
        this._view = panel;
    }

    private async _startGitHubAuth() {
        try {
            const session = await authentication.getSession('github', ['gist'], {
                createIfNone: true
            });

            if (session) {
                await this._secrets.store('cecs_github_token', session.accessToken);

                await this._addProvider('gist', `Gist (${session.account.label})`);

                window.showInformationMessage(
                    `✅ GitHub login successful! (${session.account.label})`
                );
                this._sendState();
            }
        } catch (error: any) {
            window.showErrorMessage(`GitHub authentication failed: ${error.message}`);
        }
    }
}
