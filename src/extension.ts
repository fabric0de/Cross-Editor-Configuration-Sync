import * as vscode from 'vscode';
import { SetupPanel } from './panels/SetupPanel';
import { SidebarProvider } from './providers/SidebarProvider';
import { SyncManager } from './sync/SyncManager';
import { getCurrentEditorType, getUserDataDir } from './paths';

export function activate(context: vscode.ExtensionContext) {
    console.log('CECS is now active!');

    const syncManager = new SyncManager(context.secrets);

    // Register Sidebar Provider
    const sidebarProvider = new SidebarProvider(context.extensionUri, context.secrets);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('cecs-sidebar-view', sidebarProvider)
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('cecs.openSetup', () => {
            SetupPanel.render(context.extensionUri, context.secrets);
        })
    );

    // Watch for changes in settings, keybindings, and snippets
    try {
        const editorType = getCurrentEditorType();
        const userDataDir = getUserDataDir(editorType);

        const watcher = vscode.workspace.createFileSystemWatcher(
            new vscode.RelativePattern(userDataDir, '{settings.json,keybindings.json,snippets/**}')
        );

        const handleUpdate = () => {
            const config = vscode.workspace.getConfiguration('cecs');
            if (config.get<boolean>('autoSync')) {
                syncManager.debouncedPush();
            }
        };

        watcher.onDidChange(handleUpdate);
        watcher.onDidCreate(handleUpdate);
        watcher.onDidDelete(handleUpdate);

        context.subscriptions.push(watcher);
    } catch (e) {
        console.error('Failed to set up file watcher', e);
    }

    // Push command
    context.subscriptions.push(
        vscode.commands.registerCommand('cecs.push', async () => {
            await syncManager.push();
        })
    );

    // Pull command
    context.subscriptions.push(
        vscode.commands.registerCommand('cecs.pull', async () => {
            await syncManager.pull();
        })
    );

    // Sync command (Push + Pull)
    context.subscriptions.push(
        vscode.commands.registerCommand('cecs.sync', async () => {
            await syncManager.sync();
        })
    );
}

// This method is called when your extension is deactivated
export function deactivate() {
    // Clean up resources if necessary
}
