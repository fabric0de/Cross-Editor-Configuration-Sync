<script lang="ts">
    import type { ProfileConfig } from '../stores/state.svelte';

    export let profile: ProfileConfig;
    export let isDefault: boolean = false;
</script>

<div class="profile-card" class:default={isDefault}>
    <div class="profile-info">
        {#if profile.icon}
            <i class="codicon codicon-{profile.icon} icon"></i>
        {:else}
            <i class="codicon codicon-folder icon"></i>
        {/if}
        <div>
            <div class="name">{profile.name}</div>
            <div class="detail">
                {isDefault ? 'Default Profile' : 'Custom Profile'}
                {#if profile.extensions?.length > 0}
                    • {profile.extensions.length} extensions
                {/if}
            </div>
        </div>
    </div>
</div>

<style>
    .profile-card {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 8px;
        transition: all 0.2s;
    }

    .profile-card.default {
        border-color: rgba(139, 92, 246, 0.3);
        background: rgba(139, 92, 246, 0.05);
    }

    .profile-card:hover {
        transform: scale(1.01);
    }

    .profile-info {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .icon {
        font-size: 20px;
        opacity: 0.8;
    }

    .name {
        font-weight: 600;
        margin-bottom: 2px;
    }

    .detail {
        font-size: 0.85em;
        opacity: 0.7;
    }
</style>
