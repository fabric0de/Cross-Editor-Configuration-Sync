<script lang="ts">
    import { state } from '../stores/state.svelte';
    import { vscode } from '../vscode';

    import ProfileCard from './ProfileCard.svelte';

    function refresh() {
        vscode.postMessage({ type: 'refresh' });
    }
</script>

<section>
    <div class="header">
        <h2>
            <i class="codicon codicon-account"></i>
            Profiles
        </h2>
        <button class="icon-btn" on:click={refresh} title="Refresh Profiles">
            <i class="codicon codicon-refresh"></i>
        </button>
    </div>

    {#if state.value.profiles}
        <!-- Default Profile -->
        <ProfileCard
            profile={{
                name: 'Default',
                icon: 'star-full',
                location: '',
                extensions: state.value.profiles.default.extensions
            }}
            isDefault={true}
        />

        <!-- Custom Profiles -->
        {#each state.value.profiles.custom as profile (profile.location)}
            <ProfileCard {profile} isDefault={false} />
        {/each}
    {:else}
        <p class="loading">Loading profiles...</p>
    {/if}
</section>

<style>
    section {
        margin-top: 24px;
    }

    .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
    }

    h2 {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0;
        font-size: 1.2em;
        font-weight: 600;
    }

    .icon-btn {
        background: rgba(139, 92, 246, 0.1);
        border: 1px solid rgba(139, 92, 246, 0.3);
        border-radius: 6px;
        padding: 6px 10px;
        cursor: pointer;
        color: var(--vscode-foreground);
        transition: all 0.2s;
    }

    .icon-btn:hover {
        background: rgba(139, 92, 246, 0.2);
        border-color: rgba(139, 92, 246, 0.5);
    }

    .loading {
        opacity: 0.6;
        font-size: 0.9em;
        text-align: center;
        padding: 20px;
    }
</style>
