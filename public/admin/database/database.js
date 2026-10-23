(() => {
  const root = document.getElementById('app');
  const tableName = document.body.dataset.table || '';
  const isIndex = document.body.dataset.mode === 'index';
  const sessionKey = 'jayenware_admin_session';
  let page = 1;
  let totalPages = 1;
  let tables = [];
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const label = (name) => name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
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
    const response = await fetch(path, { ...options, headers: { ...(options.headers || {}), Authorization: `Bearer ${session.access_token || ''}` } });
    const result = await response.json().catch(() => ({}));
    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem(sessionKey);
      sessionStorage.removeItem(sessionKey);
      window.location.replace('/signin?type=admin');
      throw new Error('Please sign in with an active administrator account.');
    }
    if (!response.ok) throw new Error(result.error || result.message || `Request failed (${response.status})`);
    return result;
  }
  function navMarkup(activeName) {
    return `<a class="nav-link" href="/dashboard"><span class="nav-icon"></span>Dashboard</a><a class="nav-link${isIndex ? ' active' : ''}" href="/advanced"><span class="nav-icon"></span>Advanced Database</a>${tables.map((table) => `<a class="nav-link${table.name === activeName ? ' active' : ''}" href="/admin/database/${encodeURIComponent(table.name)}"><span class="nav-icon"></span>${esc(label(table.name))}</a>`).join('')}`;
  }
  function shell(user, activeName, content) {
    root.innerHTML = `<div class="app"><aside><a class="brand" href="/dashboard"><img src="/logo.png" alt="JABIYEN"><span><strong>JABIYEN</strong><small>ADMIN CONSOLE</small></span></a><section><p class="nav-title">Advanced · ${tables.length} tables</p><nav class="nav-list">${navMarkup(activeName)}</nav></section></aside><main><header class="topbar"><div><div class="eyebrow">JABIYEN database</div><h1>${isIndex ? 'Advanced Database' : esc(label(activeName))}</h1></div><div class="user-tools"><span>${esc(user.email || 'Signed-in administrator')}</span><button class="button" id="logoutBtn" type="button">Log out</button></div></header>${content}</main></div>`;
    document.getElementById('logoutBtn').addEventListener('click', async () => {
      try { await api('/api/auth/logout', { method: 'POST' }); } catch (_) {}
      localStorage.removeItem(sessionKey);
      sessionStorage.removeItem(sessionKey);
      window.location.replace('/signin');
    });
  }
  function renderIndex(user) {
    const columnTotal = tables.reduce((sum, table) => sum + (Array.isArray(table.columns) ? table.columns.length : 0), 0);
    const content = `<section class="intro"><h2>Complete database access</h2><p>Choose a table section to inspect every available column and browse its records. Access is protected by the signed-in admin session.</p></section><section class="stats"><div class="stat"><strong>${tables.length}</strong><span>Database tables</span></div><div class="stat"><strong>${columnTotal}</strong><span>Registered columns</span></div></section><section><div class="section-head"><div><h2>All table sections</h2><p id="tableCount">${tables.length} tables</p></div><input class="search" id="tableSearch" type="search" placeholder="Search tables…" aria-label="Search database tables"></div><div class="cards" id="tableCards"></div></section>`;
    shell(user, '', content);
    const input = document.getElementById('tableSearch');
    const renderCards = () => {
      const needle = input.value.trim().toLowerCase();
      const filtered = tables.filter((table) => table.name.toLowerCase().includes(needle));
      document.getElementById('tableCount').textContent = `${tables.length} tables · ${filtered.length} shown`;
      document.getElementById('tableCards').innerHTML = filtered.length ? filtered.map((table) => `<a class="table-card" href="/admin/database/${encodeURIComponent(table.name)}"><div class="table-card-title">${esc(label(table.name))}</div><div class="table-card-meta"><span>${esc(table.name)}</span><span class="pill">${Array.isArray(table.columns) ? table.columns.length : 0} columns</span></div></a>`).join('') : '<div class="status">No table names match this search.</div>';
    };
    input.addEventListener('input', renderCards);
    renderCards();
  }
  function renderSchema(columns) {
    return columns.length ? columns.map((column) => {
      const defaultLabel = column.default === null || column.default === undefined ? 'No default' : `Default: ${String(column.default)}`;
      return `<article class="column-card"><strong>${esc(column.name)}</strong><span>${esc(column.type || 'Unknown type')}</span><small>${column.nullable ? 'Nullable' : 'Required'} · ${esc(defaultLabel)}</small></article>`;
    }).join('') : '<div class="status">No column definitions available.</div>';
  }
  function renderRows(columns, rows) {
    const headers = columns.map((column) => `<th>${esc(column.name)}<small>${esc(column.type || '')}${column.nullable ? ' · nullable' : ''}</small></th>`).join('');
    const body = rows.length ? rows.map((row) => `<tr>${columns.map((column) => {
      const value = row[column.name];
      if (value === null || value === undefined || value === '') return '<td><span class="cell null">NULL</span></td>';
      const text = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
      return `<td><div class="cell" title="${esc(text)}">${esc(text.length > 500 ? `${text.slice(0, 500)}…` : text)}</div></td>`;
    }).join('')}</tr>`).join('') : `<tr><td colspan="${Math.max(columns.length, 1)}" class="status">This table has no records yet.</td></tr>`;
    document.getElementById('tableWrap').innerHTML = `<table><thead><tr>${headers || '<th>Columns</th>'}</tr></thead><tbody>${body}</tbody></table>`;
  }
  async function loadTablePage() {
    document.getElementById('tableWrap').innerHTML = '<div class="status">Loading records…</div>';
    try {
      const result = await api(`/api/admin/tables/${encodeURIComponent(tableName)}?page=${page}&page_size=25`);
      const columns = result.columns || [];
      const rows = result.rows || [];
      totalPages = result.totalPages || 1;
      document.getElementById('columnCount').textContent = `${columns.length} columns · page size ${result.pageSize || 25}`;
      document.getElementById('columnGrid').innerHTML = renderSchema(columns);
      document.getElementById('recordCount').textContent = `${Number(result.total || 0).toLocaleString()} records`;
      document.getElementById('pageInfo').textContent = `Page ${result.page || page} of ${totalPages}`;
      document.getElementById('previousBtn').disabled = page <= 1;
      document.getElementById('nextBtn').disabled = page >= totalPages;
      renderRows(columns, rows);
    } catch (error) {
      document.getElementById('tableWrap').innerHTML = `<div class="status error">${esc(error.message || 'Could not load records.')}</div>`;
      document.getElementById('columnGrid').innerHTML = `<div class="status error">${esc(error.message || 'Column schema unavailable.')}</div>`;
    }
  }
  function renderTable(user) {
    const content = `<div class="section-head"><div><h2>Database / ${esc(label(tableName))}</h2><p>Full column schema and paginated records</p></div><a class="button" href="/advanced">All tables</a></div><section class="panel"><div class="panel-head"><div><strong>Columns</strong><p id="columnCount">Loading column definitions…</p></div></div><div class="column-grid" id="columnGrid"><div class="status">Loading columns…</div></div></section><section class="panel"><div class="panel-head"><div><strong>Records</strong><p>Read-only paginated view</p></div><div class="user-tools"><span class="pill" id="recordCount">—</span><button class="button" id="refreshBtn" type="button">Refresh</button></div></div><div class="table-wrap" id="tableWrap"><div class="status">Loading records…</div></div><footer class="pager"><span id="pageInfo">—</span><div class="pager-group"><button class="button" id="previousBtn" type="button" disabled>Previous</button><button class="button" id="nextBtn" type="button" disabled>Next</button></div></footer></section>`;
    shell(user, tableName, content);
    document.getElementById('previousBtn').addEventListener('click', () => { if (page > 1) { page -= 1; loadTablePage(); } });
    document.getElementById('nextBtn').addEventListener('click', () => { if (page < totalPages) { page += 1; loadTablePage(); } });
    document.getElementById('refreshBtn').addEventListener('click', loadTablePage);
    loadTablePage();
  }
  async function init() {
    session = readSession();
    if (!session.access_token) { window.location.replace('/signin?type=admin'); return; }
    if (!isIndex && !/^[a-z0-9_]+$/.test(tableName)) { root.innerHTML = '<div class="status error">Invalid table section.</div>'; return; }
    try {
      const [me, result] = await Promise.all([api('/api/admin/me'), api('/api/admin/tables')]);
      tables = Array.isArray(result.tables) ? result.tables : [];
      const user = me.data && me.data.user || me.user || {};
      if (isIndex) renderIndex(user);
      else if (!tables.some((table) => table.name === tableName)) root.innerHTML = '<div class="status error">This table is not available to this admin account.</div>';
      else renderTable(user);
    } catch (error) {
      root.innerHTML = `<div class="status error">${esc(error.message || 'Database sections could not be loaded.')}</div>`;
    }
  }
  init();
})();
