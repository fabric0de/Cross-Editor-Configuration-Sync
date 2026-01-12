import { Webview, Uri } from 'vscode';
import { getNonce } from '../panels/getNonce';

export function getHtmlForWebview(webview: Webview, _extensionUri: Uri): string {
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} https:;">
    <title>CECS</title>
    <style>
      :root {
        --container-padding: 16px;
        --radius: 8px;
        --glass-bg: rgba(255, 255, 255, 0.05);
        --glass-border: rgba(255, 255, 255, 0.1);
        --accent: var(--vscode-button-background);
        --accent-hover: var(--vscode-button-hoverBackground);
      }
      body {
        padding: 0;
        color: var(--vscode-foreground);
        font-family: var(--vscode-font-family);
        background-color: var(--vscode-editor-background);
        overflow-x: hidden;
      }
      .container {
        padding: var(--container-padding);
        max-width: 800px;
        margin: 0 auto;
        animation: fadeIn 0.5s ease;
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(5px); }
        to { opacity: 1; transform: translateY(0); }
      }

      /* Floating Status Indicator */
      #syncingIndicator {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: var(--accent);
        color: white;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 0.85em;
        font-weight: bold;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        display: none;
        align-items: center;
        gap: 8px;
        z-index: 1000;
        animation: slideUp 0.3s ease;
      }
      @keyframes slideUp {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      .spinner {
        width: 12px;
        height: 12px;
        border: 2px solid rgba(255,255,255,0.3);
        border-radius: 50%;
        border-top-color: #fff;
        animation: spin 0.8s linear infinite;
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      /* Modern Cards (Glassmorphism inspired) */
      .provider-item {
        background: var(--glass-bg);
        border: 1px solid var(--glass-border);
        border-radius: var(--radius);
        padding: 12px;
        margin-bottom: 8px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        transition: all 0.2s ease;
        backdrop-filter: blur(5px);
      }
      .provider-item:hover {
        border-color: var(--accent);
        transform: scale(1.02);
      }

      .section-header {
        cursor: pointer;
        padding: 12px;
        background: var(--glass-bg);
        border: 1px solid var(--glass-border);
        border-radius: var(--radius);
        font-weight: bold;
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 12px;
        transition: background 0.2s;
      }
      .section-header:hover {
        background: rgba(255,255,255,0.1);
      }
      
      .section-content {
        padding: 16px;
        background: rgba(0,0,0,0.2);
        border: 1px solid var(--glass-border);
        border-top: none;
        border-radius: 0 0 var(--radius) var(--radius);
        display: none;
        margin-top: -4px;
      }
      .section-content.active { display: block; animation: slideDown 0.2s ease; }
      @keyframes slideDown {
        from { opacity: 0; transform: translateY(-5px); }
        to { opacity: 1; transform: translateY(0); }
      }

      /* Buttons & Inputs */
      button {
        border: none;
        padding: 10px 16px;
        border-radius: var(--radius);
        background: var(--accent);
        color: var(--vscode-button-foreground);
        font-weight: 500;
        cursor: pointer;
        width: 100%;
        margin-bottom: 8px;
        transition: filter 0.2s;
      }
      button:hover { filter: brightness(1.2); }
      button.secondary {
        background: var(--vscode-button-secondaryBackground);
        color: var(--vscode-button-secondaryForeground);
      }
      button.sync-btn {
        background: linear-gradient(135deg, #6366f1, #a855f7);
        color: white;
        font-size: 1.05em;
        margin-top: 10px;
      }

      input {
        width: 100%;
        padding: 10px;
        background: var(--vscode-input-background);
        border: 1px solid var(--vscode-input-border);
        color: var(--vscode-input-foreground);
        border-radius: var(--radius);
        margin-bottom: 12px;
      }

      .action-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-top: 20px;
      }
      .sync-btn-container { grid-column: 1 / -1; }

      .provider-info .type { font-weight: bold; font-size: 0.95em; }
      .provider-info .detail { font-size: 0.8em; opacity: 0.6; }
      .remove-btn { color: var(--vscode-errorForeground); background: none; width: auto; font-size: 1.2em; padding: 4px; }

      hr { border: none; border-top: 1px solid var(--glass-border); margin: 30px 0; }
    </style>
  </head>
  <body>
    <div id="syncingIndicator">
        <div class="spinner"></div>
        <span>Syncing...</span>
    </div>

    <div class="container">
      <h2 style="margin-top: 0; font-weight: 800;">Connected Storage</h2>
      <div id="providerList" class="provider-list"></div>
      <div id="emptyState" class="hidden" style="text-align: center; padding: 40px; opacity: 0.5;">
          <p>No connections yet. Add one below.</p>
      </div>
      
      <div id="actionsSection" class="hidden">
          <div class="action-grid">
              <div class="sync-btn-container">
                  <button id="syncBtn" class="sync-btn">🔄 Full Sync</button>
              </div>
              <button id="pushBtn">⬆️ Push</button>
              <button id="pullBtn">⬇️ Pull</button>
          </div>
      </div>
      
      <hr>
      
      <h2 style="font-weight: 800;">Profiles</h2>
      <div id="profileList" class="profile-list">
          <p style="opacity: 0.6; font-size: 0.9em;">Syncing all VS Code profiles...</p>
      </div>
      
      <hr>
      
      <h2 style="font-weight: 800;">Add Storage</h2>
      
      <div class="section-header" data-section="gist">
          <span>GitHub Gist (Cloud)</span>
          <span>▼</span>
      </div>
      <div id="section-gist" class="section-content">
          <button id="gistOAuthBtn">Quick Connect with GitHub</button>
          <button id="gistTokenToggleBtn" class="secondary">Manual Token</button>
          
          <div id="gist-token" class="hidden" style="margin-top: 12px;">
              <input type="password" id="gistTokenInput" placeholder="Enter Personal Access Token">
              <button id="saveGistTokenBtn">Connect</button>
          </div>
      </div>

      <div class="section-header" data-section="local">
          <span>💾 Local File System</span>
          <span>▼</span>
      </div>
      <div id="section-local" class="section-content">
          <div style="display: flex; gap: 8px;">
              <button id="connectLocalBtn" style="flex: 2;">Confirm Location</button>
              <button id="changeLocalPathBtn" class="secondary" style="flex: 1;">Browse...</button>
          </div>
      </div>
      
      <p style="text-align: center; font-size: 0.75em; opacity: 0.4; margin-top: 40px;">
          CECS • Cross-Editor Configuration Sync
      </p>
    </div>

    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi();
      
      window.addEventListener('load', () => vscode.postMessage({ type: 'checkState' }));

      window.addEventListener('message', event => {
          const message = event.data;
          if (message.type === 'connected') {
              updateDashboard(message.providers);
              updateProfiles(message.profiles);
          }
          if (message.type === 'syncing') toggleSyncing(message.state);
      });

      function toggleSyncing(state) {
          document.getElementById('syncingIndicator').style.display = state ? 'flex' : 'none';
      }

      function updateProfiles(profiles) {
          const list = document.getElementById('profileList');
          if (!profiles || (!profiles.custom || profiles.custom.length === 0)) {
              list.innerHTML = '<p style="opacity: 0.6; font-size: 0.9em;">✓ Syncing default profile</p>';
              return;
          }
          
          list.innerHTML = '';
          
          // Show default profile
          const defaultDiv = document.createElement('div');
          defaultDiv.className = 'provider-item';
          defaultDiv.innerHTML = \`
              <div class="provider-info">
                  <div class="type">⭐ \${profiles.default.name}</div>
                  <div class="detail">Default Profile</div>
              </div>
          \`;
          list.appendChild(defaultDiv);
          
          // Show custom profiles
          profiles.custom.forEach(p => {
              const div = document.createElement('div');
              div.className = 'provider-item';
              div.innerHTML = \`
                  <div class="provider-info">
                      <div class="type">\${p.icon || '📁'} \${p.name}</div>
                      <div class="detail">Custom Profile</div>
                  </div>
              \`;
              list.appendChild(div);
          });
      }

      function updateDashboard(providers) {
          const list = document.getElementById('providerList');
          const empty = document.getElementById('emptyState');
          const actions = document.getElementById('actionsSection');
          list.innerHTML = '';
          
          if (!providers || providers.length === 0) {
              empty.classList.remove('hidden');
              actions.classList.add('hidden');
          } else {
              empty.classList.add('hidden');
              actions.classList.remove('hidden');
              providers.forEach(p => {
                  const div = document.createElement('div');
                  div.className = 'provider-item';
                  const detail = p.type === 'local' ? (p.config ? p.config.path : '') : 'GitHub Cloud';
                  div.innerHTML = \`
                      <div class="provider-info">
                          <div class="type">\${p.type === 'gist' ? '📝' : '💾'} \${p.name}</div>
                          <div class="detail">\${detail}</div>
                      </div>
                      <button class="remove-btn" data-provider-id="\${p.id}">🗑️</button>
                  \`;
                  list.appendChild(div);
              });
          }
      }

      /* Core Handlers */
      function setupClick(id, action) {
          document.getElementById(id)?.addEventListener('click', action);
      }

      document.querySelectorAll('.section-header').forEach(h => {
          h.addEventListener('click', () => {
              const s = h.getAttribute('data-section');
              document.querySelectorAll('.section-content').forEach(c => {
                  if (c.id === 'section-'+s) c.classList.toggle('active');
                  else c.classList.remove('active');
              });
          });
      });

      // Event delegation for remove buttons
      document.getElementById('providerList')?.addEventListener('click', (e) => {
          if (e.target.classList.contains('remove-btn')) {
              const id = e.target.getAttribute('data-provider-id');
              if (id) vscode.postMessage({type:'removeProvider', id: id});
          }
      });

      setupClick('syncBtn', () => vscode.postMessage({type:'action', cmd:'sync'}));
      setupClick('pushBtn', () => vscode.postMessage({type:'action', cmd:'push'}));
      setupClick('pullBtn', () => vscode.postMessage({type:'action', cmd:'pull'}));
      setupClick('gistOAuthBtn', () => vscode.postMessage({type:'startOAuth', provider:'gist'}));
      setupClick('gistTokenToggleBtn', () => document.getElementById('gist-token').classList.toggle('hidden'));
      setupClick('saveGistTokenBtn', () => {
          const t = document.getElementById('gistTokenInput').value;
          if(t) vscode.postMessage({type:'saveToken', token:t});
      });
      setupClick('connectLocalBtn', () => vscode.postMessage({type:'connectLocal'}));
      setupClick('changeLocalPathBtn', () => vscode.postMessage({type:'changeLocalPath'}));
    </script>
  </body>
</html>`;
}
