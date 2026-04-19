import { authenticatePassport, clearPassportSession, getCurrentUser } from '../passport/passport.js';
import { runZayvoraQuery } from '../zayvora/zayvoraBridge.js';
import { runToolkitPlugin } from '../toolkit/toolkitBridge.js';
import { executeAction } from '../logichub/logichubBridge.js';
import { runResearch } from '../nex/nexBridge.js';
import { openModule } from '../engine/moduleLoader.js';
import { updateSkill } from '../social/skillhexBridge.js';

function pushLog(message) {
  const node = document.getElementById('workspace-log');
  if (!node) return;
  const line = document.createElement('div');
  line.textContent = `• ${message}`;
  node.prepend(line);
}

function renderWorkspace() {
  const root = document.getElementById('workspace-app');
  if (!root) return;

  const currentUser = getCurrentUser();
  console.log('Passport user:', currentUser);

  root.innerHTML = `
    <div class="workspace">
      <div class="workspace-panel" id="panel-left">
        <h3>Tools / Games / Modules</h3>
        <div class="workspace-actions">
          <button data-module="orchade">Orchade</button>
          <button data-module="mars">Mars</button>
          <button data-module="skillhex">SkillHex</button>
          <button data-tool="toolkit">Tools</button>
          <button data-tool="research">Research</button>
          <button id="passport-logout">Logout Passport</button>
        </div>
      </div>
      <div class="workspace-panel" id="panel-center">
        <div class="workspace-console">
          <div class="workspace-output" id="workspace-output">Zayvora workspace ready for ${currentUser}.</div>
          <div class="workspace-input">
            <input id="zayvora-input" placeholder="Ask Zayvora..." />
            <button id="zayvora-run">Run</button>
          </div>
        </div>
      </div>
      <div class="workspace-panel" id="panel-right">
        <h3>Execution / Research / Skills</h3>
        <div class="workspace-log" id="workspace-log"></div>
      </div>
    </div>
  `;

  wireWorkspaceEvents();
}

function renderLogin() {
  const root = document.getElementById('workspace-app');
  if (!root) return;

  root.innerHTML = `
    <div class="passport-login">
      <h2>Passport Identity Login</h2>
      <p>Tap NFC passport to begin workspace session.</p>
      <input id="passport-user-id" placeholder="Passport user id" />
      <button id="passport-login-button">Enter Workspace</button>
    </div>
  `;

  const loginButton = document.getElementById('passport-login-button');
  loginButton?.addEventListener('click', () => {
    const userId = document.getElementById('passport-user-id')?.value?.trim();
    if (!userId) return;
    authenticatePassport(userId);
    renderWorkspace();
  });
}

async function runReasoningFlow() {
  const input = document.getElementById('zayvora-input');
  const output = document.getElementById('workspace-output');
  const query = input?.value?.trim();
  if (!query || !output) return;

  pushLog(`Zayvora reasoning started: ${query}`);

  try {
    const reasoning = await runZayvoraQuery(query);
    output.textContent = JSON.stringify(reasoning, null, 2);
    pushLog('Zayvora reasoning complete.');

    const actionResult = await executeAction({ query, reasoning });
    pushLog(`Logichub execution: ${JSON.stringify(actionResult)}`);

    const researchResult = await runResearch(query);
    pushLog(`NEX research: ${JSON.stringify(researchResult)}`);

    updateSkill('reasoning_challenge', 1);
    pushLog('SkillHex reputation updated.');
  } catch (error) {
    output.textContent = `Error: ${error.message}`;
    pushLog(`Execution error: ${error.message}`);
  }
}

function wireWorkspaceEvents() {
  document.querySelectorAll('[data-module]').forEach((button) => {
    button.addEventListener('click', () => {
      const moduleName = button.getAttribute('data-module');
      if (!moduleName) return;
      openModule(moduleName);
      pushLog(`Module opened: ${moduleName}`);
      updateSkill('module_launch', 1);
    });
  });

  document.querySelector('[data-tool="toolkit"]')?.addEventListener('click', async () => {
    try {
      const toolkitResult = await runToolkitPlugin('default-tool', { ping: true });
      pushLog(`Toolkit plugin result: ${JSON.stringify(toolkitResult)}`);
    } catch (error) {
      pushLog(`Toolkit plugin unavailable: ${error.message}`);
    }
  });

  document.querySelector('[data-tool="research"]')?.addEventListener('click', async () => {
    const input = document.getElementById('zayvora-input');
    const query = input?.value?.trim() || 'ecosystem status';

    try {
      const researchResult = await runResearch(query);
      pushLog(`Research mode result: ${JSON.stringify(researchResult)}`);
    } catch (error) {
      pushLog(`Research mode error: ${error.message}`);
    }
  });

  document.getElementById('zayvora-run')?.addEventListener('click', runReasoningFlow);

  document.getElementById('zayvora-input')?.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') runReasoningFlow();
  });

  document.getElementById('passport-logout')?.addEventListener('click', () => {
    clearPassportSession();
    renderLogin();
  });
}

export function initWorkspace() {
  if (!getCurrentUser()) {
    renderLogin();
    return;
  }

  renderWorkspace();
}

initWorkspace();
