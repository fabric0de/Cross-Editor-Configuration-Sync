import * as os from 'os';
import * as vscode from 'vscode';
import { EditorType, determineEditorType, determineUserDataDir } from './paths.core';

export { EditorType };

export function getCurrentEditorType(appName: string = vscode.env.appName): EditorType {
    const idxWorkspaceUrl = process.env.IDX_WORKSPACE_URL;
    return determineEditorType(appName, idxWorkspaceUrl);
}

export function getUserDataDir(editor: EditorType, platform: string = os.platform(), home: string = os.homedir()): string {
    const config = vscode.workspace.getConfiguration('cecs');
    const customDir = config.get<string>('customUserDataDir');
    
    return determineUserDataDir(editor, vscode.env.appName, platform, home, customDir, process.env);
}
