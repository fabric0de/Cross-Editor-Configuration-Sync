import { Webview, Uri } from 'vscode';
import { getNonce } from '../panels/getNonce';

export function getHtmlForWebview(webview: Webview, extensionUri: Uri): string {
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} https:;">
    <title>CECS</title>
    <style>
      :root {
        --container-padding: 16px;
        --input-bg: var(--vscode-input-background);
        --input-fg: var(--vscode-input-foreground);
        --input-border: var(--vscode-input-border);
      }
      body {
        padding: 0;
        color: var(--vscode-foreground);
        font-family: var(--vscode-font-family);
        font-weight: var(--vscode-font-weight);
        font-size: var(--vscode-font-size);
        background-color: var(--vscode-editor-background); 
      }
      /* Responsive Layout */
      .container {
        padding: var(--container-padding);
        max-width: 800px;
        margin: 0 auto;
      }

      /* Sections & Accordions */
      .section-header {
        cursor: pointer;
        padding: 12px;
        background-color: var(--vscode-sideBarSectionHeader-background);
        color: var(--vscode-sideBarSectionHeader-foreground);
        font-weight: bold;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border: 1px solid var(--vscode-sideBarSectionHeader-border);
        margin-top: 8px;
        border-radius: 4px;
      }
      .section-header:hover {
          background-color: var(--vscode-list-hoverBackground);
      }
      .section-content {
        padding: 12px;
        background-color: var(--vscode-sideBar-background);
        border: 1px solid var(--vscode-sideBarSectionHeader-border);
        border-top: none;
        display: none;
        margin-bottom: 8px;
      }
      .section-content.active {
        display: block;
      }

      /* GitHub Logo in section header */
      .github-logo {
        width: 20px;
        height: 20px;
        vertical-align: middle;
        margin-right: 8px;
      }

      /* Buttons */
      button {
        border: none;
        padding: 10px 14px;
        text-align: center;
        display: block;
        width: 100%;
        margin-bottom: 10px;
        cursor: pointer;
        background-color: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        font-family: var(--vscode-font-family);
        border-radius: 2px;
        font-weight: 500;
        transition: background-color 0.2s;
      }
      button:hover {
        background-color: var(--vscode-button-hoverBackground);
      }
      button.secondary {
        background-color: var(--vscode-button-secondaryBackground);
        color: var(--vscode-button-secondaryForeground);
      }
      button.secondary:hover {
        background-color: var(--vscode-button-secondaryHoverBackground);
      }
      
      /* Provider List (Card Style) */
      .provider-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-bottom: 20px;
      }
      .provider-item {
        background-color: var(--vscode-input-background);
        border: 1px solid var(--vscode-input-border);
        border-radius: 4px;
        padding: 10px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .provider-info {
        display: flex;
        flex-direction: column;
      }
      .provider-type {
        font-weight: bold;
        font-size: 0.9em;
      }
      .provider-detail {
        font-size: 0.8em;
        opacity: 0.8;
      }
      .remove-btn {
        background: none;
        border: none;
        color: var(--vscode-errorForeground);
        cursor: pointer;
        padding: 4px;
        width: auto;
        margin: 0;
      }
      .remove-btn:hover {
        background-color: var(--vscode-list-hoverBackground);
      }

      .action-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        margin-top: 15px;
      }
      .sync-btn {
        grid-column: 1 / -1;
        background-color: var(--vscode-statusBarItem-prominentBackground);
        color: var(--vscode-settings-focusedRowBackground); 
        color: white; 
        font-size: 1.1em;
        padding: 14px;
        font-weight: bold;
      }
      
      /* Status Banner */
      .status-banner {
        padding: 15px;
        margin-bottom: 20px;
        text-align: center;
        background-color: var(--vscode-statusBar-background);
        color: var(--vscode-statusBar-foreground);
        border-bottom: 1px solid var(--vscode-panel-border);
        font-weight: bold;
        display: none;
      }
      .status-banner.connected {
        display: block;
      }

      /* Inputs */
      input[type="text"], input[type="password"] {
        width: 100%;
        padding: 8px;
        margin-bottom: 10px;
        background-color: var(--input-bg);
        color: var(--input-fg);
        border: 1px solid var(--input-border);
        border-radius: 2px;
        box-sizing: border-box; /* Prevents overflow */
      }

      /* Utilities */
      .hidden { display: none !important; }
      .mt-4 { margin-top: 16px; }
      .text-small { font-size: 0.9em; opacity: 0.8; margin-bottom: 8px; display: block;}
      .flex-row { display: flex; gap: 10px; }

      /* Media Query for Larger Screens (Panel Mode) */
      @media (min-width: 500px) {
          .container {
              padding: 30px;
          }
          .action-grid {
             grid-template-columns: repeat(3, 1fr);
          }
          .sync-btn {
              grid-column: auto;
          }
      }
    </style>
  </head>
  <body>
    <div class="container">
      <!-- Section 1: Connected Providers -->
      <h2 style="margin-top: 0; margin-bottom: 16px;">Connected Providers</h2>
      <div id="providerList" class="provider-list">
          <!-- Dynamic Items -->
      </div>
      <div id="emptyState" class="hidden" style="text-align: center; padding: 20px; opacity: 0.6;">
          <p>No providers connected yet. Add one below to get started.</p>
      </div>
      
      <!-- Section 2: Quick Actions (only visible when providers exist) -->
      <div id="actionsSection" class="hidden" style="margin-top: 20px;">
          <h3 style="margin-top:0; margin-bottom: 12px; text-align:center;">Quick Actions</h3>
          <div class="action-grid">
              <button id="syncBtn" class="sync-btn">🔄 Sync All</button>
              <button id="pushBtn">⬆️ Push All</button>
              <button id="pullBtn">⬇️ Pull All</button>
          </div>
      </div>
      
      <hr style="margin: 30px 0; border: 0; border-top: 1px solid var(--vscode-panel-border);">
      
      <!-- Section 3: Add Provider -->
      <h2 style="margin-bottom: 16px;">Add Provider</h2>
      
      <div class="section-header" data-section="gist">
          <span><img src="${webview.asWebviewUri(Uri.joinPath(extensionUri, 'resources', 'github-mark.svg'))}" class="github-logo" alt="GitHub">GitHub Gist (Cloud Storage)</span>
          <span>▼</span>
      </div>
      <div id="section-gist" class="section-content">
          <span class="text-small">Use GitHub Gist to sync your settings.</span>
          <br><br>
          <button id="gistOAuthBtn">GitHub Login (Auto)</button>
          <button id="gistTokenToggleBtn" class="secondary">Enter Token Manually</button>
          
          <div id="gist-token" class="hidden mt-4">
              <input type="password" id="gistTokenInput" placeholder="ghp_..." >
              <button id="saveGistTokenBtn">Save</button>
          </div>
      </div>

      <div class="section-header" data-section="local">
          <span>💾 Local File</span>
          <span>▼</span>
      </div>
      <div id="section-local" class="section-content">
          <span class="text-small">Use local filesystem as storage.</span>
          <br><br>
          <div class="flex-row">
              <button id="connectLocalBtn" style="flex:2">Connect Local</button>
              <button id="changeLocalPathBtn" class="secondary" style="flex:1">Folder...</button>
          </div>
      </div>
      
      <p style="text-align: center; font-size: 0.8em; opacity: 0.6; margin-top: 30px;">
          Antigravity Extension
      </p>
    </div>

    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi();
      
      window.addEventListener('load', () => {
          vscode.postMessage({ type: 'checkState' });
      });

      window.addEventListener('message', event => {
          const message = event.data;
          try {
              switch (message.type) {
                  case 'connected':
                      // Now receives providers array
                      updateDashboard(message.providers);
                      break;
                  case 'pathChanged':
                       // Trigger refresh
                       vscode.postMessage({ type: 'checkState' });
                       break;

              }
          } catch (e) {
              console.error('[CECS] Error handling message:', e);
          }
      });

      function updateDashboard(providers) {
          const list = document.getElementById('providerList');
          const emptyState = document.getElementById('emptyState');
          const actionsSection = document.getElementById('actionsSection');
          
          // Update provider list
          list.innerHTML = '';
          
          if (!providers || providers.length === 0) {
              // Show empty state message
              emptyState.classList.remove('hidden');
              actionsSection.classList.add('hidden');
          } else {
              // Hide empty state, show actions
              emptyState.classList.add('hidden');
              actionsSection.classList.remove('hidden');
              
              // Render provider cards
              providers.forEach(p => {
                  const div = document.createElement('div');
                  div.className = 'provider-item';
                  
                  let detail = '';
                  let icon = '';
                  if (p.type === 'gist') {
                      icon = '📝';
                      detail = 'Gist Storage';
                  } else if (p.type === 'local') {
                      icon = '💾';
                      detail = p.config ? p.config.path : 'Local Path';
                  }
                  
                  div.innerHTML = \`
                      <div class="provider-info">
                          <span class="provider-type">\${icon} \${p.name || p.type.toUpperCase()}</span>
                          <span class="provider-detail">\${detail}</span>
                      </div>
                      <button class="remove-btn" data-provider-id="\${p.id}">🗑️</button>
                  \`;
                  list.appendChild(div);
              });
          }
      }
      
      function removeProvider(id) {
          vscode.postMessage({ type: 'removeProvider', id: id });
      }

      function resetConnection() {
          // Legacy reset, mostly unused now
          vscode.postMessage({ type: 'reset' });
      }

      /* Reuse existing helpers */
      function toggleSection(id) {
          const targetSection = document.getElementById('section-' + id);
          const isActive = targetSection.classList.contains('active');
          
          // Close all sections
          document.querySelectorAll('.section-content').forEach(el => el.classList.remove('active'));
          
          // If it wasn't active, open it (true toggle behavior)
          if (!isActive) {
              targetSection.classList.add('active');
          }
      }

      function toggleInput(id) {
          const el = document.getElementById(id);
          if (el) {
              el.classList.toggle('hidden');
          }
      }

      function startOAuth(provider) {
          vscode.postMessage({ type: 'startOAuth', provider: provider });
      }

      function saveToken(provider) {
          const token = document.getElementById(provider + 'TokenInput').value;
          if(token) {
              vscode.postMessage({ type: 'saveToken', token: token, provider: provider });
          }
      }

      function connectLocal() {
          vscode.postMessage({ type: 'connectLocal' });
      }

      function changeLocalPath() {
          vscode.postMessage({ type: 'changeLocalPath' });
      }
      
      function sendAction(cmd) {
          vscode.postMessage({ type: 'action', cmd: cmd });
      }
      
      // Event Listeners (CSP-compliant)
      document.addEventListener('DOMContentLoaded', () => {
          // Action buttons
          document.getElementById('syncBtn')?.addEventListener('click', () => sendAction('sync'));
          document.getElementById('pushBtn')?.addEventListener('click', () => sendAction('push'));
          document.getElementById('pullBtn')?.addEventListener('click', () => sendAction('pull'));
          
          // Setup buttons
          document.getElementById('gistOAuthBtn')?.addEventListener('click', () => startOAuth('gist'));
          document.getElementById('gistTokenToggleBtn')?.addEventListener('click', () => toggleInput('gist-token'));
          document.getElementById('saveGistTokenBtn')?.addEventListener('click', () => saveToken('gist'));
          document.getElementById('connectLocalBtn')?.addEventListener('click', connectLocal);
          document.getElementById('changeLocalPathBtn')?.addEventListener('click', changeLocalPath);
          
          // Section headers
          document.querySelectorAll('.section-header').forEach(header => {
              header.addEventListener('click', () => {
                  const section = header.getAttribute('data-section');
                  if (section) toggleSection(section);
              });
          });
          
          // Event delegation for dynamically created remove buttons
          document.getElementById('providerList')?.addEventListener('click', (e) => {
              const target = e.target;
              if (target.classList.contains('remove-btn')) {
                  const providerId = target.getAttribute('data-provider-id');
                  if (providerId) removeProvider(providerId);
              }
          });
      });
    </script>
  </body>
</html>`;
}
