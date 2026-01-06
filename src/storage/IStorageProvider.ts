export interface EditorConfig {
    settings: any;
    keybindings: any[];
    snippets: { [name: string]: any };
    extensions: string[];
}

export interface SavedProvider {
    id: string;
    type: 'gist' | 'github' | 'local';
    name?: string;
    config?: any; // e.g. path for local
    createdAt: number;
}

export interface IStorageProvider {
    /**
     * 저장소에 연결하고 인증합니다.
     */
    connect(credentials: any): Promise<void>;

    /**
     * 저장소에서 설정 데이터를 읽어옵니다.
     */
    read(): Promise<EditorConfig | null>;

    /**
     * 저장소에 설정 데이터를 저장합니다.
     */
    write(config: EditorConfig): Promise<void>;

    /**
     * 연결 상태를 확인합니다.
     */
    isConnected(): boolean;
}
