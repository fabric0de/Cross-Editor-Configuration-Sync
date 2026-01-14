<script lang="ts">
    import { state } from '../stores/state.svelte';
</script>

{#if state.value.syncing}
    <div class="indicator">
        <div class="spinner"></div>
        <span>Syncing...</span>
    </div>
{/if}

<style>
    .indicator {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        padding: 10px 16px;
        border-radius: 20px;
        display: flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 1000;
        animation: slideUp 0.3s ease;
    }

    @keyframes slideUp {
        from {
            transform: translateY(20px);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }

    .spinner {
        width: 14px;
        height: 14px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        border-top-color: #fff;
        animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }
</style>
