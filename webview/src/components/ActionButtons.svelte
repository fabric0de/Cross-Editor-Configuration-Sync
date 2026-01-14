<script lang="ts">
    import { state } from '../stores/state.svelte';
    import { vscode } from '../vscode';

    function sync() {
        vscode.postMessage({ type: 'action', cmd: 'sync' });
    }

    function push() {
        vscode.postMessage({ type: 'action', cmd: 'push' });
    }

    function pull() {
        vscode.postMessage({ type: 'action', cmd: 'pull' });
    }
</script>

{#if state.value.providers.length > 0}
    <section class="actions">
        <div class="btn-grid">
            <button class="sync-btn" on:click={sync} disabled={state.value.syncing}>
                <i class="codicon codicon-sync"></i>
                {state.value.syncing ? 'Syncing...' : 'Full Sync'}
            </button>
            <button on:click={push} disabled={state.value.syncing}>
                <i class="codicon codicon-cloud-upload"></i>
                Push
            </button>
            <button on:click={pull} disabled={state.value.syncing}>
                <i class="codicon codicon-cloud-download"></i>
                Pull
            </button>
        </div>
    </section>
{/if}

<style>
    .actions {
        margin: 24px 0;
    }

    .btn-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
    }

    button {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 12px 16px;
        border: none;
        border-radius: 6px;
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        cursor: pointer;
        font-size: 0.95em;
        font-weight: 500;
        transition: all 0.2s;
    }

    button:hover:not(:disabled) {
        background: var(--vscode-button-hoverBackground);
        transform: translateY(-1px);
    }

    button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .sync-btn {
        grid-column: 1 / -1;
        background: linear-gradient(135deg, #6366f1, #a855f7);
        font-size: 1.05em;
    }

    .sync-btn:hover:not(:disabled) {
        background: linear-gradient(135deg, #7c3aed, #a855f7);
    }
</style>
