<script lang="ts">
    import { onMount } from 'svelte';
    import { state } from './stores/state.svelte';
    import { vscode } from './vscode';
    import '@vscode/codicons/dist/codicon.css';

    import ProviderCard from './components/ProviderCard.svelte';
    import ProfileList from './components/ProfileList.svelte';
    import ActionButtons from './components/ActionButtons.svelte';
    import SyncIndicator from './components/SyncIndicator.svelte';

    onMount(() => {
        // Handle messages from the extension
        window.addEventListener('message', (event) => {
            const message = event.data;
            switch (message.type) {
                case 'connected':
                case 'state':
                    state.update((s) => ({
                        ...s,
                        providers: message.providers || s.providers,
                        profiles: message.profiles || s.profiles
                    }));
                    break;
                case 'sync-start':
                    state.update((s) => ({ ...s, syncing: true }));
                    break;
                case 'sync-end':
                    state.update((s) => ({ ...s, syncing: false }));
                    break;
            }
        });

        // Request initial state
        vscode.postMessage({ type: 'checkState' });
    });

    function handleRemoveProvider(id: string) {
        vscode.postMessage({ type: 'remove-provider', value: id });
    }

    // Reactive derived values checked - accessing state directly in template for Svelte 5 compatibility
</script>

<main>
    <SyncIndicator />

    <div class="container">
        <h1>Cross-Editor Configuration Sync</h1>

        <!-- Storage Providers -->
        <section>
            <h2>
                <i class="codicon codicon-database"></i>
                Storage Providers
            </h2>
            {#if state.value.providers.length === 0}
                <div class="empty-state">
                    <p class="empty">No connections yet. Add one below.</p>
                    <div class="setup-actions">
                        <button
                            on:click={() =>
                                vscode.postMessage({ type: 'startOAuth', provider: 'gist' })}
                        >
                            <i class="codicon codicon-github"></i> Connect Gist
                        </button>
                        <button on:click={() => vscode.postMessage({ type: 'connectLocal' })}>
                            <i class="codicon codicon-folder"></i> Connect Local
                        </button>
                    </div>
                </div>
            {:else}
                {#each state.value.providers as provider (provider.id)}
                    <ProviderCard {provider} />
                {/each}
            {/if}
        </section>

        <!-- Action Buttons -->
        <ActionButtons />

        <!-- Profiles -->
        <ProfileList />
    </div>
</main>

<style>
    :global(body) {
        margin: 0;
        padding: 0;
        font-family: var(--vscode-font-family);
        color: var(--vscode-foreground);
        background-color: var(--vscode-editor-background);
    }

    .container {
        padding: 16px;
        max-width: 800px;
        margin: 0 auto;
    }

    h1 {
        font-size: 1.5em;
        font-weight: 600;
        margin-bottom: 24px;
    }

    h2 {
        font-size: 1.2em;
        font-weight: 600;
        margin: 24px 0 12px 0;
    }

    section {
        margin-bottom: 24px;
    }

    .empty {
        opacity: 0.6;
        font-size: 0.9em;
        text-align: center;
        padding: 20px 0;
    }

    .setup-actions {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 0 16px 16px;
    }

    button {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 12px 16px;
        border: none;
        border-radius: 6px;
        background: var(--vscode-button-secondaryBackground);
        color: var(--vscode-button-secondaryForeground);
        cursor: pointer;
        font-size: 0.95em;
        font-weight: 500;
        transition: all 0.2s;
    }

    button:hover {
        background: var(--vscode-button-secondaryHoverBackground);
    }
</style>
