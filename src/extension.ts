import * as vscode from 'vscode';
import { SetupPanel } from './panels/SetupPanel';
import { SidebarProvider } from './providers/SidebarProvider';
import { SyncManager } from './sync/SyncManager';

export function activate(context: vscode.ExtensionContext) {
    console.log('CECS is now active!');

    // Register Sidebar Provider
    const sidebarProvider = new SidebarProvider(context.extensionUri, context.secrets);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider("cecs-sidebar-view", sidebarProvider)
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('cecs.openSetup', () => {
            SetupPanel.render(context.extensionUri, context.secrets);
        })
    );

    // Push command
    context.subscriptions.push(
        vscode.commands.registerCommand('cecs.push', async () => {
            const syncManager = new SyncManager(context.secrets);
            await syncManager.push();
        })
    );

    // Pull command
    context.subscriptions.push(
        vscode.commands.registerCommand('cecs.pull', async () => {
            const syncManager = new SyncManager(context.secrets);
            await syncManager.pull();
        })
    );

    // Sync command (Push + Pull)
    context.subscriptions.push(
        vscode.commands.registerCommand('cecs.sync', async () => {
            const syncManager = new SyncManager(context.secrets);
            await syncManager.sync();
        })
    );
}

export function deactivate() { }
