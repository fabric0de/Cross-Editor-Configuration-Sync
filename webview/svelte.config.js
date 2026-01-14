import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/vite-plugin-svelte').SvelteConfig} */
export default {
    preprocess: vitePreprocess(),
    compilerOptions: {
        // Enable runtime checks in development
        dev: process.env.NODE_ENV === 'development'
    }
};
