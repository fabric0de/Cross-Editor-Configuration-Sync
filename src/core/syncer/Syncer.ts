// Main Syncer - orchestrates ConfigReader and ConfigWriter
import type { EditorConfig } from '../types/config';
import { ConfigReader } from './ConfigReader';
import { ConfigWriter } from './ConfigWriter';
import type { EditorType } from '../../paths';

export class Syncer {
    private reader: ConfigReader;
    private writer: ConfigWriter;

    constructor(private editorType: EditorType) {
        this.reader = new ConfigReader(editorType);
        this.writer = new ConfigWriter(editorType);
    }

    /**
     * Read local configuration
     */
    async readLocalConfig(): Promise<EditorConfig> {
        return this.reader.readLocalConfig();
    }

    /**
     * Write local configuration
     */
    async writeLocalConfig(config: EditorConfig): Promise<void> {
        return this.writer.writeLocalConfig(config);
    }

    /**
     * Get editor type
     */
    getEditorType(): string {
        return this.editorType;
    }
}
