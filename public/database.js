(() => {
  const root = document.getElementById('app');
  const sessionKey = 'jayenware_admin_session';
  const state = { page: 1, totalPages: 1, tables: [], table: null, columns: [], rows: [] };
  const tableName = document.body.dataset.table || '';
  const isIndex = document.body.dataset.mode === 'index';
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const label = (name) => String(name || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  function readSession() {
    for (const storage of [localStorage, sessionStorage]) {
      try {
        const session = JSON.parse(storage.getItem(sessionKey) || '{}');
        if (session.access_token) return session;
      } catch (_) {}
    }
    return {};
  }

  let session = readSession();
  async function api(path, options = {}) {
    const headers = { ...(options.headers || {}), Authorization: `Bearer ${session.access_token || ''}` };
    if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    const method = String(options.method || 'GET').toUpperCase();
    const startedAt = performance.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let receivedResponse = false;
    try {
      const response = await fetch(path, { ...options, headers, signal: controller.signal });
      receivedResponse = true;
      const result = await response.json().catch(() => ({}));
      const requestId = response.headers.get('x-request-id') || response.headers.get('x-vercel-id') || null;
      const diagnostic = { method, status: response.status, requestId, elapsedMs: Math.round(performance.now() - startedAt) };
      if (response.status === 401 || response.status === 403) {
        if (method !== 'GET') console.error('[JABIYEN_ADMIN_API_ERROR]', { ...diagnostic, message: result.error || 'Admin authorization failed.' });
        localStorage.removeItem(sessionKey);
        sessionStorage.removeItem(sessionKey);
        window.location.replace('/signin?type=admin');
        throw new Error('Please sign in with an active JABIYEN administrator account.');
      }
      if (!response.ok || result.success === false) {
        if (method !== 'GET') console.error('[JABIYEN_ADMIN_API_ERROR]', { ...diagnostic, message: result.error || result.message || `Request failed (${response.status})` });
        throw new Error(result.error || result.message || `Request failed (${response.status})`);
      }
      if (method !== 'GET') console.info('[JABIYEN_ADMIN_API_OK]', { ...diagnostic, success: result.success === true });
      return result;
    } catch (error) {
      if (controller.signal.aborted) {
        console.error('[JABIYEN_ADMIN_API_TIMEOUT]', { method, elapsedMs: Math.round(performance.now() - startedAt) });
        throw new Error('This request timed out. Refresh the section to check whether the content saved before trying again.');
      }
      if (method !== 'GET' && !receivedResponse) {
        console.error('[JABIYEN_ADMIN_API_NETWORK_ERROR]', { method, elapsedMs: Math.round(performance.now() - startedAt), message: error instanceof Error ? error.message : 'Network request failed.' });
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  function navMarkup(activeName) {
    return `<a class="nav-link${isIndex ? ' active' : ''}" href="/sections"><span class="nav-icon"></span>All sections</a>${state.tables.map((table) => `<a class="nav-link${table.name === activeName ? ' active' : ''}" href="${esc(table.path)}"><span class="nav-icon"></span>${esc(table.title)}</a>`).join('')}`;
  }

  function shell(user, activeName, content) {
    root.innerHTML = `<div class="app"><aside><a class="brand" href="/dashboard"><img src="/logo.png" alt="JABIYEN"><span><strong>JABIYEN</strong><small>ADMIN CONSOLE</small></span></a><section><p class="nav-title">Store management · ${state.tables.length} sections</p><nav class="nav-list" aria-label="Store sections"><a class="nav-link" href="/dashboard"><span class="nav-icon"></span>Dashboard</a>${navMarkup(activeName)}</nav></section></aside><main><header class="topbar"><div><div class="eyebrow">${isIndex ? 'Store management' : esc(state.table?.group || 'Store section')}</div><h1>${isIndex ? 'Website Sections' : esc(state.table?.title || label(activeName))}</h1></div><div class="user-tools"><span>${esc(user.email || 'Signed-in administrator')}</span><button class="button" id="logoutBtn" type="button">Log out</button></div></header>${content}</main></div>`;
    document.getElementById('logoutBtn').addEventListener('click', async () => {
      try { await api('/api/auth/logout', { method: 'POST' }); } catch (_) {}
      localStorage.removeItem(sessionKey);
      sessionStorage.removeItem(sessionKey);
      window.location.replace('/signin');
    });
  }

  function renderIndex(user) {
    const groups = [...new Set(state.tables.map((table) => table.group || 'Other'))];
    const content = `<section class="intro"><div><h2>Manage your website content</h2><p>Choose a section to update the information displayed on the JABIYEN website.</p></div><a class="button intro-button" href="/dashboard">Dashboard</a></section><section class="stats"><div class="stat"><strong>${state.tables.length}</strong><span>Content sections</span></div><div class="stat"><strong>${groups.length}</strong><span>Management groups</span></div><div class="stat"><strong>Central API</strong><span>One shared backend</span></div></section>${groups.map((group) => `<section class="section-group"><div class="section-head"><div><h2>${esc(group)}</h2><p>Choose a section to manage its content.</p></div></div><div class="cards">${state.tables.filter((table) => table.group === group).map((table) => `<a class="table-card" href="${esc(table.path)}"><div class="table-card-title">${esc(table.title)}</div><p class="card-description">${esc(table.description || '')}</p><div class="table-card-meta"><span class="pill">Website content</span></div><span class="card-action">Open section <b aria-hidden="true">↗</b></span></a>`).join('')}</div></section>`).join('')}`;
    shell(user, '', content);
  }

  function visibleColumns() {
    const hidden = new Set([...(state.table?.primaryKeys || []), 'id', 'created_at', 'updated_at']);
    return state.columns.filter((column) => !hidden.has(column.name));
  }

  function displayValue(value) {
    if (value === null || value === undefined || value === '') return '<span class="cell null">Not set</span>';
    const text = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
    if (typeof value === 'boolean') return `<span class="pill ${value ? 'pill-on' : 'pill-off'}">${value ? 'Active' : 'Off'}</span>`;
    return `<div class="cell" title="${esc(text)}">${esc(text.length > 400 ? `${text.slice(0, 400)}…` : text)}</div>`;
  }

  function renderRows(rows = state.rows) {
    const columns = visibleColumns();
    const canWrite = !!state.table?.canWrite;
    const headers = columns.map((column) => `<th>${esc(label(column.name))}</th>`).join('');
    const actionHeader = canWrite ? '<th class="actions-heading">Actions</th>' : '';
    const body = rows.length ? rows.map((row) => {
      const id = row[state.table.primaryKeys[0]];
      return `<tr>${columns.map((column) => `<td>${displayValue(row[column.name])}</td>`).join('')}${canWrite ? `<td class="row-actions"><button class="button button-small" type="button" data-record-action="edit" data-record-id="${esc(id)}">Edit</button><button class="button button-small button-danger" type="button" data-record-action="delete" data-record-id="${esc(id)}">Delete</button></td>` : ''}</tr>`;
    }).join('') : `<tr><td colspan="${Math.max(columns.length + (canWrite ? 1 : 0), 1)}" class="status">No content yet. Use “Add content” to create the first entry.</td></tr>`;
    document.getElementById('tableWrap').innerHTML = `<table><thead><tr>${headers}${actionHeader}</tr></thead><tbody>${body}</tbody></table>`;
  }

  function fieldMarkup(column, value, editing) {
    const type = String(column.type || '').toLowerCase();
    const required = !column.nullable && (column.default === null || column.default === undefined) && column.name !== state.table.primaryKeys[0];
    const fieldLabel = label(column.name);
    const raw = value === null || value === undefined ? '' : value;
    const escaped = esc(raw);
    const optionalNote = column.nullable ? '<small>Optional</small>' : '';
    if (type === 'boolean') {
      const checked = raw === true || raw === 'true' || (!editing && (column.default === true || column.default === 'true'));
      return `<label class="form-field form-field-check"><span><strong>${esc(fieldLabel)}</strong>${optionalNote}</span><input type="checkbox" name="${esc(column.name)}" aria-label="${esc(fieldLabel)}" ${checked ? 'checked' : ''}></label>`;
    }
    let inputType = 'text';
    if (['smallint', 'integer', 'int2', 'int4', 'bigint', 'int8', 'numeric', 'decimal', 'real', 'double precision', 'float4', 'float8'].includes(type)) inputType = 'number';
    else if (type.includes('timestamp')) inputType = 'datetime-local';
    else if (type === 'date') inputType = 'date';
    const initial = inputType === 'datetime-local' && raw ? (() => { const d = new Date(raw); return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 16); })() : escaped;
    const longField = /description|address|working_hours|copyright_text|custom_css|video_schema|keywords|subtitle/i.test(column.name);
    const control = longField ? `<textarea name="${esc(column.name)}" aria-label="${esc(fieldLabel)}" ${required ? 'required' : ''} rows="${/description|custom_css|video_schema/i.test(column.name) ? 4 : 2}">${initial}</textarea>` : `<input name="${esc(column.name)}" type="${inputType}" aria-label="${esc(fieldLabel)}" value="${initial}" ${inputType === 'number' ? 'step="any"' : ''} ${required ? 'required' : ''}>`;
    return `<label class="form-field"><span><strong>${esc(fieldLabel)}${required ? ' *' : ''}</strong>${optionalNote}</span>${control}</label>`;
  }

  function openRecordForm(record) {
    const editing = !!record;
    const modal = document.getElementById('recordModal');
    document.getElementById('recordModalTitle').textContent = editing ? `Edit ${state.table.title} content` : `Add ${state.table.title} content`;
    document.getElementById('recordFormFields').innerHTML = state.table.editableColumns.map((name) => {
      const column = state.columns.find((item) => item.name === name);
      return column ? fieldMarkup(column, record ? record[name] : column.default === 'true' ? true : '', editing) : '';
    }).join('');
    document.getElementById('recordFormStatus').textContent = '';
    document.getElementById('recordId').value = editing ? String(record[state.table.primaryKeys[0]]) : '';
    document.getElementById('recordSubmit').textContent = editing ? 'Save changes' : 'Add content';
    modal.hidden = false;
    document.body.classList.add('modal-open');
    document.querySelector('#recordFormFields input, #recordFormFields textarea')?.focus();
  }

  function closeRecordForm() {
    document.getElementById('recordModal').hidden = true;
    document.body.classList.remove('modal-open');
  }

  async function saveRecord(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const submit = document.getElementById('recordSubmit');
    const status = document.getElementById('recordFormStatus');
    const id = document.getElementById('recordId').value;
    const payload = {};
    for (const name of state.table.editableColumns) {
      const column = state.columns.find((item) => item.name === name);
      const input = form.elements.namedItem(name);
      if (!column || !input) continue;
      if (String(column.type).toLowerCase() === 'boolean') payload[name] = input.checked;
      else if (input.value === '' && column.nullable) payload[name] = null;
      else if (String(column.type).toLowerCase().includes('timestamp') && input.value) payload[name] = new Date(input.value).toISOString();
      else payload[name] = input.value;
    }
    submit.disabled = true;
    submit.textContent = 'Saving…';
    status.textContent = '';
    status.classList.remove('error');
    try {
      await api(`/api/admin/tables/${encodeURIComponent(state.table.name)}${id ? `/${encodeURIComponent(id)}` : ''}`, {
        method: id ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      });
      closeRecordForm();
      if (typeof window.showToast === 'function') window.showToast(id ? 'Changes saved.' : 'Content added.');
      void loadTablePage();
    } catch (error) {
      status.textContent = error.message || 'Content could not be saved.';
      status.classList.add('error');
    } finally {
      submit.disabled = false;
      submit.textContent = id ? 'Save changes' : 'Add content';
    }
  }

  async function deleteRecord(id) {
    if (!window.confirm(`Remove this ${state.table.title} content? This cannot be undone.`)) return;
    try {
      await api(`/api/admin/tables/${encodeURIComponent(state.table.name)}/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (typeof window.showToast === 'function') window.showToast('Content removed.');
      await loadTablePage();
    } catch (error) {
      window.alert(error.message || 'Content could not be removed.');
    }
  }

  async function loadTablePage() {
    const tableWrap = document.getElementById('tableWrap');
    if (!tableWrap) return;
    tableWrap.innerHTML = '<div class="status">Loading content…</div>';
    try {
      const result = await api(`/api/admin/tables/${encodeURIComponent(tableName)}?page=${state.page}&page_size=25`);
      state.table = { ...state.table, ...result };
      state.columns = result.columns || [];
      state.rows = result.rows || [];
      state.totalPages = result.totalPages || 1;
      if (state.page > state.totalPages && state.totalPages > 0) {
        state.page = state.totalPages;
        return loadTablePage();
      }
      document.getElementById('recordCount').textContent = `${Number(result.total || 0).toLocaleString()} items`;
      document.getElementById('pageInfo').textContent = `Page ${result.page || state.page} of ${state.totalPages}`;
      document.getElementById('previousBtn').disabled = state.page <= 1;
      document.getElementById('nextBtn').disabled = state.page >= state.totalPages;
      document.getElementById('addRecordBtn').hidden = !result.canWrite;
      renderRows();
    } catch (error) {
      tableWrap.innerHTML = `<div class="status error">${esc(error.message || 'Could not load this content.')}</div>`;
    }
  }

  function renderTable(user) {
    const content = `<section class="section-head page-section-head"><div><h2>${esc(state.table.title)}</h2><p>${esc(state.table.description || 'Manage the information shown on this section.')}</p></div><a class="button" href="/sections">All sections</a></section><section class="panel"><div class="panel-head records-head"><div><strong>Content</strong><p>Manage the information displayed on this section.</p></div><div class="record-tools"><span class="pill" id="recordCount">—</span><input class="search compact-search" id="recordSearch" type="search" placeholder="Search content" aria-label="Search content"><button class="button" id="refreshBtn" type="button">Refresh</button><button class="button button-primary" id="addRecordBtn" type="button">＋ Add content</button></div></div><div class="table-wrap" id="tableWrap"><div class="status">Loading content…</div></div><footer class="pager"><span id="pageInfo">—</span><div class="pager-group"><button class="button" id="previousBtn" type="button" disabled>Previous</button><button class="button" id="nextBtn" type="button" disabled>Next</button></div></footer></section><div class="modal-backdrop" id="recordModal" hidden><section class="record-modal" role="dialog" aria-modal="true" aria-labelledby="recordModalTitle"><header class="modal-head"><div><div class="eyebrow">${esc(state.table.title)}</div><h2 id="recordModalTitle">Edit content</h2></div><button class="button" id="closeRecordModal" type="button" aria-label="Close">×</button></header><form id="recordForm"><input type="hidden" id="recordId"><div class="modal-fields" id="recordFormFields"></div><p class="form-status" id="recordFormStatus" role="status"></p><footer class="modal-actions"><button class="button" id="cancelRecordModal" type="button">Cancel</button><button class="button button-primary" id="recordSubmit" type="submit">Save changes</button></footer></form></section></div>`;
    shell(user, tableName, content);
    document.getElementById('previousBtn').addEventListener('click', () => { if (state.page > 1) { state.page -= 1; loadTablePage(); } });
    document.getElementById('nextBtn').addEventListener('click', () => { if (state.page < state.totalPages) { state.page += 1; loadTablePage(); } });
    document.getElementById('refreshBtn').addEventListener('click', loadTablePage);
    document.getElementById('addRecordBtn').addEventListener('click', () => openRecordForm(null));
    document.getElementById('closeRecordModal').addEventListener('click', closeRecordForm);
    document.getElementById('cancelRecordModal').addEventListener('click', closeRecordForm);
    document.getElementById('recordForm').addEventListener('submit', saveRecord);
    document.getElementById('recordSearch').addEventListener('input', (event) => {
      const needle = event.currentTarget.value.trim().toLowerCase();
      renderRows(needle ? state.rows.filter((row) => visibleColumns().some((column) => String(row[column.name] ?? '').toLowerCase().includes(needle))) : state.rows);
    });
    document.getElementById('tableWrap').addEventListener('click', (event) => {
      const button = event.target.closest('[data-record-action]');
      if (!button) return;
      const record = state.rows.find((item) => String(item[state.table.primaryKeys[0]]) === button.dataset.recordId);
      if (button.dataset.recordAction === 'edit' && record) openRecordForm(record);
      if (button.dataset.recordAction === 'delete') deleteRecord(button.dataset.recordId);
    });
    document.getElementById('recordModal').addEventListener('click', (event) => {
      if (event.target.id === 'recordModal') closeRecordForm();
    });
    loadTablePage();
  }

  async function init() {
    session = readSession();
    if (!session.access_token) { window.location.replace('/signin?type=admin'); return; }
    try {
      const [me, result] = await Promise.all([api('/api/admin/session'), api('/api/admin/tables')]);
      state.tables = Array.isArray(result.tables) ? result.tables : [];
      const user = me.data?.user || result.admin || {};
      if (isIndex) {
        document.title = 'Website Sections | JABIYEN Admin';
        renderIndex(user);
      }
      else {
        state.table = state.tables.find((table) => table.name === tableName);
        if (!state.table) {
          root.innerHTML = '<div class="status error">This section is not available. Return to <a href="/sections">all sections</a>.</div>';
          return;
        }
        document.title = `${state.table.title} | JABIYEN Admin`;
        renderTable(user);
      }
    } catch (error) {
      root.innerHTML = `<div class="status error">${esc(error.message || 'Website sections could not be loaded.')}</div>`;
    }
  }

  init();
})();
