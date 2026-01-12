import * as assert from 'assert';
import * as path from 'path';
import { determineEditorType, determineUserDataDir, EditorType } from '../paths.core';

// Mock values
const HOME = '/Users/testuser';

describe('Paths Core Logic', () => {
    describe('determineEditorType', () => {
        it('should detect Cursor', () => {
            assert.strictEqual(determineEditorType('Cursor'), EditorType.Cursor);
        });
        it('should detect Windsurf', () => {
            assert.strictEqual(determineEditorType('Windsurf'), EditorType.Windsurf);
        });
        it('should detect VSCodium', () => {
            assert.strictEqual(determineEditorType('VSCodium'), EditorType.VSCodium);
        });
        it('should detect Antigravity', () => {
            assert.strictEqual(determineEditorType('Antigravity'), EditorType.Antigravity);
        });
        it('should detect VS Code', () => {
            assert.strictEqual(determineEditorType('Visual Studio Code'), EditorType.VSCode);
        });
        it('should return Unknown for random string', () => {
            assert.strictEqual(determineEditorType('RandomEditor'), EditorType.Unknown);
        });
    });

    describe('determineUserDataDir (Mac)', () => {
        const platform = 'darwin';

        it('should return correct path for Antigravity', () => {
            const result = determineUserDataDir(
                EditorType.Antigravity,
                'Antigravity',
                platform,
                HOME
            );
            assert.strictEqual(
                result,
                path.join(HOME, 'Library/Application Support/Antigravity/User')
            );
        });

        it('should return correct path for Windsurf', () => {
            const result = determineUserDataDir(EditorType.Windsurf, 'Windsurf', platform, HOME);
            assert.strictEqual(
                result,
                path.join(HOME, 'Library/Application Support/Windsurf/User')
            );
        });

        it('should fallback to name-based path for Unknown editor', () => {
            const result = determineUserDataDir(
                EditorType.Unknown,
                'My Cool Editor',
                platform,
                HOME
            );
            assert.strictEqual(
                result,
                path.join(HOME, 'Library/Application Support/MyCoolEditor/User')
            );
        });

        it('should respect custom user data dir', () => {
            const custom = '/custom/path/User';
            const result = determineUserDataDir(EditorType.VSCode, 'Code', platform, HOME, custom);
            assert.strictEqual(result, custom);
        });
    });
});
