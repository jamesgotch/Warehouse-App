/* ── State ─────────────────────────────────────────────────────────────────── */
const state = {
  items:    [],
  filtered: [],
  sortCol:  'id',
  sortDir:  'asc',
  page:     1,
  pageSize: 25,
  editingId:   null,
  deleteId:    null,
  currentUser: null,
};

/* ── DOM helpers ───────────────────────────────────────────────────────────── */
const $  = id => document.getElementById(id);
const el = (tag, cls) => { const e = document.createElement(tag); if (cls) e.className = cls; return e; };

/* ── Bootstrap ─────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  init();
});

function init() {
  checkAuth();

  // Login modal
  $('login-btn').addEventListener('click',    openLoginModal);
  $('auth-login-btn').addEventListener('click', openLoginModal);
  $('login-close').addEventListener('click',  closeLoginModal);
  $('login-cancel').addEventListener('click', closeLoginModal);
  $('login-save').addEventListener('click',   submitLogin);
  $('login-modal').addEventListener('click',  e => { if (e.target === $('login-modal')) closeLoginModal(); });
  $('login-form').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitLogin(); } });

  // Logout
  $('logout-btn').addEventListener('click', executeLogout);

  // Auth screen register
  $('register-btn').addEventListener('click', () => openRegisterModal());
  $('auth-register-btn').addEventListener('click', () => openRegisterModal());

  // Search
  $('search-input').addEventListener('input', () => {
    $('search-clear').hidden = $('search-input').value === '';
    state.page = 1;
    applyFilters();
  });
  $('search-clear').addEventListener('click', () => {
    $('search-input').value = '';
    $('search-clear').hidden = true;
    state.page = 1;
    applyFilters();
  });

  // Filters
  $('category-filter').addEventListener('change', () => { state.page = 1; applyFilters(); });
  $('stock-filter').addEventListener('change',    () => { state.page = 1; applyFilters(); });

  // Page size
  $('page-size-select').addEventListener('change', () => {
    state.pageSize = parseInt($('page-size-select').value, 10);
    state.page = 1;
    renderTable();
    updateCount();
  });

  // Sort headers
  document.querySelectorAll('.th-sort').forEach(th =>
    th.addEventListener('click', () => sortBy(th.dataset.col))
  );

  // Add button
  $('add-btn').addEventListener('click', () => openModal());

  // Item modal
  $('modal-close').addEventListener('click',  closeModal);
  $('modal-cancel').addEventListener('click', closeModal);
  $('modal-save').addEventListener('click',   saveItem);
  $('item-modal').addEventListener('click',   e => { if (e.target === $('item-modal')) closeModal(); });
  $('item-form').addEventListener('keydown',  e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveItem(); } });

  // Delete modal
  $('delete-close').addEventListener('click',   closeDeleteModal);
  $('delete-cancel').addEventListener('click',  closeDeleteModal);
  $('delete-confirm').addEventListener('click', executeDelete);
  $('delete-modal').addEventListener('click',   e => { if (e.target === $('delete-modal')) closeDeleteModal(); });

  // Info modal
  $('info-btn').addEventListener('click',  () => { $('info-modal').hidden = false; });
  $('info-close').addEventListener('click', () => { $('info-modal').hidden = true; });
  $('info-modal').addEventListener('click', e => { if (e.target === $('info-modal')) $('info-modal').hidden = true; });

  // Logs drawer
  $('logs-btn').addEventListener('click',     openLogsDrawer);
  $('logs-close').addEventListener('click',   closeLogsDrawer);
  $('logs-refresh').addEventListener('click', loadLogs);
  $('logs-backdrop').addEventListener('click', closeLogsDrawer);

  // Register modal — also wired from auth screen in init()
  $('register-close').addEventListener('click', closeRegisterModal);
  $('register-cancel').addEventListener('click', closeRegisterModal);
  $('register-save').addEventListener('click', submitRegister);
  $('register-modal').addEventListener('click', e => { if (e.target === $('register-modal')) closeRegisterModal(); });
  $('register-form').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitRegister(); } });

  // Esc key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeModal(); closeDeleteModal(); closeRegisterModal(); closeLoginModal(); closeLogsDrawer(); $('info-modal').hidden = true; }
  });
}

/* ── Auth ──────────────────────────────────────────────────────────────────── */
async function checkAuth() {
  try {
    const res = await fetch('/me');
    if (res.ok) {
      const user = await res.json();
      state.currentUser = user;
      setAuthUI(user);
      loadInventory();
      loadStats();
    } else {
      setAuthUI(null);
    }
  } catch {
    setAuthUI(null);
  }
}

function showLoggedOutState() {
  $('auth-screen').hidden = false;
}

function setAuthUI(user) {
  const loggedIn = !!user;
  $('auth-screen').hidden     = loggedIn;
  $('login-btn').hidden       = loggedIn;
  $('register-btn').hidden    = loggedIn;
  $('logs-btn').hidden        = !loggedIn;
  $('user-greeting').hidden   = !loggedIn;
  $('logout-btn').hidden      = !loggedIn;
  if (user) $('user-greeting').textContent = user.username;
  if (!loggedIn) closeLogsDrawer();
}

function handleSessionExpired() {
  state.currentUser = null;
  setAuthUI(null);
  showToast('Session expired — please log in again', 'error');
}

/* ── Data ──────────────────────────────────────────────────────────────────── */
async function loadInventory() {
  try {
    const res = await fetch('/inventory');
    if (res.status === 401) { handleSessionExpired(); return; }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.items = await res.json();
    applyFilters();
  } catch (err) {
    $('table-body').innerHTML = `<tr><td colspan="9">
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="44" height="44">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <h3>Failed to load inventory</h3>
        <p>${escHtml(err.message)}</p>
      </div>
    </td></tr>`;
  }
}

async function loadStats() {
  try {
    const res = await fetch('/stats');
    if (res.status === 401) { handleSessionExpired(); return; }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const s = await res.json();
    $('val-skus').textContent     = s.total_skus.toLocaleString();
    $('val-units').textContent    = s.total_units.toLocaleString();
    $('val-value').textContent    = '$' + s.total_value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    $('val-cats').textContent     = s.categories;
    $('val-lowstock').textContent = s.low_stock;
    document.querySelectorAll('.loading-val').forEach(v => v.classList.remove('loading-val'));
  } catch (err) {
    console.error('Stats failed:', err);
  }
}

/* ── Filter & Sort ─────────────────────────────────────────────────────────── */
function applyFilters() {
  const q     = $('search-input').value.toLowerCase().trim();
  const cat   = $('category-filter').value;
  const stock = $('stock-filter').value;

  state.filtered = state.items.filter(item => {
    if (q) {
      const hay = `${item.id} ${item.name} ${item.category ?? ''} ${item.brand ?? ''} ${item.size ?? ''} ${item.color ?? ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (cat   && item.category !== cat) return false;
    if (stock === 'low'    && item.quantity >= 20) return false;
    if (stock === 'medium' && (item.quantity < 20 || item.quantity >= 50)) return false;
    if (stock === 'high'   && item.quantity < 50) return false;
    return true;
  });

  sortItems();
  renderTable();
  updateCount();
}

function sortItems() {
  const { sortCol, sortDir } = state;
  state.filtered.sort((a, b) => {
    let av = a[sortCol] ?? '';
    let bv = b[sortCol] ?? '';
    if (typeof av === 'string') av = av.toLowerCase();
    if (typeof bv === 'string') bv = bv.toLowerCase();
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sortDir === 'asc' ? cmp : -cmp;
  });
}

function sortBy(col) {
  state.sortDir = (state.sortCol === col && state.sortDir === 'asc') ? 'desc' : 'asc';
  state.sortCol = col;
  state.page    = 1;
  sortItems();
  renderTable();
  updateSortHeaders();
  updateCount();
}

function updateSortHeaders() {
  document.querySelectorAll('.th-sort').forEach(th => {
    const arrow = th.querySelector('.sort-arrow');
    const active = th.dataset.col === state.sortCol;
    th.classList.toggle('sort-active', active);
    arrow.textContent = active ? (state.sortDir === 'asc' ? '↑' : '↓') : '↕';
  });
}

/* ── Render ────────────────────────────────────────────────────────────────── */
function renderTable() {
  const { filtered, page, pageSize } = state;
  const start     = (page - 1) * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);

  if (filtered.length === 0) {
    $('table-body').innerHTML = `<tr><td colspan="9">
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="44" height="44">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
        </svg>
        <h3>No items found</h3>
        <p>Try adjusting your search or filters</p>
      </div>
    </td></tr>`;
    renderPagination(0);
    return;
  }

  const maxQty = Math.max(...state.items.map(i => i.quantity), 1);

  $('table-body').innerHTML = pageItems.map(item => {
    const level   = item.quantity < 20 ? 'low' : item.quantity < 50 ? 'medium' : 'high';
    const pct     = Math.min(100, Math.round((item.quantity / maxQty) * 100));
    const catKey  = (item.category || '').toLowerCase();
    const catBadge = item.category
      ? `<span class="badge badge-${catKey}">${escHtml(item.category)}</span>`
      : `<span class="td-muted">—</span>`;
    const colorCell = item.color
      ? `<span class="color-cell"><span class="color-swatch" style="background:${cssColor(item.color)}"></span>${escHtml(item.color)}</span>`
      : `<span class="td-muted">—</span>`;

    return `<tr>
      <td class="td-id">${item.id}</td>
      <td class="td-name">${escHtml(item.name)}</td>
      <td>${catBadge}</td>
      <td class="td-muted">${escHtml(item.brand || '—')}</td>
      <td class="td-muted">${escHtml(item.size  || '—')}</td>
      <td>${colorCell}</td>
      <td>
        <div class="qty-cell">
          <span class="qty-num qty-${level}">${item.quantity.toLocaleString()}</span>
          <div class="qty-bar"><div class="qty-fill qty-${level}" style="width:${pct}%"></div></div>
        </div>
      </td>
      <td class="td-price">$${item.price.toFixed(2)}</td>
      <td>
        <div class="action-cell">
          <button class="action-btn edit"   onclick="openModal(${item.id})"                              title="Edit item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="action-btn delete" onclick="confirmDelete(${item.id}, ${escHtml(JSON.stringify(item.name))})" title="Delete item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6"/><path d="M14 11v6"/>
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');

  renderPagination(filtered.length);
  updateSortHeaders();
}

function updateCount() {
  const total = state.filtered.length;
  $('item-count').textContent = `${total.toLocaleString()} item${total !== 1 ? 's' : ''}`;
  const { page, pageSize } = state;
  const s = Math.min((page - 1) * pageSize + 1, total);
  const e = Math.min(page * pageSize, total);
  $('footer-info').textContent = total === 0
    ? 'No items match your filters'
    : `Showing ${s.toLocaleString()}–${e.toLocaleString()} of ${total.toLocaleString()} items`;
}

function renderPagination(total) {
  const pages = Math.ceil(total / state.pageSize);
  if (pages <= 1) { $('pagination').innerHTML = ''; return; }

  const range = buildPageRange(state.page, pages);
  let html = `<button class="page-btn" onclick="goPage(${state.page - 1})" ${state.page === 1 ? 'disabled' : ''}>‹</button>`;
  let prev = null;
  for (const p of range) {
    if (prev !== null && p - prev > 1) html += `<span class="page-ellipsis">…</span>`;
    html += `<button class="page-btn ${state.page === p ? 'active' : ''}" onclick="goPage(${p})">${p}</button>`;
    prev = p;
  }
  html += `<button class="page-btn" onclick="goPage(${state.page + 1})" ${state.page === pages ? 'disabled' : ''}>›</button>`;
  $('pagination').innerHTML = html;
}

function buildPageRange(cur, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const s = new Set([1, total, cur]);
  for (let i = Math.max(1, cur - 1); i <= Math.min(total, cur + 1); i++) s.add(i);
  return [...s].sort((a, b) => a - b);
}

function goPage(p) {
  const pages = Math.ceil(state.filtered.length / state.pageSize);
  if (p < 1 || p > pages) return;
  state.page = p;
  renderTable();
  updateCount();
}

/* ── Item Modal ────────────────────────────────────────────────────────────── */
function openModal(id = null) {
  state.editingId = id;
  $('modal-title').textContent  = id ? 'Edit Item'    : 'Add Item';
  $('save-label').textContent   = id ? 'Save Changes' : 'Add Item';
  $('form-error').hidden        = true;
  $('item-form').querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));

  if (id) {
    const item = state.items.find(i => i.id === id);
    if (!item) return;
    $('form-id').value       = item.id;
    $('form-name').value     = item.name;
    $('form-category').value = item.category || '';
    $('form-brand').value    = item.brand    || '';
    $('form-size').value     = item.size     || '';
    $('form-color').value    = item.color    || '';
    $('form-quantity').value = item.quantity;
    $('form-price').value    = item.price;
  } else {
    $('item-form').reset();
    $('form-id').value = '';
  }

  $('item-modal').hidden = false;
  setTimeout(() => $('form-name').focus(), 60);
}

function closeModal() {
  $('item-modal').hidden = true;
  state.editingId = null;
}

async function saveItem() {
  const name     = $('form-name').value.trim();
  const quantity = $('form-quantity').value;
  const price    = $('form-price').value;

  // Validate required fields
  let valid = true;
  const fields = [$('form-name'), $('form-quantity'), $('form-price')];
  fields.forEach(f => f.classList.remove('invalid'));

  if (!name)                                             { $('form-name').classList.add('invalid');     valid = false; }
  if (quantity === '' || isNaN(+quantity) || +quantity < 0) { $('form-quantity').classList.add('invalid'); valid = false; }
  if (price    === '' || isNaN(+price)    || +price    < 0) { $('form-price').classList.add('invalid');    valid = false; }

  if (!valid) { showFormError('Please fill in all required fields correctly.'); return; }

  const payload = {
    name,
    category: $('form-category').value || null,
    brand:    $('form-brand').value.trim() || null,
    size:     $('form-size').value.trim()  || null,
    color:    $('form-color').value.trim() || null,
    quantity: parseInt(quantity, 10),
    price:    parseFloat(price),
  };

  const btn = $('modal-save');
  $('save-label').textContent = 'Saving…';
  btn.disabled = true;

  try {
    const url    = state.editingId ? `/inventory/${state.editingId}` : '/inventory';
    const method = state.editingId ? 'PUT' : 'POST';
    const res    = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
    if (res.status === 401) { handleSessionExpired(); return; }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }
    closeModal();
    await Promise.all([loadInventory(), loadStats()]);
    showToast(state.editingId ? 'Item updated successfully' : 'Item added successfully', 'success');
  } catch (err) {
    showFormError(err.message);
  } finally {
    $('save-label').textContent = state.editingId ? 'Save Changes' : 'Add Item';
    btn.disabled = false;
  }
}

function showFormError(msg) {
  const el = $('form-error');
  el.textContent = msg;
  el.hidden = false;
}

/* ── Delete Modal ──────────────────────────────────────────────────────────── */
function confirmDelete(id, name) {
  state.deleteId = id;
  $('delete-item-name').textContent = name;
  $('delete-modal').hidden = false;
}

function closeDeleteModal() {
  $('delete-modal').hidden = true;
  state.deleteId = null;
}

async function executeDelete() {
  if (!state.deleteId) return;
  const id  = state.deleteId;
  const btn = $('delete-confirm');
  btn.textContent = 'Deleting…';
  btn.disabled    = true;
  try {
    const res = await fetch(`/inventory/${id}`, { method: 'DELETE' });
    if (res.status === 401) { handleSessionExpired(); return; }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    closeDeleteModal();
    await Promise.all([loadInventory(), loadStats()]);
    showToast('Item deleted', 'success');
  } catch (err) {
    showToast('Delete failed: ' + err.message, 'error');
  } finally {
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6"/><path d="M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg> Delete`;
    btn.disabled = false;
  }
}

/* ── Toast ─────────────────────────────────────────────────────────────────── */
function showToast(message, type = 'info') {
  const icons = {
    success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="15" height="15"><polyline points="20 6 9 17 4 12"/></svg>`,
    error:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="15" height="15"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    info:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
  };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span>${escHtml(message)}</span>`;
  $('toast-container').appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toast-out 0.25s ease forwards';
    setTimeout(() => toast.remove(), 280);
  }, 3500);
}

/* ── Utils ─────────────────────────────────────────────────────────────────── */
function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function cssColor(name) {
  const map = {
    black: '#2a2a2a', white: '#e8e8e8', grey: '#9ca3af', gray: '#9ca3af',
    red: '#ef4444', blue: '#3b82f6', green: '#22c55e', navy: '#1e3a5f',
    orange: '#f97316', purple: '#a855f7', brown: '#92400e', yellow: '#fbbf24',
    pink: '#ec4899', gold: '#d97706', silver: '#94a3b8',
  };
  return map[(name || '').toLowerCase()] || '#6b7280';
}

/* ── Login Modal ──────────────────────────────────────────────────────────── */
function openLoginModal() {
  $('login-form').reset();
  $('login-error').hidden = true;
  ['login-username', 'login-password'].forEach(id => $(id).classList.remove('invalid'));
  $('login-modal').hidden = false;
  setTimeout(() => $('login-username').focus(), 60);
}

function closeLoginModal() {
  $('login-modal').hidden = true;
}

async function submitLogin() {
  const username = $('login-username').value.trim();
  const password = $('login-password').value;

  let valid = true;
  ['login-username', 'login-password'].forEach(id => $(id).classList.remove('invalid'));
  $('login-error').hidden = true;

  if (!username) { $('login-username').classList.add('invalid'); valid = false; }
  if (!password) { $('login-password').classList.add('invalid'); valid = false; }
  if (!valid) { showLoginError('Please fill in all fields.'); return; }

  const btn = $('login-save');
  $('login-label').textContent = 'Logging in…';
  btn.disabled = true;

  try {
    const res = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }
    const user = await res.json();
    state.currentUser = user;
    setAuthUI(user);
    closeLoginModal();
    showToast(`Welcome back, ${escHtml(user.username)}!`, 'success');
    loadInventory();
    loadStats();
  } catch (err) {
    $('login-username').classList.add('invalid');
    $('login-password').classList.add('invalid');
    showLoginError(err.message);
  } finally {
    $('login-label').textContent = 'Log In';
    btn.disabled = false;
  }
}

function showLoginError(msg) {
  const el = $('login-error');
  el.textContent = msg;
  el.hidden = false;
}

async function executeLogout() {
  await fetch('/logout', { method: 'POST' });
  state.currentUser = null;
  state.items = [];
  state.filtered = [];
  setAuthUI(null);
  $('table-body').innerHTML = '';
  showToast('Logged out successfully', 'info');
  openLoginModal();
}

/* ── Register Modal ────────────────────────────────────────────────────────── */
function openRegisterModal() {
  $('register-form').reset();
  $('reg-error').hidden = true;
  ['reg-username', 'reg-password', 'reg-confirm'].forEach(id => $(id).classList.remove('invalid'));
  $('register-modal').hidden = false;
  setTimeout(() => $('reg-username').focus(), 60);
}

function closeRegisterModal() {
  $('register-modal').hidden = true;
}

async function submitRegister() {
  const username = $('reg-username').value.trim();
  const password = $('reg-password').value;
  const confirm  = $('reg-confirm').value;

  let valid = true;
  ['reg-username', 'reg-password', 'reg-confirm'].forEach(id => $(id).classList.remove('invalid'));
  $('reg-error').hidden = true;

  if (!username) { $('reg-username').classList.add('invalid'); valid = false; }
  if (!password) { $('reg-password').classList.add('invalid'); valid = false; }
  if (!confirm)  { $('reg-confirm').classList.add('invalid');  valid = false; }
  if (!valid) { showRegError('Please fill in all required fields.'); return; }

  if (password !== confirm) {
    $('reg-password').classList.add('invalid');
    $('reg-confirm').classList.add('invalid');
    showRegError('Passwords do not match.');
    return;
  }

  const btn = $('register-save');
  $('register-label').textContent = 'Creating…';
  btn.disabled = true;

  try {
    const res = await fetch('/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }
    closeRegisterModal();
    showToast(`Account "${escHtml(username)}" created successfully`, 'success');
  } catch (err) {
    showRegError(err.message);
  } finally {
    $('register-label').textContent = 'Create Account';
    btn.disabled = false;
  }
}

function showRegError(msg) {
  const el = $('reg-error');
  el.textContent = msg;
  el.hidden = false;
}

/* ── Logs Drawer ───────────────────────────────────────────────────────────── */
function openLogsDrawer() {
  $('logs-drawer').hidden   = false;
  $('logs-backdrop').hidden = false;
  loadLogs();
}

function closeLogsDrawer() {
  $('logs-drawer').hidden   = true;
  $('logs-backdrop').hidden = true;
}

const ACTION_LABELS = {
  register:    { label: 'Registered',   cls: 'log-register'  },
  login:       { label: 'Logged In',    cls: 'log-login'     },
  logout:      { label: 'Logged Out',   cls: 'log-logout'    },
  create_item: { label: 'Item Added',   cls: 'log-create'    },
  update_item: { label: 'Item Updated', cls: 'log-update'    },
  delete_item: { label: 'Item Deleted', cls: 'log-delete'    },
};

async function loadLogs() {
  $('logs-body').innerHTML = `<div class="logs-loading"><div class="spinner"></div><span>Loading…</span></div>`;
  try {
    const res = await fetch('/logs');
    if (res.status === 401) { handleSessionExpired(); return; }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const logs = await res.json();

    if (logs.length === 0) {
      $('logs-body').innerHTML = `<div class="logs-empty">No audit logs yet.</div>`;
      return;
    }

    $('logs-body').innerHTML = logs.map(log => {
      const meta  = ACTION_LABELS[log.action] || { label: log.action, cls: 'log-default' };
      const date  = new Date(log.timestamp);
      const time  = date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
      return `<div class="log-entry">
        <span class="log-badge ${meta.cls}">${escHtml(meta.label)}</span>
        <div class="log-info">
          <span class="log-user">${escHtml(log.username)}</span>
          <span class="log-detail">${escHtml(log.detail)}</span>
        </div>
        <span class="log-time">${escHtml(time)}</span>
      </div>`;
    }).join('');
  } catch (err) {
    $('logs-body').innerHTML = `<div class="logs-empty">Failed to load logs: ${escHtml(err.message)}</div>`;
  }
}

