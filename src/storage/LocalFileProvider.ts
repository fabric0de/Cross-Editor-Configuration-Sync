import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as vscode from 'vscode';
import { IStorageProvider, EditorConfig } from './IStorageProvider';

export class LocalFileProvider implements IStorageProvider {
    private filePath = '';
    private connected = false;

    constructor() {
        this.updateFilePath();
    }

    private updateFilePath() {
        // 1. Check configuration
        const config = vscode.workspace.getConfiguration('cecs');
        const customPath = config.get<string>('localBackupPath');

        if (customPath && customPath.trim() !== '') {
            // If it's a directory, append config.json
            if (!customPath.endsWith('.json')) {
                this.filePath = path.join(customPath, 'config.json');
            } else {
                this.filePath = customPath;
            }
        } else {
            // Default: ~/.cecs/config.json
            this.filePath = path.join(os.homedir(), '.cecs', 'config.json');
        }
    }

    async connect(_credentials?: any): Promise<void> {
        // 경로 재확인 (설정이 변경되었을 수 있음)
        this.updateFilePath();

        // 디렉토리 생성
        const dir = path.dirname(this.filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        this.connected = true;
    }

    async read(): Promise<EditorConfig | null> {
        if (!this.connected) {
            throw new Error('먼저 connect()를 호출하세요.');
        }

        if (!fs.existsSync(this.filePath)) {
            return null;
        }

        const content = fs.readFileSync(this.filePath, 'utf8');
        return JSON.parse(content);
    }

    async write(config: EditorConfig): Promise<void> {
        if (!this.connected) {
            throw new Error('먼저 connect()를 호출하세요.');
        }

        fs.writeFileSync(this.filePath, JSON.stringify(config, null, 2), 'utf8');
    }

    isConnected(): boolean {
        return this.connected;
    }

    getFilePath(): string {
        return this.filePath;
    }
}
