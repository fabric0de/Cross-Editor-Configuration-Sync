import {
    authentication,
    Disposable,
    Webview,
    WebviewPanel,
    window,
    Uri,
    ViewColumn,
    SecretStorage,
    workspace,
    commands
} from 'vscode';
import { getHtmlForWebview } from '../providers/ViewContent';

export class SetupPanel {
    public static currentPanel: SetupPanel | undefined;
    private readonly _panel: WebviewPanel;
    private readonly _secrets: SecretStorage;
    private _disposables: Disposable[] = [];

    private constructor(panel: WebviewPanel, extensionUri: Uri, secrets: SecretStorage) {
        this._panel = panel;
        this._secrets = secrets;
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.html = this._getWebviewContent(this._panel.webview, extensionUri);
        this._setWebviewMessageListener(this._panel.webview);
    }

    public static render(extensionUri: Uri, secrets: SecretStorage) {
        if (SetupPanel.currentPanel) {
            SetupPanel.currentPanel._panel.reveal(ViewColumn.One);
        } else {
            const panel = window.createWebviewPanel('cecsSetup', 'CECS Setup', ViewColumn.One, {
                enableScripts: true,
                localResourceRoots: [
                    Uri.joinPath(extensionUri, 'out'),
                    Uri.joinPath(extensionUri, 'media')
                ]
            });

            SetupPanel.currentPanel = new SetupPanel(panel, extensionUri, secrets);
        }
    }

    public dispose() {
        SetupPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }

    private _getWebviewContent(webview: Webview, extensionUri: Uri) {
        return getHtmlForWebview(webview, extensionUri);
    }

    private _setWebviewMessageListener(webview: Webview) {
        webview.onDidReceiveMessage(
            async (message: any) => {
                switch (message.type) {
                    case 'saveToken': {
                        await this._secrets.store('cecs_github_token', message.token);
                        await this._addProvider('gist', 'Gist Storage');
                        window.showInformationMessage('✅ GitHub token saved successfully!');
                        this._sendState();
                        return;
                    }
                    case 'startOAuth': {
                        if (message.provider === 'gist' || message.provider === 'github') {
                            await this._startGitHubAuth();
                        }
                        return;
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
                            webview.postMessage({ type: 'pathChanged', path: newPath });
                        }
                        return;
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
                        return;
                    }
                    case 'removeProvider': {
                        await this._removeProvider(message.id);
                        this._sendState();
                        break;
                    }
                    case 'action': {
                        const cmd = message.cmd;
                        commands.executeCommand(`cecs.${cmd}`);
                        break;
                    }
                    case 'checkState': {
                        await this._sendState();
                        break;
                    }
                    case 'reset': {
                        // Legacy reset
                        await this._secrets.delete('cecs_providers');
                        await this._secrets.delete('cecs_provider');
                        this._sendState();
                        return;
                    }
                }
            },
            undefined,
            this._disposables
        );
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
            providers = providers.filter((p: any) => p.id !== id);
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
            console.error('Failed to send state', e);
        } finally {
            this._panel.webview.postMessage({ type: 'connected', providers });
        }
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
