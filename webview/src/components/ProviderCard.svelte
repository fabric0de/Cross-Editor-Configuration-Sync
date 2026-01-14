<script lang="ts">
  import type { Provider } from '../stores/state';
  import { postMessage } from '../vscode';
  
  export let provider: Provider;
  
  function removeProvider() {
    postMessage({ type: 'removeProvider', id: provider.id });
  }
  
  function getProviderIcon(type: string) {
    switch(type) {
      case 'gist': return 'github';
      case 'github': return 'github-alt';
      case 'local': return 'folder';
      default: return 'database';
    }
  }
</script>

<div class="provider-card">
  <div class="provider-info">
    <i class="codicon codicon-{getProviderIcon(provider.type)}"></i>
    <div>
      <div class="name">{provider.name || provider.type.toUpperCase()}</div>
      <div class="detail">{provider.type === 'local' ? provider.config?.path : 'Connected'}</div>
    </div>
  </div>
  <button class="remove-btn" on:click={removeProvider} title="Remove">
    <i class="codicon codicon-trash"></i>
  </button>
</div>

<style>
  .provider-card {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    transition: all 0.2s;
  }
  
  .provider-card:hover {
    border-color: var(--vscode-button-background);
    transform: scale(1.02);
  }
  
  .provider-info {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .provider-info i {
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
  
  .remove-btn {
    background: transparent;
    border: none;
    color: var(--vscode-errorForeground);
    cursor: pointer;
    padding: 6px;
    border-radius: 4px;
    transition: background 0.2s;
  }
  
  .remove-btn:hover {
    background: rgba(255, 0, 0, 0.1);
  }
</style>
