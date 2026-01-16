// Profile Sync Helper - Spawns detached scripts to modify storage.json when IDE is closed
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { spawn } from 'child_process';
import * as vscode from 'vscode';

export interface ProfileData {
    name: string;
    location: string;
    icon?: string;
}

export class ProfileSyncHelper {
    private scriptsDir: string;
    private userDataDir: string;
    private appName: string;
    private appBundlePath: string;

    constructor(
        private extensionPath: string,
        userDataDir: string,
        appRoot: string,
        appName: string = 'Antigravity'
    ) {
        this.scriptsDir = path.join(extensionPath, 'scripts');
        this.userDataDir = userDataDir;
        this.appName = appName;

        // Extract .app bundle path from appRoot
        // appRoot is usually ".../App.app/Contents/Resources/app"
        // We want ".../App.app"
        const appMatch = appRoot.match(/(.*\.app)/);
        this.appBundlePath = appMatch ? appMatch[1] : '';

        console.log('[CECS] App Root:', appRoot);
        console.log('[CECS] App Bundle Path:', this.appBundlePath);
    }

    /**
     * Get the appropriate script path for the current platform
     */
    private getScriptPath(): string {
        const platform = os.platform();

        if (platform === 'darwin' || platform === 'linux') {
            return path.join(this.scriptsDir, 'profile-sync-helper.sh');
        } else if (platform === 'win32') {
            return path.join(this.scriptsDir, 'profile-sync-helper.ps1');
        }

        throw new Error(`Unsupported platform: ${platform}`);
    }

    /**
     * Get storage.json path
     */
    private getStorageJsonPath(): string {
        return path.join(this.userDataDir, 'globalStorage', 'storage.json');
    }

    /**
     * Spawn detached helper script to sync profiles
     * Returns immediately - script runs in background and waits for IDE to close
     */
    async spawnProfileSync(profiles: ProfileData[]): Promise<void> {
        const platform = os.platform();
        const scriptPath = this.getScriptPath();
        const storageJsonPath = this.getStorageJsonPath();

        // Write profiles to a temporary file to avoid command line length limits
        const tempProfilesPath = path.join(os.tmpdir(), `cecs_profiles_${Date.now()}.json`);
        fs.writeFileSync(tempProfilesPath, JSON.stringify(profiles, null, 2), 'utf8');

        if (!fs.existsSync(scriptPath)) {
            throw new Error(`Helper script not found: ${scriptPath}`);
        }

        console.log('[CECS] Spawning profile sync helper...');
        console.log('[CECS] Script:', scriptPath);
        console.log('[CECS] Profiles file:', tempProfilesPath);

        if (platform === 'darwin' || platform === 'linux') {
            // Unix: spawn bash script
            // Redirect output to a log file for debugging
            const logFile = fs.openSync('/tmp/cecs_spawn.log', 'a');
            const child = spawn(
                'bash',
                [scriptPath, this.appName, storageJsonPath, tempProfilesPath, this.appBundlePath],
                {
                    detached: true,
                    stdio: ['ignore', logFile, logFile], // Redirect stdout/stderr to log file
                    env: { ...process.env }
                }
            );

            child.unref(); // Allow parent to exit independently
            console.log('[CECS] Helper script spawned with PID:', child.pid);
        } else if (platform === 'win32') {
            // Windows: spawn PowerShell script
            // Note: Update PowerShell script to also accept file path
            const child = spawn(
                'powershell.exe',
                [
                    '-ExecutionPolicy',
                    'Bypass',
                    '-File',
                    scriptPath,
                    this.appName,
                    storageJsonPath,
                    tempProfilesPath
                ],
                {
                    detached: true,
                    stdio: 'ignore',
                    windowsHide: true
                }
            );

            child.unref();
            console.log('[CECS] Helper script spawned with PID:', child.pid);
        } else {
            throw new Error(`Unsupported platform: ${platform}`);
        }
    }

    /**
     * Trigger IDE restart after spawning helper script
     */
    async triggerIDERestart(): Promise<void> {
        console.log('[CECS] Triggering IDE restart...');

        // Small delay to ensure script is spawned and listening
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Quit the IDE - the script will detect this and proceed
        await vscode.commands.executeCommand('workbench.action.quit');
    }

    /**
     * Full sync flow: spawn script, confirm with user, then quit IDE
     */
    async syncProfilesWithRestart(profiles: ProfileData[]): Promise<boolean> {
        if (profiles.length === 0) {
            console.log('[CECS] No profiles to sync');
            return false;
        }

        // Show confirmation dialog
        const action = await vscode.window.showWarningMessage(
            `${profiles.length}개의 프로필을 등록하려면 IDE를 재시작해야 합니다.\n\n지금 재시작하시겠습니까?`,
            { modal: true },
            '재시작',
            '나중에'
        );

        if (action !== '재시작') {
            console.log('[CECS] User cancelled profile sync restart');
            return false;
        }

        try {
            // Spawn helper script
            await this.spawnProfileSync(profiles);

            // Show message and quit
            vscode.window.showInformationMessage('IDE가 재시작됩니다. 잠시만 기다려주세요...');

            // Trigger quit
            await this.triggerIDERestart();

            return true;
        } catch (error) {
            console.error('[CECS] Profile sync error:', error);
            vscode.window.showErrorMessage(`프로필 동기화 실패: ${error}`);
            return false;
        }
    }
}
