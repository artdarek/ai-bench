const STORAGE_KEY = 'aibench_history_v1';
const MAX_HISTORY = 300;
const DEFAULT_SYSTEM_PROMPT =
  'You are a friendly and polite assistant. Be warm, helpful, and concise in your responses.';
const DEFAULT_MESSAGE = 'How are you?';

const MAX_COMPARE = 10;

const state = {
  config: null,
  history: loadHistory(),
  pendingDeleteEntryId: null,
  compareSelection: new Set(),
  compareEntries: [],
};

const el = {
  provider: document.getElementById('provider'),
  model: document.getElementById('model'),
  deployment: document.getElementById('deployment'),
  modelWrap: document.getElementById('modelWrap'),
  deploymentWrap: document.getElementById('deploymentWrap'),
  systemPrompt: document.getElementById('systemPrompt'),
  includeConversationHistory: document.getElementById('includeConversationHistory'),
  historyMessageLimit: document.getElementById('historyMessageLimit'),
  message: document.getElementById('message'),
  keepMessageAfterSend: document.getElementById('keepMessageAfterSend'),
  sendBtn: document.getElementById('sendBtn'),
  exportBtn: document.getElementById('exportBtn'),
  clearBtn: document.getElementById('clearBtn'),
  status: document.getElementById('status'),
  answer: document.getElementById('answer'),
  inputTokens: document.getElementById('inputTokens'),
  outputTokens: document.getElementById('outputTokens'),
  inputCost: document.getElementById('inputCost'),
  outputCost: document.getElementById('outputCost'),
  totalTokens: document.getElementById('totalTokens'),
  totalCost: document.getElementById('totalCost'),
  responseTimeMs: document.getElementById('responseTimeMs'),
  contextMessagesCount: document.getElementById('contextMessagesCount'),
  systemPromptChars: document.getElementById('systemPromptChars'),
  contextChars: document.getElementById('contextChars'),
  messageChars: document.getElementById('messageChars'),
  outputChars: document.getElementById('outputChars'),
  history: document.getElementById('history'),
  historyDetailsModal: document.getElementById('historyDetailsModal'),
  historyDetailsCloseBtn: document.getElementById('historyDetailsCloseBtn'),
  historyTabButtons: Array.from(document.querySelectorAll('[data-history-tab]')),
  historyTabPanels: Array.from(document.querySelectorAll('[data-history-panel]')),
  historyDetailsId: document.getElementById('historyDetailsId'),
  historyDetailsCreatedAt: document.getElementById('historyDetailsCreatedAt'),
  historyDetailsProvider: document.getElementById('historyDetailsProvider'),
  historyDetailsModel: document.getElementById('historyDetailsModel'),
  historyDetailsDeployment: document.getElementById('historyDetailsDeployment'),
  historyDetailsResponseTime: document.getElementById('historyDetailsResponseTime'),
  historyDetailsContextMessages: document.getElementById('historyDetailsContextMessages'),
  historyDetailsSystemPromptChars: document.getElementById('historyDetailsSystemPromptChars'),
  historyDetailsContextChars: document.getElementById('historyDetailsContextChars'),
  historyDetailsMessageChars: document.getElementById('historyDetailsMessageChars'),
  historyDetailsOutputChars: document.getElementById('historyDetailsOutputChars'),
  historyDetailsInputTokens: document.getElementById('historyDetailsInputTokens'),
  historyDetailsOutputTokens: document.getElementById('historyDetailsOutputTokens'),
  historyDetailsTotalTokens: document.getElementById('historyDetailsTotalTokens'),
  historyDetailsInputCost: document.getElementById('historyDetailsInputCost'),
  historyDetailsOutputCost: document.getElementById('historyDetailsOutputCost'),
  historyDetailsTotalCost: document.getElementById('historyDetailsTotalCost'),
  historyDetailsSystemPrompt: document.getElementById('historyDetailsSystemPrompt'),
  historyDetailsMessage: document.getElementById('historyDetailsMessage'),
  historyDetailsAnswer: document.getElementById('historyDetailsAnswer'),
  historyDeleteConfirmModal: document.getElementById('historyDeleteConfirmModal'),
  historyDeleteCloseBtn: document.getElementById('historyDeleteCloseBtn'),
  historyDeleteCancelBtn: document.getElementById('historyDeleteCancelBtn'),
  historyDeleteConfirmBtn: document.getElementById('historyDeleteConfirmBtn'),
  compareBtn: document.getElementById('compareBtn'),
  compareCount: document.getElementById('compareCount'),
  compareModal: document.getElementById('compareModal'),
  compareCloseBtn: document.getElementById('compareCloseBtn'),
  compareTableHead: document.getElementById('compareTableHead'),
  compareTableBody: document.getElementById('compareTableBody'),
  compareExportBtn: document.getElementById('compareExportBtn'),
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
  applyDefaultPrompts();
  renderHistory();

  el.provider.addEventListener('change', onProviderChange);
  el.message.addEventListener('input', resizeMessageInput);
  el.includeConversationHistory.addEventListener('change', onHistoryToggleChange);
  el.history.addEventListener('click', onHistoryClick);
  el.historyDetailsModal.addEventListener('click', onModalClick);
  el.historyDetailsCloseBtn.addEventListener('click', closeHistoryDetailsModal);
  el.historyDeleteConfirmModal.addEventListener('click', onDeleteModalClick);
  el.historyDeleteCloseBtn.addEventListener('click', closeDeleteConfirmModal);
  el.historyDeleteCancelBtn.addEventListener('click', closeDeleteConfirmModal);
  el.historyDeleteConfirmBtn.addEventListener('click', confirmDeleteHistoryEntry);
  el.historyTabButtons.forEach((button) => button.addEventListener('click', onHistoryTabClick));
  el.compareBtn.addEventListener('click', openCompareModal);
  el.compareCloseBtn.addEventListener('click', closeCompareModal);
  el.compareModal.addEventListener('click', onCompareModalClick);
  el.compareExportBtn.addEventListener('click', exportCompareCsv);
  document.addEventListener('keydown', onGlobalKeyDown);
  el.sendBtn.addEventListener('click', onSend);
  el.exportBtn.addEventListener('click', exportCsv);
  el.clearBtn.addEventListener('click', clearHistory);
  onHistoryToggleChange();
  resizeMessageInput();
}

function setupProviderOptions() {
  const providers = Object.entries(state.config.providers || {});
  el.provider.innerHTML = providers
    .map(([key, provider]) => `<option value="${key}">${provider.label || key}</option>`)
    .join('');

  onProviderChange();
}

function applyDefaultPrompts() {
  if (!el.systemPrompt.value.trim()) {
    el.systemPrompt.value = DEFAULT_SYSTEM_PROMPT;
  }
  if (!el.message.value.trim()) {
    el.message.value = DEFAULT_MESSAGE;
  }
}

function onProviderChange() {
  const draftSystemPrompt = el.systemPrompt.value;
  const draftMessage = el.message.value;
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

  // Keep user drafts untouched when switching provider/model/deployment.
  el.systemPrompt.value = draftSystemPrompt;
  el.message.value = draftMessage;
  resizeMessageInput();
}

function onHistoryToggleChange() {
  const enabled = Boolean(el.includeConversationHistory?.checked);
  el.historyMessageLimit.disabled = !enabled;
}

async function onSend() {
  const message = el.message.value.trim();
  if (!message) {
    setStatus('Enter a message.', true);
    return;
  }

  const provider = el.provider.value;
  const historyContext = buildHistoryContext();
  const systemPromptChars = countChars(el.systemPrompt.value);
  const contextChars = historyContext.messages.reduce((sum, msg) => sum + countChars(msg.content), 0);
  const messageChars = countChars(message);
  const body = {
    provider,
    system_prompt: el.systemPrompt.value,
    message,
    history_messages: historyContext.messages,
  };

  if (provider === 'openai') {
    body.model = el.model.value;
  } else {
    body.deployment = el.deployment.value;
  }

  toggleBusy(true);
  setStatus('Sending request...');

  try {
    const startedAt = performance.now();
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const payload = await readApiResponse(response);
    const responseTimeMs = Math.max(0, Math.round(performance.now() - startedAt));
    if (!response.ok) {
      throw new Error(payload?.detail || 'API request failed.');
    }
    const outputChars = countChars(payload.answer || '');

    el.answer.textContent = payload.answer || '';
    el.inputTokens.textContent = String(payload.usage?.input_tokens ?? 0);
    el.outputTokens.textContent = String(payload.usage?.output_tokens ?? 0);
    el.inputCost.textContent = `$${formatUsd(payload.cost?.input_cost_usd ?? 0)}`;
    el.outputCost.textContent = `$${formatUsd(payload.cost?.output_cost_usd ?? 0)}`;
    el.totalTokens.textContent = String(payload.usage?.total_tokens ?? 0);
    el.totalCost.textContent = `$${formatUsd(payload.cost?.total_cost_usd ?? 0)}`;
    el.responseTimeMs.textContent = formatResponseTimeMs(responseTimeMs);
    el.systemPromptChars.textContent = String(systemPromptChars);
    el.contextChars.textContent = String(contextChars);
    el.messageChars.textContent = String(messageChars);
    el.outputChars.textContent = String(outputChars);
    el.contextMessagesCount.textContent = String(historyContext.contextMessagesCount);

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
      responseTimeMs,
      contextMessagesCount: historyContext.contextMessagesCount,
      systemPromptChars,
      contextChars,
      messageChars,
      outputChars,
    };

    state.history = [...state.history, historyEntry].slice(-MAX_HISTORY);
    persistHistory();
    renderHistory();
    if (!el.keepMessageAfterSend?.checked) {
      el.message.value = '';
    }
    resizeMessageInput();
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
      (item) => {
        const isChecked = state.compareSelection.has(item.id);
        const isDisabled = !isChecked && state.compareSelection.size >= MAX_COMPARE;
        return `<article class="history-item${isChecked ? ' history-item-selected' : ''}">
        <div class="d-flex justify-content-between align-items-start gap-2">
          <div class="meta history-meta-line">
            <i class="bi bi-clock-history me-1" aria-hidden="true"></i>
            <span>${formatHistoryDate(item.createdAt)}</span>
            <span class="dot-sep">•</span>
            <span class="badge text-bg-secondary">${item.provider}</span>
            <span class="badge text-bg-secondary">${item.deployment || item.model}</span>
          </div>
          <div class="d-flex align-items-center gap-2">
            <button class="btn btn-sm btn-outline-secondary history-details-btn" data-entry-id="${item.id}" title="Show details">
              <i class="bi bi-info-circle" aria-hidden="true"></i>
            </button>
            <button class="btn btn-sm btn-outline-info history-reuse-btn" data-entry-id="${item.id}" title="Load into form">
              <i class="bi bi-arrow-clockwise" aria-hidden="true"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger history-delete-btn" data-entry-id="${item.id}" title="Delete entry">
              <i class="bi bi-trash3" aria-hidden="true"></i>
            </button>
            <input class="form-check-input history-compare-cb ms-1" type="checkbox" data-entry-id="${item.id}"${isChecked ? ' checked' : ''}${isDisabled ? ' disabled' : ''} title="Select for comparison (max ${MAX_COMPARE})" aria-label="Select run for comparison">
          </div>
        </div>
        <div class="history-preview-grid mt-2">
          <div class="history-preview-field">
            <label class="form-label fw-semibold mb-1"><i class="bi bi-chat-text label-icon" aria-hidden="true"></i>Message</label>
            <textarea class="form-control history-preview-textarea" rows="4" readonly>${escapeHtml(item.message || '')}</textarea>
          </div>
          <div class="history-preview-field">
            <label class="form-label fw-semibold mb-1"><i class="bi bi-reply-fill label-icon" aria-hidden="true"></i>Response</label>
            <textarea class="form-control history-preview-textarea" rows="4" readonly>${escapeHtml(item.answer || '')}</textarea>
          </div>
          <div class="history-preview-field">
            <label class="form-label fw-semibold mb-1"><i class="bi bi-sliders2 label-icon" aria-hidden="true"></i>System Prompt</label>
            <textarea class="form-control history-preview-textarea" rows="4" readonly>${escapeHtml(item.systemPrompt || '')}</textarea>
          </div>
        </div>
        <div class="usage-card d-flex align-items-center justify-content-between gap-2 mt-2">
          <h4 class="usage-card-title mb-0">Context</h4>
          <div class="usage-inline-badges d-flex align-items-center gap-2">
            <span class="badge response-token-badge">Messages included: <strong class="ms-1">${item.contextMessagesCount ?? item.contextPairsCount ?? 0}</strong></span>
          </div>
        </div>
        <div class="history-chars-row usage-card d-flex align-items-center justify-content-between gap-2 mt-2">
          <h4 class="usage-card-title mb-0">Characters</h4>
          <div class="usage-inline-badges d-flex align-items-center gap-2">
            <span class="badge response-token-badge">System: <strong class="ms-1">${getSystemPromptChars(item)}</strong></span>
            <span class="badge response-cost-badge">Context: <strong class="ms-1">${getContextChars(item)}</strong></span>
            <span class="badge response-cost-badge">Message: <strong class="ms-1">${item.messageChars ?? countChars(item.message || '')}</strong></span>
            <span class="badge response-time-badge">Output: <strong class="ms-1">${item.outputChars ?? countChars(item.answer || '')}</strong></span>
          </div>
        </div>
        <div class="usage-card d-flex align-items-center justify-content-between gap-2 mt-2">
          <h4 class="usage-card-title mb-0">Time</h4>
          <div class="usage-inline-badges d-flex align-items-center gap-2">
            <span class="badge response-time-badge">Response: <strong class="ms-1">${formatResponseTimeMs(item.responseTimeMs)}</strong></span>
          </div>
        </div>
        <div class="usage-grid usage-grid-compact history-usage-grid mt-2">
          <article class="usage-card">
            <h4 class="usage-card-title">Input</h4>
            <div class="d-flex flex-wrap gap-2">
              <span class="badge response-token-badge">Tokens: <strong class="ms-1">${item.usage?.input_tokens ?? 0}</strong></span>
              <span class="badge response-cost-badge">Cost: <strong class="ms-1">$${formatUsd(item.cost?.input_cost_usd ?? 0)}</strong></span>
            </div>
          </article>
          <article class="usage-card">
            <h4 class="usage-card-title">Output</h4>
            <div class="d-flex flex-wrap gap-2">
              <span class="badge response-token-badge">Tokens: <strong class="ms-1">${item.usage?.output_tokens ?? 0}</strong></span>
              <span class="badge response-cost-badge">Cost: <strong class="ms-1">$${formatUsd(item.cost?.output_cost_usd ?? 0)}</strong></span>
            </div>
          </article>
          <article class="usage-card">
            <h4 class="usage-card-title">Total</h4>
            <div class="d-flex flex-wrap gap-2">
              <span class="badge response-token-badge">Tokens: <strong class="ms-1">${item.usage?.total_tokens ?? 0}</strong></span>
              <span class="badge response-cost-badge">Cost: <strong class="ms-1">$${formatUsd(item.cost?.total_cost_usd ?? 0)}</strong></span>
            </div>
          </article>
        </div>
      </article>`;
      }
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

function buildHistoryContext() {
  if (!el.includeConversationHistory?.checked) {
    return { messages: [], contextMessagesCount: 0 };
  }

  const requestedCount = Number.parseInt(el.historyMessageLimit?.value || '0', 10);
  const pairCount = Number.isFinite(requestedCount) ? Math.max(1, Math.min(100, requestedCount)) : 1;
  const latestPairs = state.history.slice(-pairCount);
  const messages = [];

  for (const entry of latestPairs) {
    const userText = String(entry.message || '').trim();
    const assistantText = String(entry.answer || '').trim();
    if (userText) {
      messages.push({ role: 'user', content: userText });
    }
    if (assistantText) {
      messages.push({ role: 'assistant', content: assistantText });
    }
  }

  return { messages, contextMessagesCount: latestPairs.length };
}

function persistHistory() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.history));
}

function clearHistory() {
  state.history = [];
  state.compareSelection.clear();
  persistHistory();
  renderHistory();
  updateCompareBtn();
  setStatus('History cleared.');
}

function onHistoryClick(event) {
  const checkbox = event.target.closest('.history-compare-cb');
  if (checkbox) {
    const entryId = checkbox.dataset.entryId;
    if (checkbox.checked) {
      if (state.compareSelection.size < MAX_COMPARE) {
        state.compareSelection.add(entryId);
      } else {
        checkbox.checked = false;
      }
    } else {
      state.compareSelection.delete(entryId);
    }
    updateCompareBtn();
    renderHistory();
    return;
  }

  const actionButton = event.target.closest('.history-reuse-btn, .history-details-btn, .history-delete-btn');
  if (!actionButton) {
    return;
  }

  const entryId = actionButton.dataset.entryId;
  const entry = state.history.find((item) => item.id === entryId);
  if (!entry) {
    setStatus('Could not find selected history entry.', true);
    return;
  }

  if (actionButton.classList.contains('history-details-btn')) {
    openHistoryDetailsModal(entry);
    return;
  }

  if (actionButton.classList.contains('history-delete-btn')) {
    openDeleteConfirmModal(entryId);
    return;
  }

  if (actionButton.classList.contains('history-reuse-btn')) {
    el.provider.value = entry.provider || 'openai';
    onProviderChange();

    if (entry.provider === 'openai') {
      const hasModel = Array.from(el.model.options).some((opt) => opt.value === entry.model);
      if (hasModel) {
        el.model.value = entry.model;
      }
    } else if (entry.provider === 'azure') {
      const hasDeployment = Array.from(el.deployment.options).some((opt) => opt.value === entry.deployment);
      if (hasDeployment) {
        el.deployment.value = entry.deployment;
      }
    }

    el.systemPrompt.value = entry.systemPrompt || '';
    el.message.value = entry.message || '';
    resizeMessageInput();
    setStatus('History entry loaded into form.');
  }
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
    'responseTimeMs',
    'contextMessagesCount',
    'systemPromptChars',
    'contextChars',
    'messageChars',
    'outputChars',
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
    item.responseTimeMs ?? '',
    item.contextMessagesCount ?? item.contextPairsCount ?? '',
    item.systemPromptChars ?? countChars(item.systemPrompt || ''),
    getContextChars(item),
    item.messageChars ?? '',
    item.outputChars ?? '',
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
  el.status.style.color = isError ? '#ff6b6b' : '#9fb0ce';
}

function formatUsd(value) {
  return Number(value || 0).toFixed(8);
}

function formatResponseTimeMs(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return '0 ms';
  }

  const rounded = Math.round(numeric);
  if (rounded < 1000) {
    return `${rounded} ms`;
  }

  const seconds = Math.floor(rounded / 1000);
  const msRemainder = rounded % 1000;
  return `${seconds}s ${msRemainder}ms`;
}

function countChars(value) {
  return String(value || '').length;
}

function getSystemPromptChars(entry) {
  if (typeof entry?.systemPromptChars === 'number') {
    return entry.systemPromptChars;
  }
  return countChars(entry?.systemPrompt || '');
}

function getContextChars(entry) {
  if (typeof entry?.contextChars === 'number') {
    return entry.contextChars;
  }

  // Backward compatibility: older entries had a combined system+context value.
  if (typeof entry?.systemContextChars === 'number') {
    return Math.max(0, entry.systemContextChars - countChars(entry?.systemPrompt || ''));
  }
  return 0;
}

function formatHistoryDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value || '-';
  }
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}, ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
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

function resizeMessageInput() {
  const textarea = el.message;
  if (!textarea) {
    return;
  }

  const styles = window.getComputedStyle(textarea);
  const lineHeight = Number.parseFloat(styles.lineHeight) || 24;
  const borderOffset = textarea.offsetHeight - textarea.clientHeight;
  const maxHeight = lineHeight * 4 + borderOffset;

  textarea.style.height = 'auto';
  textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
  textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
}

function onModalClick(event) {
  const closeTarget = event.target.closest('[data-close-modal="true"]');
  if (closeTarget) {
    closeHistoryDetailsModal();
  }
}

function onGlobalKeyDown(event) {
  if (event.key === 'Escape' && !el.compareModal.classList.contains('hidden')) {
    closeCompareModal();
    return;
  }
  if (event.key === 'Escape' && !el.historyDetailsModal.classList.contains('hidden')) {
    closeHistoryDetailsModal();
    return;
  }
  if (event.key === 'Escape' && !el.historyDeleteConfirmModal.classList.contains('hidden')) {
    closeDeleteConfirmModal();
  }
}

function openHistoryDetailsModal(entry) {
  el.historyDetailsId.textContent = entry.id || '-';
  el.historyDetailsCreatedAt.textContent = entry.createdAt || '-';
  el.historyDetailsProvider.textContent = entry.provider || '-';
  el.historyDetailsModel.textContent = entry.model || '-';
  el.historyDetailsDeployment.textContent = entry.deployment || '-';
  el.historyDetailsResponseTime.textContent = formatResponseTimeMs(entry.responseTimeMs);
  el.historyDetailsContextMessages.textContent = String(entry.contextMessagesCount ?? entry.contextPairsCount ?? 0);
  el.historyDetailsSystemPromptChars.textContent = String(getSystemPromptChars(entry));
  el.historyDetailsContextChars.textContent = String(getContextChars(entry));
  el.historyDetailsMessageChars.textContent = String(entry.messageChars ?? countChars(entry.message || ''));
  el.historyDetailsOutputChars.textContent = String(entry.outputChars ?? countChars(entry.answer || ''));
  el.historyDetailsInputTokens.textContent = String(entry.usage?.input_tokens ?? 0);
  el.historyDetailsOutputTokens.textContent = String(entry.usage?.output_tokens ?? 0);
  el.historyDetailsTotalTokens.textContent = String(entry.usage?.total_tokens ?? 0);
  el.historyDetailsInputCost.textContent = `$${formatUsd(entry.cost?.input_cost_usd ?? 0)}`;
  el.historyDetailsOutputCost.textContent = `$${formatUsd(entry.cost?.output_cost_usd ?? 0)}`;
  el.historyDetailsTotalCost.textContent = `$${formatUsd(entry.cost?.total_cost_usd ?? 0)}`;
  el.historyDetailsSystemPrompt.value = entry.systemPrompt || '';
  el.historyDetailsMessage.value = entry.message || '';
  el.historyDetailsAnswer.value = entry.answer || '';

  setHistoryTab('stats');
  el.historyDetailsModal.classList.remove('hidden');
}

function closeHistoryDetailsModal() {
  el.historyDetailsModal.classList.add('hidden');
}

function onDeleteModalClick(event) {
  const closeTarget = event.target.closest('[data-close-delete-modal="true"]');
  if (closeTarget) {
    closeDeleteConfirmModal();
  }
}

function openDeleteConfirmModal(entryId) {
  state.pendingDeleteEntryId = entryId;
  el.historyDeleteConfirmModal.classList.remove('hidden');
}

function closeDeleteConfirmModal() {
  state.pendingDeleteEntryId = null;
  el.historyDeleteConfirmModal.classList.add('hidden');
}

function confirmDeleteHistoryEntry() {
  if (!state.pendingDeleteEntryId) {
    closeDeleteConfirmModal();
    return;
  }

  state.compareSelection.delete(state.pendingDeleteEntryId);
  state.history = state.history.filter((item) => item.id !== state.pendingDeleteEntryId);
  persistHistory();
  renderHistory();
  updateCompareBtn();
  closeDeleteConfirmModal();
  setStatus('History entry deleted.');
}

function onHistoryTabClick(event) {
  const tabName = event.currentTarget?.dataset?.historyTab;
  if (!tabName) {
    return;
  }
  setHistoryTab(tabName);
}

function setHistoryTab(tabName) {
  el.historyTabButtons.forEach((button) => {
    const isActive = button.dataset.historyTab === tabName;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-selected', String(isActive));
  });

  el.historyTabPanels.forEach((panel) => {
    const isActive = panel.dataset.historyPanel === tabName;
    panel.classList.toggle('hidden', !isActive);
  });
}

function updateCompareBtn() {
  const count = state.compareSelection.size;
  const visible = count >= 2;
  el.compareBtn.classList.toggle('hidden', !visible);
  el.compareCount.classList.toggle('hidden', count === 0);
  if (count > 0) {
    el.compareCount.textContent = `${count}/${MAX_COMPARE} selected`;
  }
}

function getCompareMetrics() {
  return [
    { label: 'Run ID', fn: (e) => e.id },
    { label: 'Date', fn: (e) => formatHistoryDate(e.createdAt) },
    { label: 'Provider', fn: (e) => e.provider || '-' },
    { label: 'Model / Deployment', fn: (e) => e.deployment || e.model || '-' },
    { label: 'Response Time', fn: (e) => formatResponseTimeMs(e.responseTimeMs) },
    { label: 'Context Messages', fn: (e) => String(e.contextMessagesCount ?? e.contextPairsCount ?? 0) },
    { label: 'System Prompt Chars', fn: (e) => String(getSystemPromptChars(e)) },
    { label: 'Context Chars', fn: (e) => String(getContextChars(e)) },
    { label: 'Message Chars', fn: (e) => String(e.messageChars ?? countChars(e.message || '')) },
    { label: 'Output Chars', fn: (e) => String(e.outputChars ?? countChars(e.answer || '')) },
    { label: 'Input Tokens', fn: (e) => String(e.usage?.input_tokens ?? 0) },
    { label: 'Output Tokens', fn: (e) => String(e.usage?.output_tokens ?? 0) },
    { label: 'Total Tokens', fn: (e) => String(e.usage?.total_tokens ?? 0) },
    { label: 'Input Cost (USD)', fn: (e) => `$${formatUsd(e.cost?.input_cost_usd ?? 0)}` },
    { label: 'Output Cost (USD)', fn: (e) => `$${formatUsd(e.cost?.output_cost_usd ?? 0)}` },
    { label: 'Total Cost (USD)', fn: (e) => `$${formatUsd(e.cost?.total_cost_usd ?? 0)}` },
    { label: 'System Prompt', fn: (e) => e.systemPrompt || '' },
    { label: 'Message', fn: (e) => e.message || '' },
    { label: 'Answer', fn: (e) => e.answer || '' },
  ];
}

function openCompareModal() {
  const entries = [...state.compareSelection]
    .map((id) => state.history.find((item) => item.id === id))
    .filter(Boolean);

  if (entries.length < 2) {
    return;
  }

  state.compareEntries = entries;
  const metrics = getCompareMetrics();
  const textMetricLabels = new Set(['System Prompt', 'Message', 'Answer']);

  const headCols = entries
    .map((_, i) => `<th class="compare-th compare-th-entry" scope="col">Run ${i + 1}</th>`)
    .join('');
  el.compareTableHead.innerHTML = `<tr><th class="compare-th compare-th-metric" scope="col">Metric</th>${headCols}</tr>`;

  const bodyRows = metrics
    .map((metric) => {
      const isText = textMetricLabels.has(metric.label);
      const values = entries.map((e) => metric.fn(e));
      const cells = values
        .map((v) => `<td class="compare-td${isText ? ' compare-td-text' : ''}">${escapeHtml(isText ? shorten(v, 300) : v)}</td>`)
        .join('');
      return `<tr><th class="compare-td compare-td-label" scope="row">${escapeHtml(metric.label)}</th>${cells}</tr>`;
    })
    .join('');

  el.compareTableBody.innerHTML = bodyRows;
  el.compareModal.classList.remove('hidden');
}

function exportCompareCsv() {
  const entries = state.compareEntries;
  if (!entries || entries.length < 2) {
    return;
  }

  const metrics = getCompareMetrics();
  const header = ['Metric', ...entries.map((_, i) => `Run ${i + 1}`)];
  const rows = metrics.map((metric) => [metric.label, ...entries.map((e) => metric.fn(e))]);
  const csv = [header, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  link.href = url;
  link.download = `aibench-compare-${stamp}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function closeCompareModal() {
  el.compareModal.classList.add('hidden');
}

function onCompareModalClick(event) {
  if (event.target.closest('[data-close-compare-modal="true"]')) {
    closeCompareModal();
  }
}
