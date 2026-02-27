const STORAGE_KEY = 'aibench_history_v1';
const UI_PREFS_KEY = 'aibench_ui_prefs_v1';
const SNAPSHOTS_LIST_KEY = 'aibench_snapshots_list_v1';
const STORAGE_KEYS = {
  llmProvider: 'llm_provider',
  llmModel: 'llm_model',
  llmDeployment: 'llm_deployment',
  openaiApiKey: 'openai_api_key',
  azureApiKey: 'azure_api_key',
};
const MAX_HISTORY = 300;
const DEFAULT_SYSTEM_PROMPT =
  'You are a friendly and polite assistant. Be warm, helpful, and concise in your responses.';
const DEFAULT_MESSAGE = 'How are you?';
const DEFAULT_HISTORY_MESSAGE_LIMIT = 10;

const MAX_COMPARE = 10;
const MAIN_TAB_PARAM = 'tab';
const VALID_MAIN_TABS = new Set(['response', 'chat', 'history', 'charts']);

const state = {
  config: null,
  history: loadHistory(),
  pendingDeleteEntryId: null,
  pendingConfirmAction: null,
  compareSelection: new Set(),
  compareEntries: [],
  uiPrefs: loadUiPrefs(),
  hasResponseData: false,
  chartInstance: null,
  chartInstance2: null,
  chartInstance3: null,
  chartInstance4: null,
  snapshotSaved: false,
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
  headerSaveBtn: document.getElementById('headerSaveBtn'),
  headerLoadSnapshotBtn: document.getElementById('headerLoadSnapshotBtn'),
  snapshotsListModal: document.getElementById('snapshotsListModal'),
  snapshotsListModalCloseBtn: document.getElementById('snapshotsListModalCloseBtn'),
  snapshotsListBody: document.getElementById('snapshotsListBody'),
  snapshotsListClearBtn: document.getElementById('snapshotsListClearBtn'),
  snapshotsListCloseFooterBtn: document.getElementById('snapshotsListCloseFooterBtn'),
  headerExportBtn: document.getElementById('headerExportBtn'),
  headerClearBtn: document.getElementById('headerClearBtn'),
  headerSettingsBtn: document.getElementById('headerSettingsBtn'),
  headerKeyIndicator: document.getElementById('headerKeyIndicator'),
  exportBtn: document.getElementById('exportBtn'),
  clearBtn: document.getElementById('clearBtn'),
  status: document.getElementById('status'),
  responseCard: document.getElementById('responseCard'),
  responseLoader: document.getElementById('responseLoader'),
  responseContent: document.getElementById('responseContent'),
  answer: document.getElementById('answer'),
  responseMessagePreview: document.getElementById('responseMessagePreview'),
  responseSystemPromptPreview: document.getElementById('responseSystemPromptPreview'),
  responseRawMessagePreview: document.getElementById('responseRawMessagePreview'),
  responseRawOutputPreview: document.getElementById('responseRawOutputPreview'),
  rawJsonChars: document.getElementById('rawJsonChars'),
  inputTokens: document.getElementById('inputTokens'),
  inputCachedTokens: document.getElementById('inputCachedTokens'),
  inputCachedTokensBadge: document.getElementById('inputCachedTokensBadge'),
  inputNonCachedTokens: document.getElementById('inputNonCachedTokens'),
  inputNonCachedTokensBadge: document.getElementById('inputNonCachedTokensBadge'),
  outputTokens: document.getElementById('outputTokens'),
  inputCost: document.getElementById('inputCost'),
  outputCost: document.getElementById('outputCost'),
  totalTokens: document.getElementById('totalTokens'),
  totalCost: document.getElementById('totalCost'),
  responseTimeMs: document.getElementById('responseTimeMs'),
  contextMessagesCount: document.getElementById('contextMessagesCount'),
  contextWindowMessages: document.getElementById('contextWindowMessages'),
  responseRequestedAt: document.getElementById('responseRequestedAt'),
  responseRespondedAt: document.getElementById('responseRespondedAt'),
  systemPromptChars: document.getElementById('systemPromptChars'),
  contextChars: document.getElementById('contextChars'),
  messageChars: document.getElementById('messageChars'),
  outputChars: document.getElementById('outputChars'),
  history: document.getElementById('history'),
  chatViewBody: document.getElementById('chatViewBody'),
  historyTabBtn: document.getElementById('historyTabBtn'),
  historyDetailsModal: document.getElementById('historyDetailsModal'),
  historyDetailsCloseBtn: document.getElementById('historyDetailsCloseBtn'),
  mainTabButtons: Array.from(document.querySelectorAll('[data-main-tab]')),
  mainTabPanels: Array.from(document.querySelectorAll('[data-main-panel]')),
  historyTabButtons: Array.from(document.querySelectorAll('[data-history-tab]')),
  historyTabPanels: Array.from(document.querySelectorAll('[data-history-panel]')),
  historyDetailsId: document.getElementById('historyDetailsId'),
  historyDetailsCreatedAt: document.getElementById('historyDetailsCreatedAt'),
  historyDetailsRequestedAt: document.getElementById('historyDetailsRequestedAt'),
  historyDetailsRespondedAt: document.getElementById('historyDetailsRespondedAt'),
  historyDetailsProvider: document.getElementById('historyDetailsProvider'),
  historyDetailsModel: document.getElementById('historyDetailsModel'),
  historyDetailsDeployment: document.getElementById('historyDetailsDeployment'),
  historyDetailsResponseTime: document.getElementById('historyDetailsResponseTime'),
  historyDetailsContextMessages: document.getElementById('historyDetailsContextMessages'),
  historyDetailsContextWindow: document.getElementById('historyDetailsContextWindow'),
  historyDetailsSystemPromptChars: document.getElementById('historyDetailsSystemPromptChars'),
  historyDetailsContextChars: document.getElementById('historyDetailsContextChars'),
  historyDetailsMessageChars: document.getElementById('historyDetailsMessageChars'),
  historyDetailsOutputChars: document.getElementById('historyDetailsOutputChars'),
  historyDetailsRawJsonChars: document.getElementById('historyDetailsRawJsonChars'),
  historyDetailsInputTokens: document.getElementById('historyDetailsInputTokens'),
  historyDetailsInputCacheBreakdown: document.getElementById('historyDetailsInputCacheBreakdown'),
  historyDetailsInputCachedTokens: document.getElementById('historyDetailsInputCachedTokens'),
  historyDetailsInputCachedCost: document.getElementById('historyDetailsInputCachedCost'),
  historyDetailsInputNonCachedTokens: document.getElementById('historyDetailsInputNonCachedTokens'),
  historyDetailsInputNonCachedCost: document.getElementById('historyDetailsInputNonCachedCost'),
  historyDetailsOutputTokens: document.getElementById('historyDetailsOutputTokens'),
  historyDetailsTotalTokens: document.getElementById('historyDetailsTotalTokens'),
  historyDetailsInputCost: document.getElementById('historyDetailsInputCost'),
  historyDetailsOutputCost: document.getElementById('historyDetailsOutputCost'),
  historyDetailsTotalCost: document.getElementById('historyDetailsTotalCost'),
  historyDetailsTokenChart: document.getElementById('historyDetailsTokenChart'),
  historyDetailsSystemPrompt: document.getElementById('historyDetailsSystemPrompt'),
  historyDetailsMessage: document.getElementById('historyDetailsMessage'),
  historyDetailsLlmMessages: document.getElementById('historyDetailsLlmMessages'),
  historyDetailsLlmResponse: document.getElementById('historyDetailsLlmResponse'),
  historyDetailsAnswer: document.getElementById('historyDetailsAnswer'),
  historyConfirmModal: document.getElementById('historyConfirmModal'),
  historyConfirmTitle: document.getElementById('historyConfirmTitle'),
  historyConfirmMessage: document.getElementById('historyConfirmMessage'),
  historyConfirmCloseBtn: document.getElementById('historyConfirmCloseBtn'),
  historyConfirmCancelBtn: document.getElementById('historyConfirmCancelBtn'),
  historyConfirmActionBtn: document.getElementById('historyConfirmActionBtn'),
  historySelectAll: document.getElementById('historySelectAll'),
  historyViewToggleBtn: document.getElementById('historyViewToggleBtn'),
  compareBtn: document.getElementById('compareBtn'),
  deleteSelectedBtn: document.getElementById('deleteSelectedBtn'),
  exportSelectedBtn: document.getElementById('exportSelectedBtn'),
  compareModal: document.getElementById('compareModal'),
  compareCloseBtn: document.getElementById('compareCloseBtn'),
  compareTableHead: document.getElementById('compareTableHead'),
  compareTableBody: document.getElementById('compareTableBody'),
  compareExportBtn: document.getElementById('compareExportBtn'),
  settingsModal: document.getElementById('settingsModal'),
  settingsModalCloseBtn: document.getElementById('settingsModalCloseBtn'),
  settingsModalDesc: document.getElementById('settingsModalDesc'),
  settingsProvider: document.getElementById('settingsProvider'),
  settingsApiKey: document.getElementById('settingsApiKey'),
  settingsProviderHint: document.getElementById('settingsProviderHint'),
  settingsToggleApiKeyBtn: document.getElementById('settingsToggleApiKeyBtn'),
  settingsEyeShow: document.getElementById('settingsEyeShow'),
  settingsEyeHide: document.getElementById('settingsEyeHide'),
  settingsRemoveKeyBtn: document.getElementById('settingsRemoveKeyBtn'),
  settingsCancelBtn: document.getElementById('settingsCancelBtn'),
  settingsSaveBtn: document.getElementById('settingsSaveBtn'),
  chartSelect: document.getElementById('chartSelect'),
  mainChart: document.getElementById('mainChart'),
  mainChart2: document.getElementById('mainChart2'),
  mainChart3: document.getElementById('mainChart3'),
  mainChart4: document.getElementById('mainChart4'),
  chartLabel: document.getElementById('chartLabel'),
  chartLabel2: document.getElementById('chartLabel2'),
  chartLabel3: document.getElementById('chartLabel3'),
  chartLabel4: document.getElementById('chartLabel4'),
  chartsEmpty: document.getElementById('chartsEmpty'),
  chartsWrap: document.getElementById('chartsWrap'),
  chartsWrap2: document.getElementById('chartsWrap2'),
  chartsWrap3: document.getElementById('chartsWrap3'),
  chartsWrap4: document.getElementById('chartsWrap4'),
};

init().catch((error) => setStatus(`Initialization error: ${error.message}`, 'error'));

function updateSaveBtn() {
  const disabled = state.snapshotSaved || state.history.length === 0;
  el.headerSaveBtn.disabled = disabled;
  el.headerSaveBtn.classList.toggle('btn-icon-disabled', disabled);
  if (!state.snapshotSaved && new URLSearchParams(location.search).has('snapshot')) {
    const cleanUrl = new URL(location.href);
    cleanUrl.searchParams.delete('snapshot');
    history.replaceState(null, '', cleanUrl.toString());
  }
}

function normalizeMainTab(tabName) {
  return VALID_MAIN_TABS.has(tabName) ? tabName : 'response';
}

function getMainTabFromUrl() {
  const params = new URLSearchParams(location.search);
  return normalizeMainTab(params.get(MAIN_TAB_PARAM));
}

function normalizeHistoryMessageLimit(value) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_HISTORY_MESSAGE_LIMIT;
  }
  return Math.max(1, Math.min(100, parsed));
}

function updateMainTabInUrl(tabName) {
  const normalized = normalizeMainTab(tabName);
  const url = new URL(location.href);
  if (normalized === 'response') {
    url.searchParams.delete(MAIN_TAB_PARAM);
  } else {
    url.searchParams.set(MAIN_TAB_PARAM, normalized);
  }
  history.replaceState(null, '', url.toString());
}

async function saveSnapshot() {
  try {
    el.headerSaveBtn.disabled = true;
    const response = await fetch('/api/snapshots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ history: state.history }),
    });
    const payload = await readApiResponse(response);
    if (!response.ok) throw new Error(payload?.detail || 'Save failed.');
    const url = new URL(location.href);
    url.search = '';
    url.searchParams.set('snapshot', payload.id);
    history.replaceState(null, '', url.toString());
    state.snapshotSaved = true;
    updateSaveBtn();
    saveSnapshotToList(payload.id, url.toString(), state.history.length);
    try {
      await navigator.clipboard.writeText(url.toString());
      setStatus('History saved. URL copied to clipboard.', 'success');
    } catch {
      setStatus('History saved. Share this URL.', 'success');
    }
  } catch (err) {
    setStatus(`Save failed: ${err.message}`, 'error');
    updateSaveBtn();
  }
}

async function init() {
  const response = await fetch('/api/config');
  const payload = await readApiResponse(response);
  if (!response.ok) {
    throw new Error(payload?.detail || 'Could not load configuration.');
  }

  state.config = payload;
  let openedFromSnapshot = false;

  // Load snapshot from URL (if present)
  const snapshotId = new URLSearchParams(location.search).get('snapshot');
  if (snapshotId) {
    openedFromSnapshot = true;
    const cleanUrl = new URL(location.href);
    cleanUrl.searchParams.delete('snapshot');
    history.replaceState(null, '', cleanUrl.toString());

    const snapResp = await fetch(`/api/snapshots/${encodeURIComponent(snapshotId)}`);
    if (snapResp.ok) {
      const snapData = await snapResp.json();
      if (Array.isArray(snapData.history)) {
        state.history = snapData.history;
        state.snapshotSaved = false;
      }
    } else {
      setStatus('Snapshot not found or expired.', 'warning');
    }
  }

  setupProviderOptions();
  applyDefaultPrompts();
  applyUiPreferences();
  applyHistoryView();
  setResponseHasData(false);
  setResponseLoading(false);
  renderHistory();

  el.provider.addEventListener('change', onProviderChange);
  el.model.addEventListener('change', () => localStorage.setItem(STORAGE_KEYS.llmModel, el.model.value));
  el.deployment.addEventListener('change', () => localStorage.setItem(STORAGE_KEYS.llmDeployment, el.deployment.value));
  el.message.addEventListener('input', resizeMessageInput);
  el.includeConversationHistory.addEventListener('change', onHistoryToggleChange);
  el.historyMessageLimit.addEventListener('change', onHistoryMessageLimitChange);
  el.historyMessageLimit.addEventListener('input', onHistoryMessageLimitChange);
  el.keepMessageAfterSend.addEventListener('change', onKeepMessageAfterSendChange);
  el.history.addEventListener('click', onHistoryClick);
  el.historyDetailsModal.addEventListener('click', onModalClick);
  el.historyDetailsCloseBtn.addEventListener('click', closeHistoryDetailsModal);
  el.historyConfirmModal.addEventListener('click', onConfirmModalClick);
  el.historyConfirmCloseBtn.addEventListener('click', closeConfirmModal);
  el.historyConfirmCancelBtn.addEventListener('click', closeConfirmModal);
  el.historyConfirmActionBtn.addEventListener('click', confirmModalAction);
  el.historySelectAll.addEventListener('change', onHistorySelectAll);
  el.historyViewToggleBtn.addEventListener('click', toggleHistoryView);
  el.chatViewBody.addEventListener('click', (e) => {
    const btn = e.target.closest('.chat-info-btn');
    if (!btn) return;
    const entry = state.history.find(h => h.id === btn.dataset.entryId);
    if (entry) openHistoryDetailsModal(entry);
  });
  el.mainTabButtons.forEach((button) => button.addEventListener('click', onMainTabClick));
  el.historyTabButtons.forEach((button) => button.addEventListener('click', onHistoryTabClick));
  el.chartSelect.addEventListener('change', renderChart);
  el.compareBtn.addEventListener('click', openCompareModal);
  el.deleteSelectedBtn.addEventListener('click', openDeleteSelectedConfirmModal);
  el.exportSelectedBtn.addEventListener('click', exportSelectedCsv);
  el.compareCloseBtn.addEventListener('click', closeCompareModal);
  el.compareModal.addEventListener('click', onCompareModalClick);
  el.compareExportBtn.addEventListener('click', exportCompareCsv);
  document.addEventListener('keydown', onGlobalKeyDown);
  window.addEventListener('popstate', () => setMainTab(getMainTabFromUrl(), { updateUrl: false }));
  el.sendBtn.addEventListener('click', onSend);
  el.headerSaveBtn.addEventListener('click', saveSnapshot);
  el.headerLoadSnapshotBtn.addEventListener('click', openSnapshotsListModal);
  el.snapshotsListModalCloseBtn.addEventListener('click', closeSnapshotsListModal);
  el.snapshotsListCloseFooterBtn.addEventListener('click', closeSnapshotsListModal);
  el.snapshotsListClearBtn.addEventListener('click', clearSnapshotsList);
  el.snapshotsListModal.addEventListener('click', (e) => {
    if (e.target === el.snapshotsListModal || e.target.closest('.history-modal-backdrop')) {
      closeSnapshotsListModal();
    }
  });
  el.snapshotsListBody.addEventListener('click', async (e) => {
    const deleteBtn = e.target.closest('.snapshots-list-delete-btn');
    if (deleteBtn) {
      const id = deleteBtn.dataset.id;
      const updated = loadSnapshotsList().filter(s => s.id !== id);
      localStorage.setItem(SNAPSHOTS_LIST_KEY, JSON.stringify(updated));
      openSnapshotsListModal();
      return;
    }

    const openBtn = e.target.closest('.snapshots-list-open-btn');
    if (openBtn) {
      window.open(openBtn.dataset.url, '_blank', 'noopener');
      return;
    }

    const renameBtn = e.target.closest('.snapshots-list-rename-btn');
    if (renameBtn) {
      const nameSpan = renameBtn.closest('.snapshots-list-name');
      const id = renameBtn.dataset.id;
      const currentName = renameBtn.dataset.name;
      nameSpan.innerHTML = '<input class="snapshots-list-name-input" type="text" maxlength="100" autocomplete="off">';
      const input = nameSpan.querySelector('input');
      input.value = currentName;
      input.focus();
      input.select();
      let committed = false;
      const commit = () => {
        if (committed) return;
        committed = true;
        const newName = input.value.trim() || currentName;
        const list = loadSnapshotsList();
        const entry = list.find(s => s.id === id);
        if (entry) {
          entry.name = newName;
          localStorage.setItem(SNAPSHOTS_LIST_KEY, JSON.stringify(list));
        }
        openSnapshotsListModal();
      };
      input.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') { ev.preventDefault(); commit(); }
        if (ev.key === 'Escape') { committed = true; openSnapshotsListModal(); }
      });
      input.addEventListener('blur', commit);
      return;
    }

    const btn = e.target.closest('.snapshots-list-copy-btn');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const url = btn.dataset.url;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      return;
    }
    const icon = btn.querySelector('i');
    icon.className = 'bi bi-check-lg snapshots-copy-ok';
    setTimeout(() => {
      icon.className = 'bi bi-share';
    }, 1500);
  });
  el.headerExportBtn.addEventListener('click', exportCsv);
  el.headerClearBtn.addEventListener('click', openClearConfirmModal);
  el.headerSettingsBtn.addEventListener('click', openSettingsModal);
  el.exportBtn.addEventListener('click', exportCsv);
  el.clearBtn.addEventListener('click', openClearConfirmModal);
  el.settingsModal.addEventListener('click', onSettingsModalClick);
  el.settingsModalCloseBtn.addEventListener('click', closeSettingsModal);
  el.settingsCancelBtn.addEventListener('click', closeSettingsModal);
  el.settingsProvider.addEventListener('change', onSettingsProviderChange);
  el.settingsSaveBtn.addEventListener('click', saveSettingsModal);
  el.settingsRemoveKeyBtn.addEventListener('click', removeSettingsProviderKey);
  el.settingsToggleApiKeyBtn.addEventListener('click', toggleSettingsApiKeyVisibility);
  el.settingsApiKey.addEventListener('keydown', onSettingsApiKeyKeyDown);
  document.querySelectorAll('.textarea-action-btn[data-copy]').forEach((btn) => {
    btn.addEventListener('click', onTextareaActionCopy);
  });
  document.querySelectorAll('.textarea-action-btn[data-reuse]').forEach((btn) => {
    btn.addEventListener('click', onTextareaActionReuse);
  });
  onHistoryToggleChange();
  resizeMessageInput();
  setMainTab(openedFromSnapshot ? 'history' : getMainTabFromUrl(), { updateUrl: false });
  updateSettingsModalState();
  updateKeyIndicator();
  updateSaveBtn();
}

function onTextareaActionCopy(e) {
  const btn = e.currentTarget;
  const sourceId = btn.dataset.copy;
  const text = document.getElementById(sourceId)?.value ?? '';
  navigator.clipboard.writeText(text).then(() => {
    const icon = btn.querySelector('i');
    icon.className = 'bi bi-clipboard-check';
    btn.classList.add('copied');
    setTimeout(() => {
      icon.className = 'bi bi-clipboard';
      btn.classList.remove('copied');
    }, 1500);
  });
}

function onTextareaActionReuse(e) {
  const btn = e.currentTarget;
  const sourceId = btn.dataset.reuse;
  const targetId = btn.dataset.target;
  const text = document.getElementById(sourceId)?.value ?? '';
  const target = document.getElementById(targetId);
  if (target) {
    target.value = text;
    target.dispatchEvent(new Event('input'));
  }
}

function setupProviderOptions() {
  const providers = Object.entries(state.config.providers || {});
  el.provider.innerHTML = providers
    .map(([key, provider]) => `<option value="${key}">${provider.label || key}</option>`)
    .join('');

  const preferredProvider = localStorage.getItem(STORAGE_KEYS.llmProvider);
  const hasPreferred = providers.some(([key]) => key === preferredProvider);
  if (hasPreferred) {
    el.provider.value = preferredProvider;
  }
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
    const enabledModels = (providerCfg.models || []).filter((m) => m.enabled !== false);
    if (enabledModels.length === 0) {
      el.model.innerHTML = '<option value="">No models available</option>';
      el.model.disabled = true;
    } else {
      el.model.innerHTML = enabledModels
        .map((m) => `<option value="${m.id}">${m.label || m.id}</option>`)
        .join('');
      el.model.disabled = false;
      const savedModel = localStorage.getItem(STORAGE_KEYS.llmModel);
      if (savedModel && enabledModels.some((m) => m.id === savedModel)) {
        el.model.value = savedModel;
      }
    }
  } else {
    el.modelWrap.classList.add('hidden');
    el.deploymentWrap.classList.remove('hidden');
    const enabledDeployments = (providerCfg.deployments || []).filter((d) => d.enabled !== false);
    if (enabledDeployments.length === 0) {
      el.deployment.innerHTML = '<option value="">No models available</option>';
      el.deployment.disabled = true;
    } else {
      el.deployment.innerHTML = enabledDeployments
        .map((d) => `<option value="${d.name}">${d.label || d.name}</option>`)
        .join('');
      el.deployment.disabled = false;
      const savedDeployment = localStorage.getItem(STORAGE_KEYS.llmDeployment);
      if (savedDeployment && enabledDeployments.some((d) => d.name === savedDeployment)) {
        el.deployment.value = savedDeployment;
      }
    }
  }

  // Keep user drafts untouched when switching provider/model/deployment.
  el.systemPrompt.value = draftSystemPrompt;
  el.message.value = draftMessage;
  resizeMessageInput();
  localStorage.setItem(STORAGE_KEYS.llmProvider, provider);
  if (el.settingsProvider.value !== provider) {
    el.settingsProvider.value = provider;
    updateSettingsModalState();
  }
  updateKeyIndicator();
}

function onHistoryToggleChange() {
  const enabled = Boolean(el.includeConversationHistory?.checked);
  el.historyMessageLimit.disabled = !enabled;
  state.uiPrefs.includeConversationHistory = enabled;
  persistUiPrefs();
}

function onHistoryMessageLimitChange() {
  const normalized = normalizeHistoryMessageLimit(el.historyMessageLimit?.value);
  el.historyMessageLimit.value = String(normalized);
  state.uiPrefs.historyMessageLimit = normalized;
  persistUiPrefs();
}

function getProviderStorageKey(provider) {
  if (provider === 'azure') {
    return STORAGE_KEYS.azureApiKey;
  }
  return STORAGE_KEYS.openaiApiKey;
}

function getSavedProviderKey(provider) {
  const storageKey = getProviderStorageKey(provider);
  return localStorage.getItem(storageKey) || '';
}

function providerHasServerKey(provider) {
  const value = state.config?.providers?.[provider]?.server_key;
  if (typeof value === 'boolean') {
    return value;
  }
  return null;
}

function hasEffectiveKey(provider) {
  const serverKeyStatus = providerHasServerKey(provider);
  return Boolean(getSavedProviderKey(provider) || serverKeyStatus === true);
}

function updateKeyIndicator() {
  const provider = el.provider.value || 'openai';
  const hasKey = hasEffectiveKey(provider);
  el.headerKeyIndicator.className = `key-indicator ${hasKey ? 'set' : 'missing'}`;
}

function updateSettingsModalState() {
  const provider = el.settingsProvider.value || 'openai';
  const savedKey = getSavedProviderKey(provider);
  const providerLabel = state.config?.providers?.[provider]?.label || provider;
  const serverKeyStatus = providerHasServerKey(provider);
  el.settingsApiKey.value = savedKey;
  el.settingsApiKey.type = 'password';
  el.settingsEyeShow.classList.remove('hidden');
  el.settingsEyeHide.classList.add('hidden');
  el.settingsRemoveKeyBtn.classList.toggle('hidden', !savedKey);
  if (serverKeyStatus === true) {
    el.settingsModalDesc.textContent =
      'This provider has a server-side key configured. You can optionally override it with your own key, stored in this browser.';
  } else if (serverKeyStatus === false) {
    el.settingsModalDesc.textContent =
      'No server-side key is configured for this provider. Add your own key to connect.';
  } else {
    el.settingsModalDesc.textContent =
      'Server-side key status is unavailable in current API response. Restart API service to refresh settings metadata.';
  }
  el.settingsProviderHint.textContent = `Runtime status: supported (${providerLabel}).`;

  if (provider === 'azure') {
    el.settingsApiKey.placeholder = 'azure-api-key...';
  } else {
    el.settingsApiKey.placeholder = 'sk-...';
  }
}

function openSettingsModal() {
  el.settingsProvider.value = el.provider.value || 'openai';
  updateSettingsModalState();
  el.settingsModal.classList.remove('hidden');
  setTimeout(() => el.settingsApiKey.focus(), 50);
}

function closeSettingsModal() {
  el.settingsModal.classList.add('hidden');
}

function openSnapshotsListModal() {
  const list = loadSnapshotsList();
  if (list.length === 0) {
    el.snapshotsListBody.innerHTML =
      '<p class="text-body-secondary text-center py-3 mb-0">No saved snapshots yet.</p>';
  } else {
    el.snapshotsListBody.innerHTML = list
      .map(
        (s) => `
        <div class="snapshots-list-item">
          <span class="snapshots-list-info">
            <span class="snapshots-list-date"><i class="bi bi-clock" aria-hidden="true"></i>${new Date(s.createdAt).toLocaleString()}<i class="bi bi-layers snapshots-list-count-icon" aria-hidden="true"></i>${s.count} request${s.count !== 1 ? 's' : ''}</span>
            <span class="snapshots-list-name">
              <span class="snapshots-list-name-text">${escapeHtml(s.name || `Snapshot ${snapshotTimestamp(new Date(s.createdAt))}`)}</span>
              <button class="snapshots-list-rename-btn" data-id="${escapeHtml(s.id)}" data-name="${escapeHtml(s.name || `Snapshot ${snapshotTimestamp(new Date(s.createdAt))}`)}" type="button" aria-label="Rename" title="Rename">
                <i class="bi bi-pencil" aria-hidden="true"></i>
              </button>
            </span>
            <span class="snapshots-list-meta">
              <span class="snapshots-list-url">${escapeHtml(s.url)}</span>
            </span>
          </span>
          <span class="snapshots-list-right">
            <button class="snapshots-list-delete-btn" data-id="${escapeHtml(s.id)}" type="button" aria-label="Delete" title="Remove from list">
              <i class="bi bi-trash3" aria-hidden="true"></i>
            </button>
            <span class="snapshots-list-divider" aria-hidden="true"></span>
            <button class="snapshots-list-copy-btn" data-url="${escapeHtml(s.url)}" type="button" aria-label="Copy URL" title="Copy URL">
              <i class="bi bi-share" aria-hidden="true"></i>
            </button>
            <button class="snapshots-list-open-btn" data-url="${escapeHtml(s.url)}" type="button" aria-label="Open snapshot" title="Open snapshot">
              <i class="bi bi-box-arrow-up-right" aria-hidden="true"></i>
            </button>
          </span>
        </div>`
      )
      .join('');
  }
  el.snapshotsListModal.classList.remove('hidden');
}

function closeSnapshotsListModal() {
  el.snapshotsListModal.classList.add('hidden');
}

function clearSnapshotsList() {
  localStorage.removeItem(SNAPSHOTS_LIST_KEY);
  el.snapshotsListBody.innerHTML =
    '<p class="text-body-secondary text-center py-3 mb-0">No saved snapshots yet.</p>';
}

function onSettingsProviderChange() {
  updateSettingsModalState();
}

function saveSettingsModal() {
  const provider = el.settingsProvider.value || 'openai';
  const storageKey = getProviderStorageKey(provider);
  const value = el.settingsApiKey.value.trim();
  if (value) {
    localStorage.setItem(storageKey, value);
  } else {
    localStorage.removeItem(storageKey);
  }
  localStorage.setItem(STORAGE_KEYS.llmProvider, provider);
  el.provider.value = provider;
  onProviderChange();
  updateSettingsModalState();
  updateKeyIndicator();
  closeSettingsModal();
  setStatus('Settings saved.', 'success');
}

function removeSettingsProviderKey() {
  const provider = el.settingsProvider.value || 'openai';
  localStorage.removeItem(getProviderStorageKey(provider));
  updateSettingsModalState();
  updateKeyIndicator();
}

function toggleSettingsApiKeyVisibility() {
  const isPassword = el.settingsApiKey.type === 'password';
  el.settingsApiKey.type = isPassword ? 'text' : 'password';
  el.settingsEyeShow.classList.toggle('hidden', isPassword);
  el.settingsEyeHide.classList.toggle('hidden', !isPassword);
}

function onSettingsApiKeyKeyDown(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    saveSettingsModal();
  }
}

function onSettingsModalClick(event) {
  if (event.target.closest('[data-close-settings-modal="true"]')) {
    closeSettingsModal();
  }
}

async function onSend() {
  const message = el.message.value.trim();
  if (!message) {
    setStatus('Enter a message.', 'warning');
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
  const customApiKey = getSavedProviderKey(provider);
  if (customApiKey) {
    body.api_key = customApiKey;
  }

  toggleBusy(true);
  setResponseLoading(true);
  setMainTab('response');
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

    el.responseMessagePreview.value = body.message || '';
    el.responseSystemPromptPreview.value = body.system_prompt || '';
    const rawJson = JSON.stringify(payload.llm_messages || [], null, 2);
    const rawJsonChars = rawJson.length;
    const rawOutputJson = JSON.stringify(payload.llm_response || {}, null, 2);
    el.responseRawMessagePreview.value = rawJson;
    el.responseRawOutputPreview.value = rawOutputJson;
    el.rawJsonChars.textContent = String(rawJsonChars);
    el.answer.value = payload.answer || '';
    setResponseHasData(true);
    el.inputTokens.textContent = String(payload.usage?.input_tokens ?? 0);
    el.outputTokens.textContent = String(payload.usage?.output_tokens ?? 0);
    el.inputCost.textContent = `$${formatUsd(payload.cost?.input_cost_usd ?? 0)}`;
    el.outputCost.textContent = `$${formatUsd(payload.cost?.output_cost_usd ?? 0)}`;
    el.totalTokens.textContent = String(payload.usage?.total_tokens ?? 0);
    const cachedTokens = payload.usage?.input_cached_tokens ?? 0;
    const nonCachedTokens = payload.usage?.input_non_cached_tokens ?? 0;
    el.inputCachedTokens.textContent = String(cachedTokens);
    el.inputNonCachedTokens.textContent = String(nonCachedTokens);
    el.inputCachedTokensBadge.style.display = cachedTokens > 0 ? '' : 'none';
    el.inputNonCachedTokensBadge.style.display = cachedTokens > 0 ? '' : 'none';
    el.totalCost.textContent = `$${formatUsd(payload.cost?.total_cost_usd ?? 0)}`;
    el.responseTimeMs.textContent = formatResponseTimeMs(responseTimeMs);
    el.responseRequestedAt.textContent = formatHistoryDate(payload.requested_at);
    el.responseRespondedAt.textContent = formatHistoryDate(payload.responded_at);
    el.systemPromptChars.textContent = String(systemPromptChars);
    el.contextChars.textContent = String(contextChars);
    el.messageChars.textContent = String(messageChars);
    el.outputChars.textContent = String(outputChars);
    el.contextMessagesCount.textContent = String(historyContext.contextMessagesCount);
    el.contextWindowMessages.textContent = String(historyContext.contextWindowMessages);

    const historyEntry = {
      id: `run-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
      requested_at: payload.requested_at,
      responded_at: payload.responded_at,
      provider,
      model: payload.selected?.resolved_model || payload.selected?.model || '',
      deployment: payload.selected?.deployment || '',
      systemPrompt: body.system_prompt,
      message,
      answer: payload.answer || '',
      llmMessages: Array.isArray(payload.llm_messages) ? payload.llm_messages : [],
      llmResponse: payload.llm_response || {},
      usage: payload.usage || {},
      cost: payload.cost || {},
      responseTimeMs,
      contextMessagesCount: historyContext.contextMessagesCount,
      contextWindowMessages: historyContext.contextWindowMessages,
      systemPromptChars,
      contextChars,
      messageChars,
      outputChars,
      rawJsonChars,
    };

    state.history = [...state.history, historyEntry].slice(-MAX_HISTORY);
    persistHistory();
    state.snapshotSaved = false;
    updateSaveBtn();
    renderHistory();
    renderChatView();
    if (!el.keepMessageAfterSend?.checked) {
      el.message.value = '';
    }
    resizeMessageInput();
    setStatus('Done.', 'success');
  } catch (error) {
    setStatus(error.message, 'error');
  } finally {
    toggleBusy(false);
    setResponseLoading(false);
  }
}

function renderHistory() {
  updateHistoryActionButtons();
  const count = state.history.length;
  el.historyTabBtn.innerHTML = `<i class="bi bi-clock-history me-1" aria-hidden="true"></i>History${count > 0 ? ` (${count})` : ''}`;

  if (!state.history.length) {
    el.history.innerHTML = '<p>No saved runs yet.</p>';
    return;
  }

  const sorted = [...state.history].reverse();
  el.history.innerHTML = sorted
    .map(
      (item) => {
        const isChecked = state.compareSelection.has(item.id);
        return `<div class="history-item-wrap">
        <input class="form-check-input history-compare-cb history-compare-cb-outer" type="checkbox" data-entry-id="${item.id}"${isChecked ? ' checked' : ''} title="Select for comparison" aria-label="Select run for comparison">
        <article class="history-item${isChecked ? ' history-item-selected' : ''}">
        <div class="d-flex justify-content-between align-items-start gap-2">
          <div class="meta history-meta-line">
            <i class="bi bi-clock-history me-1" aria-hidden="true"></i>
            <span>${formatHistoryDate(item.createdAt)}</span>
            <span class="dot-sep">•</span>
            <span class="badge text-bg-secondary"><i class="bi bi-hash me-1" aria-hidden="true"></i>${escapeHtml(item.id)}</span>
            <span class="badge text-bg-secondary"><i class="bi bi-hdd-network me-1" aria-hidden="true"></i>${escapeHtml(item.provider || '-')}</span>
            <span class="badge text-bg-secondary"><i class="bi bi-cpu me-1" aria-hidden="true"></i>${escapeHtml(item.deployment || item.model || '-')}</span>
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
          </div>
        </div>
        <div class="history-preview-grid mt-2">
          <div class="history-preview-field">
            <div class="textarea-label-row">
              <label class="form-label fw-semibold mb-0"><i class="bi bi-chat-text label-icon" aria-hidden="true"></i>Message</label>
              <div class="textarea-action-btns">
                <button class="textarea-action-btn" title="Copy to clipboard" data-action="copy"><i class="bi bi-clipboard" aria-hidden="true"></i></button>
                <button class="textarea-action-btn" title="Reuse as message" data-action="reuse" data-target="message"><i class="bi bi-arrow-return-left" aria-hidden="true"></i></button>
              </div>
            </div>
            <textarea class="form-control history-preview-textarea" rows="4" readonly>${escapeHtml(item.message || '')}</textarea>
          </div>
          <div class="history-preview-field">
            <div class="textarea-label-row">
              <label class="form-label fw-semibold mb-0"><i class="bi bi-reply-fill label-icon" aria-hidden="true"></i>Response</label>
              <div class="textarea-action-btns">
                <button class="textarea-action-btn" title="Copy to clipboard" data-action="copy"><i class="bi bi-clipboard" aria-hidden="true"></i></button>
              </div>
            </div>
            <textarea class="form-control history-preview-textarea" rows="4" readonly>${escapeHtml(item.answer || '')}</textarea>
          </div>
          <div class="history-preview-field">
            <div class="textarea-label-row">
              <label class="form-label fw-semibold mb-0"><i class="bi bi-sliders2 label-icon" aria-hidden="true"></i>System Prompt</label>
              <div class="textarea-action-btns">
                <button class="textarea-action-btn" title="Copy to clipboard" data-action="copy"><i class="bi bi-clipboard" aria-hidden="true"></i></button>
                <button class="textarea-action-btn" title="Reuse as system prompt" data-action="reuse" data-target="systemPrompt"><i class="bi bi-arrow-return-left" aria-hidden="true"></i></button>
              </div>
            </div>
            <textarea class="form-control history-preview-textarea" rows="4" readonly>${escapeHtml(item.systemPrompt || '')}</textarea>
          </div>
        </div>
        <div class="history-context-card usage-card d-flex align-items-center justify-content-between gap-2 mt-2">
          <h4 class="usage-card-title mb-0">Context</h4>
          <div class="usage-inline-badges d-flex align-items-center gap-2">
            <span class="badge response-token-badge">Messages included: <strong class="ms-1">${item.contextMessagesCount ?? item.contextPairsCount ?? 0}</strong></span>
            <span class="badge response-time-badge">Window set: <strong class="ms-1">${item.contextWindowMessages ?? 0}</strong></span>
          </div>
        </div>
        <div class="history-chars-row usage-card d-flex align-items-center justify-content-between gap-2 mt-2">
          <h4 class="usage-card-title mb-0">Characters</h4>
          <div class="usage-inline-badges d-flex align-items-center gap-2">
            <span class="badge response-token-badge">System: <strong class="ms-1">${getSystemPromptChars(item)}</strong></span>
            <span class="badge response-cost-badge">Context: <strong class="ms-1">${getContextChars(item)}</strong></span>
            <span class="badge response-cost-badge">Message: <strong class="ms-1">${item.messageChars ?? countChars(item.message || '')}</strong></span>
            <span class="badge response-token-badge">Input: <strong class="ms-1">${item.rawJsonChars ?? JSON.stringify(item.llmMessages || [], null, 2).length}</strong></span>
            <span class="badge response-time-badge">Output: <strong class="ms-1">${item.outputChars ?? countChars(item.answer || '')}</strong></span>
          </div>
        </div>
        <div class="history-time-card usage-card d-flex align-items-center justify-content-between gap-2 mt-2">
          <h4 class="usage-card-title mb-0">Time</h4>
          <div class="usage-inline-badges d-flex align-items-center gap-2">
            <span class="badge response-time-badge"><i class="bi bi-box-arrow-in-right me-1" aria-hidden="true"></i>Requested: <strong class="ms-1">${formatHistoryDate(item.requested_at)}</strong></span>
            <span class="badge response-time-badge"><i class="bi bi-box-arrow-right me-1" aria-hidden="true"></i>Responded: <strong class="ms-1">${formatHistoryDate(item.responded_at)}</strong></span>
            <span class="badge response-time-badge">Response time: <strong class="ms-1">${formatResponseTimeMs(item.responseTimeMs)}</strong></span>
          </div>
        </div>
        <div class="usage-grid usage-grid-compact history-usage-grid mt-2">
          <article class="usage-card">
            <h4 class="usage-card-title">Input</h4>
            <div class="d-flex align-items-center justify-content-between gap-2">
              <div class="d-flex flex-wrap gap-2">
                <span class="badge response-token-badge">Tokens: <strong class="ms-1">${item.usage?.input_tokens ?? 0}</strong></span>
                <span class="badge response-cost-badge">Cost: <strong class="ms-1">$${formatUsd(item.cost?.input_cost_usd ?? 0)}</strong></span>
              </div>
            </div>
            ${(item.usage?.input_cached_tokens ?? 0) > 0 ? `
            <div class="d-flex align-items-center justify-content-between gap-2 mt-1 ps-2 border-start border-secondary-subtle">
              <span class="usage-card-subtitle text-body-secondary">Non-cached</span>
              <div class="d-flex flex-wrap gap-2">
                <span class="badge response-token-badge">Tokens: <strong class="ms-1">${item.usage.input_non_cached_tokens ?? 0}</strong></span>
                <span class="badge response-cost-badge">Cost: <strong class="ms-1">$${formatUsd(item.cost?.input_non_cached_cost_usd ?? 0)}</strong></span>
              </div>
            </div>
            <div class="d-flex align-items-center justify-content-between gap-2 mt-1 ps-2 border-start border-secondary-subtle">
              <span class="usage-card-subtitle text-body-secondary">Cached</span>
              <div class="d-flex flex-wrap gap-2">
                <span class="badge response-token-badge">Tokens: <strong class="ms-1">${item.usage.input_cached_tokens}</strong></span>
                <span class="badge response-cost-badge">Cost: <strong class="ms-1">$${formatUsd(item.cost?.input_cached_cost_usd ?? 0)}</strong></span>
              </div>
            </div>` : ''}
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
      </article>
      </div>`;
      }
    )
    .join('');
}

function updateHistoryActionButtons() {
  const hasHistory = state.history.length > 0;
  el.exportBtn.disabled = !hasHistory;
  el.clearBtn.disabled = !hasHistory;
  el.headerExportBtn.disabled = !hasHistory;
  el.headerClearBtn.disabled = !hasHistory;
  updateSelectAllCheckbox();
}

function updateSelectAllCheckbox() {
  const total = state.history.length;
  const selected = state.compareSelection.size;
  el.historySelectAll.disabled = total === 0;
  if (selected === 0) {
    el.historySelectAll.checked = false;
    el.historySelectAll.indeterminate = false;
  } else if (selected >= total) {
    el.historySelectAll.checked = true;
    el.historySelectAll.indeterminate = false;
  } else {
    el.historySelectAll.checked = false;
    el.historySelectAll.indeterminate = true;
  }
}

function onHistorySelectAll() {
  if (el.historySelectAll.checked) {
    state.history.forEach((item) => state.compareSelection.add(item.id));
  } else {
    state.compareSelection.clear();
  }
  updateCompareBtn();
  renderHistory();
}

function loadHistory() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function loadUiPrefs() {
  try {
    const raw = JSON.parse(localStorage.getItem(UI_PREFS_KEY) || '{}');
    return raw && typeof raw === 'object' ? raw : {};
  } catch {
    return {};
  }
}

function persistUiPrefs() {
  localStorage.setItem(UI_PREFS_KEY, JSON.stringify(state.uiPrefs || {}));
}

function loadSnapshotsList() {
  try {
    return JSON.parse(localStorage.getItem(SNAPSHOTS_LIST_KEY)) || [];
  } catch {
    return [];
  }
}

function snapshotTimestamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function saveSnapshotToList(id, url, count) {
  const list = loadSnapshotsList();
  const now = new Date();
  list.unshift({ id, url, createdAt: now.toISOString(), count, name: `Snapshot ${snapshotTimestamp(now)}` });
  localStorage.setItem(SNAPSHOTS_LIST_KEY, JSON.stringify(list));
}

function applyUiPreferences() {
  if (typeof state.uiPrefs?.keepMessageAfterSend === 'boolean') {
    el.keepMessageAfterSend.checked = state.uiPrefs.keepMessageAfterSend;
  }
  if (typeof state.uiPrefs?.includeConversationHistory === 'boolean') {
    el.includeConversationHistory.checked = state.uiPrefs.includeConversationHistory;
  }
  const initialHistoryLimit = normalizeHistoryMessageLimit(state.uiPrefs?.historyMessageLimit);
  el.historyMessageLimit.value = String(initialHistoryLimit);
  state.uiPrefs.historyMessageLimit = initialHistoryLimit;
}

function onKeepMessageAfterSendChange() {
  state.uiPrefs.keepMessageAfterSend = Boolean(el.keepMessageAfterSend?.checked);
  persistUiPrefs();
}

function toggleHistoryView() {
  state.uiPrefs.historyCompact = !(state.uiPrefs.historyCompact !== false);
  persistUiPrefs();
  applyHistoryView();
}

function applyHistoryView() {
  const compact = state.uiPrefs.historyCompact !== false;
  el.history.classList.toggle('history-compact', compact);
  const icon = el.historyViewToggleBtn.querySelector('i');
  if (compact) {
    icon.className = 'bi bi-card-list';
    el.historyViewToggleBtn.title = 'Switch to detailed view';
  } else {
    icon.className = 'bi bi-list-ul';
    el.historyViewToggleBtn.title = 'Switch to compact view';
  }
}

function buildHistoryContext() {
  if (!el.includeConversationHistory?.checked) {
    return { messages: [], contextMessagesCount: 0, contextWindowMessages: 0 };
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

  return { messages, contextMessagesCount: latestPairs.length, contextWindowMessages: pairCount };
}

function persistHistory() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.history));
}

function clearHistory() {
  state.history = [];
  state.compareSelection.clear();
  persistHistory();
  state.snapshotSaved = false;
  updateSaveBtn();
  renderHistory();
  updateCompareBtn();
  setStatus('History cleared.', 'success');
}

function openDeleteSelectedConfirmModal() {
  const count = state.compareSelection.size;
  openConfirmModal({
    type: 'deleteSelected',
    title: 'Remove selected',
    message: `Do you want to delete ${count} selected history entr${count === 1 ? 'y' : 'ies'}?`,
    actionLabel: 'Remove',
  });
}

function confirmDeleteSelectedEntries() {
  state.history = state.history.filter((item) => !state.compareSelection.has(item.id));
  state.compareSelection.clear();
  persistHistory();
  state.snapshotSaved = false;
  updateSaveBtn();
  renderHistory();
  updateCompareBtn();
  closeConfirmModal();
  setStatus('Selected entries deleted.', 'success');
}

function openClearConfirmModal() {
  state.pendingDeleteEntryId = null;
  openConfirmModal({
    type: 'clearHistory',
    title: 'Clear history',
    message: 'Do you want to clear all history entries?',
    actionLabel: 'Clear history',
  });
}

function onHistoryClick(event) {
  const textareaActionBtn = event.target.closest('.textarea-action-btn');
  if (textareaActionBtn) {
    const field = textareaActionBtn.closest('.history-preview-field');
    const textarea = field?.querySelector('textarea');
    if (!textarea) return;
    const action = textareaActionBtn.dataset.action;
    if (action === 'copy') {
      navigator.clipboard.writeText(textarea.value).then(() => {
        const icon = textareaActionBtn.querySelector('i');
        icon.className = 'bi bi-clipboard-check';
        textareaActionBtn.classList.add('copied');
        setTimeout(() => {
          icon.className = 'bi bi-clipboard';
          textareaActionBtn.classList.remove('copied');
        }, 1500);
      });
    } else if (action === 'reuse') {
      const target = document.getElementById(textareaActionBtn.dataset.target);
      if (target) {
        target.value = textarea.value;
        target.dispatchEvent(new Event('input'));
      }
    }
    return;
  }

  const checkbox = event.target.closest('.history-compare-cb');
  if (checkbox) {
    const entryId = checkbox.dataset.entryId;
    if (checkbox.checked) {
      state.compareSelection.add(entryId);
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
    setStatus('Could not find selected history entry.', 'error');
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
    setStatus('History entry loaded into form.', 'success');
  }
}

function buildCsvContent(items) {
  const header = [
    'id',
    'createdAt',
    'requested_at',
    'responded_at',
    'provider',
    'model',
    'deployment',
    'inputTokens',
    'inputCachedTokens',
    'inputNonCachedTokens',
    'outputTokens',
    'totalTokens',
    'inputCostUsd',
    'inputNonCachedCostUsd',
    'inputCachedCostUsd',
    'outputCostUsd',
    'totalCostUsd',
    'responseTimeMs',
    'contextMessagesCount',
    'contextWindowMessages',
    'systemPromptChars',
    'contextChars',
    'messageChars',
    'outputChars',
    'systemPrompt',
    'message',
    'answer',
  ];

  const rows = items.map((item) => [
    item.id,
    item.createdAt,
    item.requested_at,
    item.responded_at,
    item.provider,
    item.model,
    item.deployment,
    item.usage?.input_tokens ?? '',
    item.usage?.input_cached_tokens ?? '',
    item.usage?.input_non_cached_tokens ?? '',
    item.usage?.output_tokens ?? '',
    item.usage?.total_tokens ?? '',
    item.cost?.input_cost_usd ?? '',
    item.cost?.input_non_cached_cost_usd ?? '',
    item.cost?.input_cached_cost_usd ?? '',
    item.cost?.output_cost_usd ?? '',
    item.cost?.total_cost_usd ?? '',
    item.responseTimeMs ?? '',
    item.contextMessagesCount ?? item.contextPairsCount ?? '',
    item.contextWindowMessages ?? '',
    item.systemPromptChars ?? countChars(item.systemPrompt || ''),
    getContextChars(item),
    item.messageChars ?? '',
    item.outputChars ?? '',
    item.systemPrompt,
    item.message,
    item.answer,
  ]);

  return [header, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n');
}

function downloadCsv(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function makeCsvStamp() {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
}

function exportCsv() {
  if (!state.history.length) {
    setStatus('No data to export.', 'warning');
    return;
  }
  downloadCsv(buildCsvContent(state.history), `aibench-report-${makeCsvStamp()}.csv`);
  setStatus('CSV downloaded.', 'success');
}

function exportSelectedCsv() {
  const items = state.history.filter((item) => state.compareSelection.has(item.id));
  if (!items.length) {
    setStatus('No selected entries to export.', 'warning');
    return;
  }
  downloadCsv(buildCsvContent(items), `aibench-report-selected-${makeCsvStamp()}.csv`);
  setStatus('CSV downloaded.', 'success');
}

function toggleBusy(isBusy) {
  el.sendBtn.disabled = isBusy;
  el.exportBtn.disabled = isBusy;
  el.headerExportBtn.disabled = isBusy || !state.history.length;
  el.headerClearBtn.disabled = isBusy || !state.history.length;
  el.headerSettingsBtn.disabled = isBusy;
}

function setResponseLoading(isLoading) {
  el.responseLoader.classList.toggle('hidden', !isLoading);
  el.responseContent.classList.toggle('hidden', isLoading);
}

function setResponseHasData(hasData) {
  state.hasResponseData = Boolean(hasData);
  el.responseContent.classList.toggle('response-empty', !state.hasResponseData);
}

function setStatus(text, type = 'info') {
  if (!text) {
    el.status.textContent = '';
    el.status.className = 'status';
    return;
  }
  const alertClass = {
    success: 'alert-success',
    error: 'alert-danger',
    warning: 'alert-warning',
    info: 'alert-info',
  }[type] || 'alert-info';
  el.status.textContent = text;
  el.status.className = `status alert ${alertClass} mt-3`;
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
  if (event.key === 'Escape' && !el.settingsModal.classList.contains('hidden')) {
    closeSettingsModal();
    return;
  }
  if (event.key === 'Escape' && !el.compareModal.classList.contains('hidden')) {
    closeCompareModal();
    return;
  }
  if (event.key === 'Escape' && !el.historyDetailsModal.classList.contains('hidden')) {
    closeHistoryDetailsModal();
    return;
  }
  if (event.key === 'Escape' && !el.historyConfirmModal.classList.contains('hidden')) {
    closeConfirmModal();
    return;
  }
  if (event.key === 'Escape' && !el.snapshotsListModal.classList.contains('hidden')) {
    closeSnapshotsListModal();
  }
}

function openHistoryDetailsModal(entry) {
  el.historyDetailsId.textContent = entry.id || '-';
  el.historyDetailsCreatedAt.textContent = entry.createdAt || '-';
  el.historyDetailsRequestedAt.textContent = formatHistoryDate(entry.requested_at);
  el.historyDetailsRespondedAt.textContent = formatHistoryDate(entry.responded_at);
  el.historyDetailsProvider.textContent = entry.provider || '-';
  el.historyDetailsModel.textContent = entry.model || '-';
  el.historyDetailsDeployment.textContent = entry.deployment || '-';
  el.historyDetailsResponseTime.textContent = formatResponseTimeMs(entry.responseTimeMs);
  el.historyDetailsContextMessages.textContent = String(entry.contextMessagesCount ?? entry.contextPairsCount ?? 0);
  el.historyDetailsContextWindow.textContent = String(entry.contextWindowMessages ?? 0);
  el.historyDetailsSystemPromptChars.textContent = String(getSystemPromptChars(entry));
  el.historyDetailsContextChars.textContent = String(getContextChars(entry));
  el.historyDetailsMessageChars.textContent = String(entry.messageChars ?? countChars(entry.message || ''));
  el.historyDetailsOutputChars.textContent = String(entry.outputChars ?? countChars(entry.answer || ''));
  el.historyDetailsRawJsonChars.textContent = String(entry.rawJsonChars ?? JSON.stringify(entry.llmMessages || [], null, 2).length);
  el.historyDetailsInputTokens.textContent = String(entry.usage?.input_tokens ?? 0);
  el.historyDetailsOutputTokens.textContent = String(entry.usage?.output_tokens ?? 0);
  el.historyDetailsTotalTokens.textContent = String(entry.usage?.total_tokens ?? 0);
  const detailsCachedTokens = entry.usage?.input_cached_tokens ?? 0;
  el.historyDetailsInputCachedTokens.textContent = String(detailsCachedTokens);
  el.historyDetailsInputCachedCost.textContent = `$${formatUsd(entry.cost?.input_cached_cost_usd ?? 0)}`;
  el.historyDetailsInputNonCachedTokens.textContent = String(entry.usage?.input_non_cached_tokens ?? 0);
  el.historyDetailsInputNonCachedCost.textContent = `$${formatUsd(entry.cost?.input_non_cached_cost_usd ?? 0)}`;
  el.historyDetailsInputCacheBreakdown.style.display = detailsCachedTokens > 0 ? '' : 'none';
  el.historyDetailsInputCost.textContent = `$${formatUsd(entry.cost?.input_cost_usd ?? 0)}`;
  el.historyDetailsOutputCost.textContent = `$${formatUsd(entry.cost?.output_cost_usd ?? 0)}`;
  el.historyDetailsTotalCost.textContent = `$${formatUsd(entry.cost?.total_cost_usd ?? 0)}`;
  el.historyDetailsSystemPrompt.value = entry.systemPrompt || '';
  el.historyDetailsMessage.value = entry.message || '';
  el.historyDetailsLlmMessages.value = JSON.stringify(entry.llmMessages || [], null, 2);
  el.historyDetailsLlmResponse.value = JSON.stringify(entry.llmResponse || {}, null, 2);
  el.historyDetailsAnswer.value = entry.answer || '';

  const inputTokens = entry.usage?.input_tokens ?? 0;
  const outputTokens = entry.usage?.output_tokens ?? 0;
  if (historyTokenPieChart) {
    historyTokenPieChart.destroy();
    historyTokenPieChart = null;
  }
  const doughnutPctLabels = {
    id: 'doughnutPctLabels',
    afterDatasetDraw(chart) {
      const { ctx, data } = chart;
      const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
      if (!total) return;
      chart.getDatasetMeta(0).data.forEach((arc, i) => {
        const value = data.datasets[0].data[i];
        const pct = Math.round((value / total) * 100);
        if (pct < 5) return;
        const mid = arc.startAngle + (arc.endAngle - arc.startAngle) / 2;
        const r = (arc.innerRadius + arc.outerRadius) / 2;
        const x = arc.x + Math.cos(mid) * r;
        const y = arc.y + Math.sin(mid) * r;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(`${pct}%`, x, y);
        ctx.restore();
      });
    },
  };

  historyTokenPieChart = new Chart(el.historyDetailsTokenChart, {
    type: 'doughnut',
    plugins: [doughnutPctLabels],
    data: {
      labels: ['Input', 'Output'],
      datasets: [{
        data: [inputTokens, outputTokens],
        backgroundColor: ['#2563eb', '#16a34a'],
        borderWidth: 0,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { position: 'bottom', labels: { font: CHART_FONT, boxWidth: 12 }, onClick: () => {} },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct = total > 0 ? Math.round((ctx.parsed / total) * 100) : 0;
              return ` ${ctx.label}: ${ctx.parsed.toLocaleString()} tokens (${pct}%)`;
            },
          },
        },
      },
    },
  });

  setHistoryTab('stats');
  el.historyDetailsModal.classList.remove('hidden');
}

function closeHistoryDetailsModal() {
  el.historyDetailsModal.classList.add('hidden');
}

function onConfirmModalClick(event) {
  const closeTarget = event.target.closest('[data-close-confirm-modal="true"]');
  if (closeTarget) {
    closeConfirmModal();
  }
}

function openDeleteConfirmModal(entryId) {
  state.pendingDeleteEntryId = entryId;
  openConfirmModal({
    type: 'deleteEntry',
    title: 'Delete history entry',
    message: 'Do you want to delete this history entry?',
    actionLabel: 'Delete',
  });
}

function openConfirmModal({ type, title, message, actionLabel }) {
  state.pendingConfirmAction = type;
  el.historyConfirmTitle.textContent = title;
  el.historyConfirmMessage.textContent = message;
  el.historyConfirmActionBtn.textContent = actionLabel;
  el.historyConfirmModal.classList.remove('hidden');
}

function closeConfirmModal() {
  state.pendingDeleteEntryId = null;
  state.pendingConfirmAction = null;
  el.historyConfirmModal.classList.add('hidden');
}

function confirmModalAction() {
  if (state.pendingConfirmAction === 'deleteEntry') {
    confirmDeleteHistoryEntry();
    return;
  }
  if (state.pendingConfirmAction === 'deleteSelected') {
    confirmDeleteSelectedEntries();
    return;
  }
  if (state.pendingConfirmAction === 'clearHistory') {
    closeConfirmModal();
    clearHistory();
    return;
  }
  closeConfirmModal();
}

function confirmDeleteHistoryEntry() {
  if (!state.pendingDeleteEntryId) {
    closeConfirmModal();
    return;
  }
  state.compareSelection.delete(state.pendingDeleteEntryId);
  state.history = state.history.filter((item) => item.id !== state.pendingDeleteEntryId);
  persistHistory();
  state.snapshotSaved = false;
  updateSaveBtn();
  renderHistory();
  updateCompareBtn();
  closeConfirmModal();
  setStatus('History entry deleted.', 'success');
}

function onMainTabClick(event) {
  const tabName = event.currentTarget?.dataset?.mainTab;
  if (!tabName) {
    return;
  }
  setMainTab(tabName);
}

function setMainTab(tabName, options = {}) {
  const { updateUrl = true } = options;
  const normalizedTab = normalizeMainTab(tabName);
  el.mainTabButtons.forEach((button) => {
    const isActive = button.dataset.mainTab === normalizedTab;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-selected', String(isActive));
  });

  el.mainTabPanels.forEach((panel) => {
    const isActive = panel.dataset.mainPanel === normalizedTab;
    panel.classList.toggle('hidden', !isActive);
  });

  if (normalizedTab === 'charts') {
    renderChart();
  }
  if (normalizedTab === 'chat') {
    renderChatView();
  }
  if (updateUrl) {
    updateMainTabInUrl(normalizedTab);
  }
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
  el.compareBtn.disabled = count < 2;
  const label = count > MAX_COMPARE ? `${count} → ${MAX_COMPARE}` : String(count);
  el.compareBtn.innerHTML = `<i class="bi bi-bar-chart-line-fill me-2" aria-hidden="true"></i>Compare (${label})`;
  el.deleteSelectedBtn.disabled = count === 0;
  el.exportSelectedBtn.disabled = count === 0;
  updateSelectAllCheckbox();
}

function getCompareMetrics() {
  return [
    { label: 'Run ID', fn: (e) => e.id },
    { label: 'Date', fn: (e) => formatHistoryDate(e.createdAt) },
    { label: 'Requested At', fn: (e) => formatHistoryDate(e.requested_at) },
    { label: 'Responded At', fn: (e) => formatHistoryDate(e.responded_at) },
    { label: 'Provider', fn: (e) => e.provider || '-' },
    { label: 'Model / Deployment', fn: (e) => e.deployment || e.model || '-' },
    { label: 'Response Time', fn: (e) => formatResponseTimeMs(e.responseTimeMs) },
    { label: 'Context Messages', fn: (e) => String(e.contextMessagesCount ?? e.contextPairsCount ?? 0) },
    { label: 'Context Window Set', fn: (e) => String(e.contextWindowMessages ?? 0) },
    { label: 'System Prompt Chars', fn: (e) => String(getSystemPromptChars(e)) },
    { label: 'Context Chars', fn: (e) => String(getContextChars(e)) },
    { label: 'Message Chars', fn: (e) => String(e.messageChars ?? countChars(e.message || '')) },
    { label: 'Output Chars', fn: (e) => String(e.outputChars ?? countChars(e.answer || '')) },
    { label: 'Input Tokens', fn: (e) => String(e.usage?.input_tokens ?? 0) },
    { label: 'Input Cached Tokens', fn: (e) => String(e.usage?.input_cached_tokens ?? 0) },
    { label: 'Input Non-cached Tokens', fn: (e) => String(e.usage?.input_non_cached_tokens ?? 0) },
    { label: 'Output Tokens', fn: (e) => String(e.usage?.output_tokens ?? 0) },
    { label: 'Total Tokens', fn: (e) => String(e.usage?.total_tokens ?? 0) },
    { label: 'Input Cost (USD)', fn: (e) => `$${formatUsd(e.cost?.input_cost_usd ?? 0)}` },
    { label: 'Input Non-cached Cost (USD)', fn: (e) => `$${formatUsd(e.cost?.input_non_cached_cost_usd ?? 0)}` },
    { label: 'Input Cached Cost (USD)', fn: (e) => `$${formatUsd(e.cost?.input_cached_cost_usd ?? 0)}` },
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
    .filter(Boolean)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, MAX_COMPARE);

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

// ─── Chat View ─────────────────────────────────────────────────────────────

function renderChatView() {
  const body = el.chatViewBody;
  body.innerHTML = '';

  const sorted = [...state.history].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  if (!sorted.length) {
    body.innerHTML = '<p class="text-body-secondary text-center py-5 mb-0">No messages yet.</p>';
    return;
  }

  for (const entry of sorted) {
    // User bubble
    const userRow = document.createElement('div');
    userRow.className = 'chat-bubble-row user';
    userRow.innerHTML = `
      <div class="chat-avatar">You</div>
      <div class="chat-bubble-body">
        <div class="chat-bubble">
          <div class="chat-bubble-content">${escapeHtml(entry.message)}</div>
          <div class="chat-bubble-time"><i class="bi bi-clock" aria-hidden="true"></i>${escapeHtml(formatHistoryDate(entry.requested_at))}</div>
        </div>
      </div>`;
    body.appendChild(userRow);

    // Assistant bubble
    const provider = String(entry.provider || '').trim();
    const providerLabel = state.config?.providers?.[provider]?.label || provider;
    const model = entry.deployment || entry.model || '';
    const inputCachedTokens = Number(entry.usage?.input_cached_tokens ?? 0);
    const inputTokens = Number(entry.usage?.input_tokens ?? 0);
    const inputNonCachedTokens = Number(
      entry.usage?.input_non_cached_tokens ?? Math.max(0, inputTokens - inputCachedTokens),
    );
    const outputTokens = Number(entry.usage?.output_tokens ?? 0);
    const totalTokens = Number(entry.usage?.total_tokens ?? inputTokens + outputTokens);
    const usageText = `in ${inputNonCachedTokens}/${inputCachedTokens} out ${outputTokens} total ${inputTokens}/${totalTokens}`;
    const time = entry.responseTimeMs != null ? formatResponseTimeMs(entry.responseTimeMs) : '';
    const chipParts = [];
    if (providerLabel) {
      chipParts.push(`<span class="chat-chip"><i class="bi bi-hdd-network" aria-hidden="true"></i>${escapeHtml(providerLabel)}</span>`);
    }
    if (model) {
      chipParts.push(`<span class="chat-chip"><i class="bi bi-cpu" aria-hidden="true"></i>${escapeHtml(model)}</span>`);
    }
    if (time) {
      chipParts.push(`<span class="chat-chip chat-chip-time"><i class="bi bi-stopwatch" aria-hidden="true"></i>${escapeHtml(time)}</span>`);
    }
    const chipsHtml = chipParts.join('');
    const metaParts = [
      `<span class="chat-usage-inline"><i class="bi bi-bar-chart-line" aria-hidden="true"></i><span>Usage: ${escapeHtml(usageText)}</span></span>`,
    ];

    const metaHtml = metaParts.join('<span class="chat-bubble-meta-dot">·</span>');
    const aiRow = document.createElement('div');
    aiRow.className = 'chat-bubble-row assistant';
    aiRow.innerHTML = `
      <div class="chat-avatar">AI</div>
      <div class="chat-bubble-body">
        <div class="chat-bubble">
          ${chipsHtml ? `<div class="chat-bubble-chips">${chipsHtml}</div>` : ''}
          <div class="chat-bubble-content">${escapeHtml(entry.answer)}</div>
          <div class="chat-bubble-time"><i class="bi bi-clock" aria-hidden="true"></i>${escapeHtml(formatHistoryDate(entry.responded_at))}</div>
        </div>
        <div class="chat-bubble-meta">
          ${metaHtml}
          ${metaHtml ? '<span class="chat-bubble-meta-dot">|</span>' : ''}
          <button class="chat-info-btn" data-entry-id="${escapeHtml(entry.id)}" type="button" aria-label="Details" title="Request details">
            <i class="bi bi-info-circle" aria-hidden="true"></i>
          </button>
        </div>
      </div>`;
    body.appendChild(aiRow);
  }

  body.scrollTop = body.scrollHeight;
}

// ─── Charts ────────────────────────────────────────────────────────────────

function renderChart() {
  const sorted = [...state.history].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  if (!sorted.length) {
    el.chartsEmpty.classList.remove('hidden');
    el.chartsWrap.classList.add('hidden');
    return;
  }

  el.chartsEmpty.classList.add('hidden');
  el.chartsWrap.classList.remove('hidden');

  if (state.chartInstance)  { state.chartInstance.destroy();  state.chartInstance  = null; }
  if (state.chartInstance2) { state.chartInstance2.destroy(); state.chartInstance2 = null; }
  if (state.chartInstance3) { state.chartInstance3.destroy(); state.chartInstance3 = null; }
  if (state.chartInstance4) { state.chartInstance4.destroy(); state.chartInstance4 = null; }

  const builders = {
    cumulativeUsage:       buildCumulativeUsageCharts,
    tokensVsResponseTime:  buildTokensVsResponseTimeCharts,
  };

  const result = builders[el.chartSelect.value]?.(sorted) ?? null;
  if (Array.isArray(result)) {
    [state.chartInstance, state.chartInstance2, state.chartInstance3, state.chartInstance4] = result;
    el.chartsWrap2.classList.toggle('hidden', result.length < 2);
    el.chartsWrap3.classList.toggle('hidden', result.length < 3);
    el.chartsWrap4.classList.toggle('hidden', result.length < 4);
  } else {
    state.chartInstance = result;
    el.chartsWrap2.classList.add('hidden');
    el.chartsWrap3.classList.add('hidden');
    el.chartsWrap4.classList.add('hidden');
  }
}

function chartShortDate(iso) {
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

let historyTokenPieChart = null;

const CHART_GRID = { color: 'rgba(0,0,0,0.05)' };
const CHART_FONT = { size: 11 };

const CROSSHAIR_PLUGIN = {
  id: 'crosshair',
  afterDraw(chart) {
    if (!chart.tooltip?._active?.length) return;
    const { ctx, chartArea: { top, bottom } } = chart;
    const x = chart.tooltip._active[0].element.x;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(0,0,0,0.22)';
    ctx.setLineDash([5, 4]);
    ctx.stroke();
    ctx.restore();
  },
};

function syncChartHover(source, targets) {
  const all = Array.isArray(targets) ? targets : [targets];
  source.canvas.addEventListener('mousemove', (e) => {
    const elements = source.getElementsAtEventForMode(e, 'index', { intersect: false }, false);
    if (!elements.length) return;
    const { index } = elements[0];
    for (const target of all) {
      const activeEls = target.data.datasets.map((_, i) => ({ datasetIndex: i, index }));
      target.tooltip.setActiveElements(activeEls, { x: 0, y: 0 });
      target.setActiveElements(activeEls);
      target.update('none');
    }
  });
  source.canvas.addEventListener('mouseleave', () => {
    for (const target of all) {
      target.tooltip.setActiveElements([], { x: 0, y: 0 });
      target.setActiveElements([]);
      target.update('none');
    }
  });
}

function makeChartClickHandlers(sorted) {
  return {
    onClick: (_event, elements) => {
      if (!elements.length) return;
      const entry = sorted[elements[0].index];
      if (entry) openHistoryDetailsModal(entry);
    },
    onHover: (event, elements) => {
      const canvas = event.native?.target;
      if (canvas) canvas.style.cursor = elements.length ? 'pointer' : 'default';
    },
  };
}

function buildTokensVsResponseTimeCharts(sorted) {
  const labels = sorted.map((_, i) => `#${i + 1}`);
  el.chartLabel.textContent  = 'Tokens';
  el.chartLabel2.textContent = 'Response Time';
  el.chartLabel3.textContent = 'Cost';
  el.chartLabel4.textContent = 'Characters';

  const tokensChart = new Chart(el.mainChart, {
    type: 'line',
    plugins: [CROSSHAIR_PLUGIN],
    data: {
      labels,
      datasets: [
        {
          label: 'Total tokens',
          data: sorted.map((item) => item.usage?.total_tokens ?? 0),
          borderColor: '#dc2626',
          backgroundColor: 'transparent',
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: false,
        },
        {
          label: 'Input tokens',
          data: sorted.map((item) => item.usage?.input_tokens ?? 0),
          borderColor: '#16a34a',
          backgroundColor: 'transparent',
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: false,
        },
        {
          label: 'Output tokens',
          data: sorted.map((item) => item.usage?.output_tokens ?? 0),
          borderColor: '#2563eb',
          backgroundColor: 'transparent',
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: false,
        },
      ],
    },
    options: {
      ...makeChartClickHandlers(sorted),
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'top', labels: { boxWidth: 12, padding: 14, font: CHART_FONT } },
      },
      scales: {
        x: { grid: CHART_GRID, ticks: { font: CHART_FONT, maxTicksLimit: 20 } },
        y: { grid: CHART_GRID, beginAtZero: true, ticks: { font: CHART_FONT }, afterFit: (s) => { s.width = 88; } },
      },
    },
  });

  const timeChart = new Chart(el.mainChart2, {
    type: 'line',
    plugins: [CROSSHAIR_PLUGIN],
    data: {
      labels,
      datasets: [{
        label: 'Response time',
        data: sorted.map((item) => item.responseTimeMs ?? 0),
        borderColor: '#ea580c',
        backgroundColor: 'transparent',
        tension: 0.3,
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: false,
      }],
    },
    options: {
      ...makeChartClickHandlers(sorted),
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => `${ctx.raw} ms` } },
      },
      scales: {
        x: { grid: CHART_GRID, ticks: { font: CHART_FONT, maxTicksLimit: 20 } },
        y: { grid: CHART_GRID, beginAtZero: true, ticks: { font: CHART_FONT, callback: (v) => `${v} ms` }, afterFit: (s) => { s.width = 88; } },
      },
    },
  });

  syncChartHover(tokensChart, timeChart);
  const costChart = new Chart(el.mainChart3, {
    type: 'line',
    plugins: [CROSSHAIR_PLUGIN],
    data: {
      labels,
      datasets: [
        {
          label: 'Total cost',
          data: sorted.map((item) => item.cost?.total_cost_usd ?? 0),
          borderColor: '#dc2626',
          backgroundColor: 'transparent',
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: false,
        },
        {
          label: 'Input cost',
          data: sorted.map((item) => item.cost?.input_cost_usd ?? 0),
          borderColor: '#16a34a',
          backgroundColor: 'transparent',
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: false,
        },
        {
          label: 'Output cost',
          data: sorted.map((item) => item.cost?.output_cost_usd ?? 0),
          borderColor: '#2563eb',
          backgroundColor: 'transparent',
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: false,
        },
      ],
    },
    options: {
      ...makeChartClickHandlers(sorted),
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'top', labels: { boxWidth: 12, padding: 14, font: CHART_FONT } },
        tooltip: { callbacks: { label: (ctx) => `$${Number(ctx.raw).toFixed(8)}` } },
      },
      scales: {
        x: { grid: CHART_GRID, ticks: { font: CHART_FONT, maxTicksLimit: 20 } },
        y: { grid: CHART_GRID, beginAtZero: true, ticks: { font: CHART_FONT, callback: (v) => `$${Number(v).toFixed(6)}` }, afterFit: (s) => { s.width = 88; } },
      },
    },
  });

  const charsChart = new Chart(el.mainChart4, {
    type: 'line',
    plugins: [CROSSHAIR_PLUGIN],
    data: {
      labels,
      datasets: [
        {
          label: 'System Prompt',
          data: sorted.map((item) => item.systemPromptChars ?? countChars(item.systemPrompt || '')),
          borderColor: '#7c3aed',
          backgroundColor: 'transparent',
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: false,
        },
        {
          label: 'Context',
          data: sorted.map((item) => getContextChars(item)),
          borderColor: '#0891b2',
          backgroundColor: 'transparent',
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: false,
        },
        {
          label: 'Message',
          data: sorted.map((item) => item.messageChars ?? countChars(item.message || '')),
          borderColor: '#16a34a',
          backgroundColor: 'transparent',
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: false,
        },
        {
          label: 'Input JSON',
          data: sorted.map((item) => item.rawJsonChars ?? JSON.stringify(item.llmMessages || [], null, 2).length),
          borderColor: '#2563eb',
          backgroundColor: 'transparent',
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: false,
        },
        {
          label: 'Output',
          data: sorted.map((item) => item.outputChars ?? countChars(item.answer || '')),
          borderColor: '#dc2626',
          backgroundColor: 'transparent',
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: false,
        },
      ],
    },
    options: {
      ...makeChartClickHandlers(sorted),
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'top', labels: { boxWidth: 12, padding: 14, font: CHART_FONT } },
      },
      scales: {
        x: { grid: CHART_GRID, ticks: { font: CHART_FONT, maxTicksLimit: 20 } },
        y: { grid: CHART_GRID, beginAtZero: true, ticks: { font: CHART_FONT }, afterFit: (s) => { s.width = 88; } },
      },
    },
  });

  syncChartHover(tokensChart, [timeChart, costChart, charsChart]);
  syncChartHover(timeChart,   [tokensChart, costChart, charsChart]);
  syncChartHover(costChart,   [tokensChart, timeChart, charsChart]);
  syncChartHover(charsChart,  [tokensChart, timeChart, costChart]);

  return [tokensChart, timeChart, costChart, charsChart];
}

function buildCumulativeUsageCharts(sorted) {
  el.chartLabel.textContent = 'Cumulative Token Usage';
  let cumInput = 0, cumOutput = 0, cumTotal = 0;
  const tokenInputData  = sorted.map((item) => { cumInput  += item.usage?.input_tokens  ?? 0; return cumInput; });
  const tokenOutputData = sorted.map((item) => { cumOutput += item.usage?.output_tokens ?? 0; return cumOutput; });
  const tokenTotalData  = sorted.map((item) => { cumTotal  += item.usage?.total_tokens  ?? 0; return cumTotal; });
  const labels = sorted.map((_, i) => `#${i + 1}`);

  const tokensChart = new Chart(el.mainChart, {
    type: 'line',
    plugins: [CROSSHAIR_PLUGIN],
    data: {
      labels,
      datasets: [
        { label: 'Total tokens',  data: tokenTotalData,  borderColor: '#dc2626', backgroundColor: 'rgba(220,38,38,0.08)',  tension: 0.1, fill: true, pointRadius: 3, pointHoverRadius: 5 },
        { label: 'Input tokens',  data: tokenInputData,  borderColor: '#16a34a', backgroundColor: 'rgba(22,163,74,0.08)',  tension: 0.1, fill: true, pointRadius: 3, pointHoverRadius: 5 },
        { label: 'Output tokens', data: tokenOutputData, borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.08)', tension: 0.1, fill: true, pointRadius: 3, pointHoverRadius: 5 },
      ],
    },
    options: {
      ...makeChartClickHandlers(sorted),
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { position: 'top', labels: { boxWidth: 12, padding: 14, font: CHART_FONT } } },
      scales: {
        x: { grid: CHART_GRID, ticks: { font: CHART_FONT, maxRotation: 30, maxTicksLimit: 20 } },
        y: { grid: CHART_GRID, beginAtZero: true, ticks: { font: CHART_FONT }, afterFit: (s) => { s.width = 88; } },
      },
    },
  });

  el.chartLabel2.textContent = 'Cumulative Cost';
  let cumCostInput = 0, cumCostOutput = 0, cumCostTotal = 0;
  const costInputData  = sorted.map((item) => { cumCostInput  += item.cost?.input_cost_usd  ?? 0; return parseFloat(cumCostInput.toFixed(8)); });
  const costOutputData = sorted.map((item) => { cumCostOutput += item.cost?.output_cost_usd ?? 0; return parseFloat(cumCostOutput.toFixed(8)); });
  const costTotalData  = sorted.map((item) => { cumCostTotal  += item.cost?.total_cost_usd  ?? 0; return parseFloat(cumCostTotal.toFixed(8)); });

  const costChart = new Chart(el.mainChart2, {
    type: 'line',
    plugins: [CROSSHAIR_PLUGIN],
    data: {
      labels,
      datasets: [
        { label: 'Total cost',  data: costTotalData,  borderColor: '#dc2626', backgroundColor: 'rgba(220,38,38,0.08)',  tension: 0.1, fill: true, pointRadius: 3, pointHoverRadius: 5 },
        { label: 'Input cost',  data: costInputData,  borderColor: '#16a34a', backgroundColor: 'rgba(22,163,74,0.08)',  tension: 0.1, fill: true, pointRadius: 3, pointHoverRadius: 5 },
        { label: 'Output cost', data: costOutputData, borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.08)', tension: 0.1, fill: true, pointRadius: 3, pointHoverRadius: 5 },
      ],
    },
    options: {
      ...makeChartClickHandlers(sorted),
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'top', labels: { boxWidth: 12, padding: 14, font: CHART_FONT } },
        tooltip: { callbacks: { label: (ctx) => `$${Number(ctx.raw).toFixed(8)}` } },
      },
      scales: {
        x: { grid: CHART_GRID, ticks: { font: CHART_FONT, maxRotation: 30, maxTicksLimit: 20 } },
        y: { grid: CHART_GRID, beginAtZero: true, ticks: { font: CHART_FONT, callback: (v) => `$${Number(v).toFixed(6)}` }, afterFit: (s) => { s.width = 88; } },
      },
    },
  });

  syncChartHover(tokensChart, costChart);
  syncChartHover(costChart, tokensChart);

  return [tokensChart, costChart];
}
