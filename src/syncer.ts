// Syncer - Main export for backward compatibility
// Re-exports from modular structure
export { Syncer } from './core/syncer';
export type { EditorConfig, ProfileConfig, SyncOptions } from './core/types/config';

// Legacy functions that need to stay for now
import * as vscode from 'vscode';
import { Syncer as CoreSyncer } from './core/syncer';
import type { EditorConfig } from './core/types/config';

/**
 * Extract current editor configuration
 */
export async function extractConfig(): Promise<EditorConfig> {
    const { getCurrentEditorType } = await import('./paths');
    const editorType = getCurrentEditorType();
    const syncer = new CoreSyncer(editorType);

    return syncer.readLocalConfig();
}

/**
 * Apply configuration to local editor
 * Returns merged profiles if profiles were synced
 */
export async function applyLocalConfig(config: EditorConfig): Promise<any[]> {
    const { getCurrentEditorType } = await import('./paths');
    const editorType = getCurrentEditorType();
    const syncer = new CoreSyncer(editorType);

    return syncer.writeLocalConfig(config);
}

/**
 * Install missing extensions
 */
export async function installExtensions(extensions: string[]): Promise<void> {
    const autoInstall = vscode.workspace
        .getConfiguration('cecs')
        .get<boolean>('autoInstallExtensions', true);

    if (!autoInstall) {
        return;
    }

    const installedExtensionIds = vscode.extensions.all
        .filter((ext) => !ext.packageJSON.isBuiltin)
        .map((ext) => ext.id.toLowerCase());

    const missingExtensions = extensions.filter(
        (ext) => !installedExtensionIds.includes(ext.toLowerCase())
    );

    if (missingExtensions.length === 0) {
        return;
    }

    const answer = await vscode.window.showInformationMessage(
        `Found ${missingExtensions.length} extensions to install. Install them now?`,
        'Yes',
        'No'
    );

    if (answer !== 'Yes') {
        return;
    }

    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: 'Installing Extensions',
            cancellable: false
        },
        async (progress) => {
            let installed = 0;
            const failed: string[] = [];

            for (const extId of missingExtensions) {
                try {
                    progress.report({
                        message: `Installing ${extId}...`,
                        increment: 100 / missingExtensions.length
                    });

                    await vscode.commands.executeCommand(
                        'workbench.extensions.installExtension',
                        extId
                    );
                    installed++;
                } catch (error) {
                    console.error(`Failed to install ${extId}:`, error);
                    failed.push(extId);
                }
            }

            if (failed.length === 0) {
                vscode.window
                    .showInformationMessage(
                        `Successfully installed ${installed} extensions!`,
                        'Reload Window'
                    )
                    .then((choice) => {
                        if (choice === 'Reload Window') {
                            vscode.commands.executeCommand('workbench.action.reloadWindow');
                        }
                    });
            } else {
                vscode.window.showWarningMessage(
                    `Installed ${installed}/${missingExtensions.length} extensions. Failed: ${failed.join(', ')}`
                );
            }
        }
    );
}
