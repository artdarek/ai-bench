const STORAGE_KEY = 'aibench_history_v1';
const MAX_HISTORY = 300;

const state = {
  config: null,
  history: loadHistory(),
};

const el = {
  provider: document.getElementById('provider'),
  model: document.getElementById('model'),
  deployment: document.getElementById('deployment'),
  modelWrap: document.getElementById('modelWrap'),
  deploymentWrap: document.getElementById('deploymentWrap'),
  systemPrompt: document.getElementById('systemPrompt'),
  message: document.getElementById('message'),
  sendBtn: document.getElementById('sendBtn'),
  exportBtn: document.getElementById('exportBtn'),
  clearBtn: document.getElementById('clearBtn'),
  status: document.getElementById('status'),
  answer: document.getElementById('answer'),
  inputTokens: document.getElementById('inputTokens'),
  outputTokens: document.getElementById('outputTokens'),
  totalTokens: document.getElementById('totalTokens'),
  totalCost: document.getElementById('totalCost'),
  history: document.getElementById('history'),
};

init().catch((error) => setStatus(`Initialization error: ${error.message}`, true));

async function init() {
  const response = await fetch('/api/config');
  const payload = await readApiResponse(response);
  if (!response.ok) {
    throw new Error(payload?.detail || 'Could not load configuration.');
  }

  state.config = payload;
  setupProviderOptions();
  renderHistory();

  el.provider.addEventListener('change', onProviderChange);
  el.sendBtn.addEventListener('click', onSend);
  el.exportBtn.addEventListener('click', exportCsv);
  el.clearBtn.addEventListener('click', clearHistory);
}

function setupProviderOptions() {
  const providers = Object.entries(state.config.providers || {});
  el.provider.innerHTML = providers
    .map(([key, provider]) => `<option value="${key}">${provider.label || key}</option>`)
    .join('');

  onProviderChange();
}

function onProviderChange() {
  const provider = el.provider.value;
  const providerCfg = state.config.providers?.[provider];

  if (!providerCfg) {
    return;
  }

  if (provider === 'openai') {
    el.modelWrap.classList.remove('hidden');
    el.deploymentWrap.classList.add('hidden');
    el.model.innerHTML = (providerCfg.models || [])
      .map((m) => `<option value="${m.id}">${m.label || m.id}</option>`)
      .join('');
  } else {
    el.modelWrap.classList.add('hidden');
    el.deploymentWrap.classList.remove('hidden');
    el.deployment.innerHTML = (providerCfg.deployments || [])
      .map((d) => `<option value="${d.name}">${d.label || d.name}</option>`)
      .join('');
  }
}

async function onSend() {
  const message = el.message.value.trim();
  if (!message) {
    setStatus('Enter a message.', true);
    return;
  }

  const provider = el.provider.value;
  const body = {
    provider,
    system_prompt: el.systemPrompt.value,
    message,
  };

  if (provider === 'openai') {
    body.model = el.model.value;
  } else {
    body.deployment = el.deployment.value;
  }

  toggleBusy(true);
  setStatus('Sending request...');

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const payload = await readApiResponse(response);
    if (!response.ok) {
      throw new Error(payload?.detail || 'API request failed.');
    }

    el.answer.textContent = payload.answer || '';
    el.inputTokens.textContent = String(payload.usage?.input_tokens ?? 0);
    el.outputTokens.textContent = String(payload.usage?.output_tokens ?? 0);
    el.totalTokens.textContent = String(payload.usage?.total_tokens ?? 0);
    el.totalCost.textContent = `$${formatUsd(payload.cost?.total_cost_usd ?? 0)}`;

    const historyEntry = {
      id: `run-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
      provider,
      model: payload.selected?.resolved_model || payload.selected?.model || '',
      deployment: payload.selected?.deployment || '',
      systemPrompt: body.system_prompt,
      message,
      answer: payload.answer || '',
      usage: payload.usage || {},
      cost: payload.cost || {},
    };

    state.history = [...state.history, historyEntry].slice(-MAX_HISTORY);
    persistHistory();
    renderHistory();
    setStatus('Done.');
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    toggleBusy(false);
  }
}

function renderHistory() {
  if (!state.history.length) {
    el.history.innerHTML = '<p>No saved runs yet.</p>';
    return;
  }

  const sorted = [...state.history].reverse();
  el.history.innerHTML = sorted
    .map(
      (item) => `<article class="history-item">
        <div class="meta">${new Date(item.createdAt).toLocaleString()} | ${item.provider} | ${item.deployment || item.model}</div>
        <div><strong>System:</strong> ${escapeHtml(shorten(item.systemPrompt, 220))}</div>
        <div><strong>Message:</strong> ${escapeHtml(shorten(item.message, 220))}</div>
        <div><strong>Answer:</strong> ${escapeHtml(shorten(item.answer, 220))}</div>
        <div class="meta">input=${item.usage?.input_tokens ?? 0}, output=${item.usage?.output_tokens ?? 0}, total=${item.usage?.total_tokens ?? 0}, cost=$${formatUsd(item.cost?.total_cost_usd ?? 0)}</div>
      </article>`
    )
    .join('');
}

function loadHistory() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function persistHistory() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.history));
}

function clearHistory() {
  state.history = [];
  persistHistory();
  renderHistory();
  setStatus('History cleared.');
}

function exportCsv() {
  if (!state.history.length) {
    setStatus('No data to export.', true);
    return;
  }

  const header = [
    'id',
    'createdAt',
    'provider',
    'model',
    'deployment',
    'inputTokens',
    'outputTokens',
    'totalTokens',
    'inputCostUsd',
    'outputCostUsd',
    'totalCostUsd',
    'systemPrompt',
    'message',
    'answer',
  ];

  const rows = state.history.map((item) => [
    item.id,
    item.createdAt,
    item.provider,
    item.model,
    item.deployment,
    item.usage?.input_tokens ?? '',
    item.usage?.output_tokens ?? '',
    item.usage?.total_tokens ?? '',
    item.cost?.input_cost_usd ?? '',
    item.cost?.output_cost_usd ?? '',
    item.cost?.total_cost_usd ?? '',
    item.systemPrompt,
    item.message,
    item.answer,
  ]);

  const csv = [header, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;

  link.href = url;
  link.download = `aibench-report-${stamp}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  setStatus('CSV downloaded.');
}

function toggleBusy(isBusy) {
  el.sendBtn.disabled = isBusy;
  el.exportBtn.disabled = isBusy;
}

function setStatus(text, isError = false) {
  el.status.textContent = text;
  el.status.style.color = isError ? '#b42318' : '#5f6b7d';
}

function formatUsd(value) {
  return Number(value || 0).toFixed(8);
}

function shorten(text, maxLen) {
  const value = String(text || '');
  return value.length > maxLen ? `${value.slice(0, maxLen - 1)}...` : value;
}

function escapeCsv(value) {
  const raw = String(value ?? '');
  return `"${raw.replace(/"/g, '""')}"`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

async function readApiResponse(response) {
  const text = await response.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { detail: text };
  }
}
