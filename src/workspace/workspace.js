import { getCurrentUser, authenticatePassport } from "/src/passport/passport.js";
import { runZayvoraQuery } from "/src/zayvora/zayvoraBridge.js";
import { runToolkitPlugin } from "/src/toolkit/toolkitBridge.js";
import { executeAction } from "/src/logichub/logichubBridge.js";
import { runResearch } from "/src/nex/nexBridge.js";
import { openModule } from "/src/engine/moduleLoader.js";
import { updateSkill } from "/src/social/skillhexBridge.js";

window.openModule = openModule;

const LOGIN_SCREEN = `
<div class="login-screen">
  <div class="login-card">
    <h1>APORAKSHA</h1>
    <p class="login-sub">Tap your passport to begin.</p>
    <input id="passport-id" placeholder="Passport ID" autocomplete="off"/>
    <button id="passport-login">Authenticate</button>
  </div>
</div>`;

function renderLogin(root) {
  root.innerHTML = LOGIN_SCREEN;
  const btn = root.querySelector("#passport-login");
  const input = root.querySelector("#passport-id");
  btn.addEventListener("click", () => {
    const id = input.value.trim();
    if (!id) return;
    authenticatePassport(id);
    renderWorkspace(root);
  });
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") btn.click(); });
}

function renderWorkspace(root) {
  root.innerHTML = `<div class="workspace">
    <aside id="panel-left" class="panel panel-left"></aside>
    <main id="panel-center" class="panel panel-center"></main>
    <aside id="panel-right" class="panel panel-right"></aside>
  </div>`;
  renderLeft();
  renderCenter();
  renderRight();
  console.log("Passport user:", getCurrentUser());
}

function renderLeft() {
  const left = document.getElementById("panel-left");
  left.innerHTML = `
    <div class="launcher">
      <div class="launcher-section">
        <h3>Modules</h3>
        <button onclick="openModule('orchade')">Orchade</button>
        <button onclick="openModule('mars')">Mars</button>
        <button onclick="openModule('skillhex')">SkillHex</button>
      </div>
      <div class="launcher-section">
        <h3>Tools</h3>
        <button data-tool="summarize">Summarize</button>
        <button data-tool="translate">Translate</button>
      </div>
      <div class="launcher-section">
        <h3>Modes</h3>
        <button data-mode="reason">Reasoning</button>
        <button data-mode="research">Research</button>
      </div>
    </div>`;
  left.querySelectorAll("[data-mode]").forEach((btn) =>
    btn.addEventListener("click", () => setMode(btn.dataset.mode)));
  left.querySelectorAll("[data-tool]").forEach((btn) =>
    btn.addEventListener("click", () => invokeTool(btn.dataset.tool)));
}

let activeMode = "reason";

function setMode(mode) {
  activeMode = mode;
  const hint = document.getElementById("console-hint");
  if (hint) hint.textContent = `Mode: ${mode}`;
}

async function invokeTool(name) {
  const input = document.getElementById("console-input")?.value ?? "";
  try {
    const result = await runToolkitPlugin(name, { text: input });
    logRight("execution", `Tool ${name}: ${JSON.stringify(result)}`);
  } catch (err) {
    logRight("execution", `Tool ${name} failed: ${err.message}`);
  }
}

function renderCenter() {
  const center = document.getElementById("panel-center");
  center.innerHTML = `
    <div class="console">
      <div class="console-header">
        <span>Zayvora Console</span>
        <span id="console-hint" class="mono">Mode: reason</span>
      </div>
      <div id="console-output" class="console-output"></div>
      <div class="console-input-row">
        <textarea id="console-input" placeholder="Ask Zayvora… (Ctrl+Enter to send)" rows="2"></textarea>
        <button id="console-submit">Send</button>
      </div>
    </div>`;
  document.getElementById("console-submit").addEventListener("click", submitQuery);
  document.getElementById("console-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submitQuery();
  });
}

async function submitQuery() {
  const input = document.getElementById("console-input");
  const output = document.getElementById("console-output");
  const query = input.value.trim();
  if (!query) return;
  input.value = "";
  appendConsole(output, "user", query);
  try {
    const fn = activeMode === "research" ? runResearch : runZayvoraQuery;
    const data = await fn(query);
    const answer = data.answer ?? JSON.stringify(data);
    appendConsole(output, "zayvora", answer);
    if (data.action) {
      const execResult = await executeAction(data.action);
      logRight("execution", `Action: ${JSON.stringify(execResult)}`);
    }
    if (activeMode === "research") logRight("research", answer);
    updateSkill(activeMode === "research" ? "research" : "reasoning", 1);
    logRight("skills", `+1 ${activeMode}`);
  } catch (err) {
    appendConsole(output, "error", err.message);
  }
}

function appendConsole(output, role, text) {
  const line = document.createElement("div");
  line.className = `console-line console-${role}`;
  line.textContent = `${role}: ${text}`;
  output.appendChild(line);
  output.scrollTop = output.scrollHeight;
}

function renderRight() {
  const right = document.getElementById("panel-right");
  right.innerHTML = `
    <div class="side-stack">
      <section><h3>Execution Logs</h3><div id="log-execution" class="log-box"></div></section>
      <section><h3>Research Results</h3><div id="log-research" class="log-box"></div></section>
      <section><h3>Skill Updates</h3><div id="log-skills" class="log-box"></div></section>
    </div>`;
}

function logRight(panel, msg) {
  const box = document.getElementById(`log-${panel}`);
  if (!box) return;
  const line = document.createElement("div");
  line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  box.appendChild(line);
  box.scrollTop = box.scrollHeight;
}

export function mountWorkspace(rootSelector = "#app") {
  const root = document.querySelector(rootSelector);
  if (!root) { console.error("Workspace root not found:", rootSelector); return; }
  if (getCurrentUser()) {
    renderWorkspace(root);
  } else {
    renderLogin(root);
  }
}
