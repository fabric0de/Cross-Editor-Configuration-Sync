import * as path from 'path';

export enum EditorType {
    VSCode = 'VSCode',
    Cursor = 'Cursor',
    IDX = 'IDX',
    VSCodium = 'VSCodium',
    Windsurf = 'Windsurf',
    Antigravity = 'Antigravity',
    Unknown = 'Unknown'
}

export function determineEditorType(appName: string, idxWorkspaceUrl?: string): EditorType {
    if (appName.includes('Cursor')) {
        return EditorType.Cursor;
    }
    if (appName.includes('Windsurf')) {
        return EditorType.Windsurf;
    }
    if (appName.includes('VSCodium')) {
        return EditorType.VSCodium;
    }
    if (appName.includes('Antigravity')) {
        return EditorType.Antigravity;
    }
    if (appName.includes('IDX') || idxWorkspaceUrl) {
        return EditorType.IDX;
    }
    if (appName.includes('Visual Studio Code')) {
        return EditorType.VSCode;
    }
    return EditorType.Unknown;
}

export function determineUserDataDir(
    editor: EditorType, 
    appName: string,
    platform: string, 
    home: string, 
    customUserDataDir?: string,
    env: any = {}
): string {
    if (customUserDataDir && customUserDataDir.trim() !== '') {
        return customUserDataDir;
    }

    // Mac (Darwin)
    if (platform === 'darwin') {
        switch (editor) {
            case EditorType.VSCode:
                return path.join(home, 'Library', 'Application Support', 'Code', 'User');
            case EditorType.Cursor:
                return path.join(home, 'Library', 'Application Support', 'Cursor', 'User');
            case EditorType.Antigravity:
                return path.join(home, 'Library', 'Application Support', 'Antigravity', 'User');
            case EditorType.Windsurf:
                return path.join(home, 'Library', 'Application Support', 'Windsurf', 'User');
            case EditorType.VSCodium:
                return path.join(home, 'Library', 'Application Support', 'VSCodium', 'User');
            case EditorType.IDX:
                return env.IDX_USER_DATA_DIR || path.join(home, '.config', 'idx', 'User');
            case EditorType.Unknown:
            default:
                const appNameClean = appName.replace(/\s+/g, '');
                if (appNameClean) {
                     return path.join(home, 'Library', 'Application Support', appNameClean, 'User');
                }
                throw new Error(`Unsupported editor type: ${editor}`);
        }
    }

    // Windows (win32)
    if (platform === 'win32') {
        const appData = env.APPDATA || path.join(home, 'AppData', 'Roaming');
        switch (editor) {
            case EditorType.VSCode:
                return path.join(appData, 'Code', 'User');
            case EditorType.Cursor:
                return path.join(appData, 'Cursor', 'User');
            case EditorType.Antigravity:
                return path.join(appData, 'Antigravity', 'User');
            case EditorType.Windsurf:
                return path.join(appData, 'Windsurf', 'User');
            case EditorType.VSCodium:
                return path.join(appData, 'VSCodium', 'User');
            case EditorType.IDX:
                return env.IDX_USER_DATA_DIR || path.join(appData, 'IDX', 'User');
            case EditorType.Unknown:
            default:
                 const appNameClean = appName.replace(/\s+/g, '');
                 if (appNameClean) {
                      return path.join(appData, appNameClean, 'User');
                 }
                throw new Error(`Unsupported editor type: ${editor}`);
        }
    }

    // Linux
    if (platform === 'linux') {
        const config = env.XDG_CONFIG_HOME || path.join(home, '.config');
        switch (editor) {
            case EditorType.VSCode:
                return path.join(config, 'Code', 'User');
            case EditorType.Cursor:
                return path.join(config, 'Cursor', 'User');
            case EditorType.Antigravity:
                return path.join(config, 'Antigravity', 'User');
            case EditorType.Windsurf:
                return path.join(config, 'Windsurf', 'User');
            case EditorType.VSCodium:
                return path.join(config, 'VSCodium', 'User');
            case EditorType.IDX:
                return String(env.IDX_USER_DATA_DIR);
            case EditorType.Unknown:
            default:
                 const appNameClean = appName.replace(/\s+/g, '');
                 if (appNameClean) {
                      return path.join(config, appNameClean, 'User');
                 }
                throw new Error(`Unsupported editor type: ${editor}`);
        }
    }

    throw new Error(`Unsupported platform: ${platform}`);
}
