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
            localResourceRoots: [
                this._extensionUri,
                Uri.joinPath(this._extensionUri, 'dist', 'webview')
            ]
        };

        // Load HTML from Vite build
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

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
                        openLabel: 'Select Backup Folder'
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
                case 'refresh': {
                    // Refresh profiles
                    this._sendState();
                    window.showInformationMessage('✅ Profiles refreshed!');
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

        // Send initial state
        this._sendState();
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
                // Even if duplicate, we should send state to ensure UI is in sync
                this._sendState();
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
            console.error('_addProvider failed:', e);
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
                // Migration check logic...
            }
        } catch (e: any) {
            console.error('Failed to read providers state', e);
        }

        // ... (profiles reading)
        // ... (profiles code omitted for brevity, assuming it remains same)

        // Read profiles using new modular syncer
        let profiles: any = {};
        try {
            const { getCurrentEditorType } = await import('../paths');
            const { Syncer: syncerClass } = await import('../syncer');
            const editorType = getCurrentEditorType();
            const syncer = new syncerClass(editorType);
            const config = await syncer.readLocalConfig();

            profiles = {
                default: config.default,
                custom: config.profiles?.custom || []
            };
        } catch (e) {
            console.error('Failed to read profiles', e);
        }

        this._view?.webview.postMessage({ type: 'connected', providers, profiles });
    }

    public revive(panel: WebviewView) {
        this._view = panel;
    }

    private async _startGitHubAuth() {
        try {
            const session = await authentication.getSession(
                'github',
                ['repo', 'user:email', 'gist'],
                { createIfNone: true }
            );
            if (session) {
                await this._secrets.store('cecs_github_token', session.accessToken);
                await this._addProvider('gist', 'Gist Storage');
                window.showInformationMessage(`✅ Linked to GitHub (${session.account.label})`);
                this._sendState();
            }
        } catch (e: any) {
            console.error('GitHub Auth Failed:', e);
            window.showErrorMessage(`Authentication failed: ${e.message}`);
        }
    }

    private _getHtmlForWebview(webview: any): string {
        const styleUri = webview.asWebviewUri(
            Uri.joinPath(this._extensionUri, 'dist', 'webview', 'assets', 'index.css')
        );
        const scriptUri = webview.asWebviewUri(
            Uri.joinPath(this._extensionUri, 'dist', 'webview', 'assets', 'index.js')
        );
        const codiconUri = webview.asWebviewUri(
            Uri.joinPath(this._extensionUri, 'dist', 'webview', 'assets', 'codicon.ttf')
        );

        const nonce = getNonce();

        // CSP: Allow styles/scripts/fonts from webview.cspSource
        // Svelte 5 might need unsafe-eval in some environments, but usually not.
        // We add it just in case for stability, along with unsafe-inline for inline styles potentially.
        const csp = [
            `default-src 'none'`,
            `style-src ${webview.cspSource} 'unsafe-inline'`,
            `script-src ${webview.cspSource} 'nonce-${nonce}'`,
            `font-src ${webview.cspSource}`,
            `img-src ${webview.cspSource} https: data:`
        ].join('; ');

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <meta http-equiv="Content-Security-Policy" content="${csp}">
                <title>CECS</title>
                <link rel="stylesheet" crossorigin href="${styleUri}">
                <style>
                    @font-face {
                        font-family: "codicon";
                        font-display: block;
                        src: url("${codiconUri}") format("truetype");
                    }
                </style>
            </head>
            <body>
                <div id="app"></div>
                <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>`;
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
