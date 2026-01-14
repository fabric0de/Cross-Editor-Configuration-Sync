import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

export default defineConfig({
    plugins: [svelte()],
    root: 'webview',
    build: {
        outDir: '../dist/webview',
        emptyOutDir: true,
        rollupOptions: {
            output: {
                entryFileNames: 'assets/[name].js',
                chunkFileNames: 'assets/[name].js',
                assetFileNames: 'assets/[name].[ext]'
            }
        }
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'webview/src')
        }
    }
});
