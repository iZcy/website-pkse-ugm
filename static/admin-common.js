// ── admin-common.js ──────────────────────────────────────────────────────────────────
// Shared core: state, utilities, image picker, Quill, modal, API, chart helpers, stat helpers, escHtml/stripHtml

// Everything that is shared across multiple admin pages.

let state = { periods: [], faqs: [], stats: [], periodGallery: [], globalSetting: null, periodAbout: null, global_stats: [] };

let statPreviewChart = null;

// ── Image Picker Component ───────────────────────────────────────────────────
// Creates a reusable image picker: drag-drop zone + file upload + URL input
const imagePickers = {};

function createImagePicker(containerId, opts = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const state = { url: opts.initialUrl || '', uploading: false };
  imagePickers[containerId] = state;

  container.innerHTML = `
    <div class="space-y-2">
      <div id="${containerId}-dropzone"
        class="img-picker p-4 text-center cursor-pointer transition relative"
        ondragover="pickerDragOver(event,'${containerId}')"
        ondragleave="pickerDragLeave('${containerId}')"
        ondrop="pickerDrop(event,'${containerId}')">
        <input type="file" id="${containerId}-file" accept="image/*"
          class="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          onchange="pickerFileChange(event,'${containerId}')">
        <div id="${containerId}-prompt" class="${state.url ? 'hidden' : ''}">
          <svg class="w-8 h-8 text-slate-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2v12a2 2 0 002 2z"/>
          </svg>
          <p class="text-sm text-slate-500">Klik atau seret gambar ke sini</p>
          <p class="text-xs text-slate-400 mt-1">PNG, JPG, GIF, WebP \u2014 maks 5 MB</p>
        </div>
        <div id="${containerId}-preview-wrap" class="${state.url ? '' : 'hidden'} relative">
          <img id="${containerId}-preview-img" src="${state.url}" alt="preview" class="img-picker-preview mx-auto">
          <button type="button" onclick="pickerClear('${containerId}')"
            class="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 z-10">\u2715</button>
        </div>
        <div id="${containerId}-uploading" class="hidden text-sm text-blue-600 py-2">
          <svg class="w-5 h-5 animate-spin inline mr-1" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
          Mengupload...
        </div>
      </div>
      <div class="flex gap-2 items-center">
        <span class="text-xs text-slate-400 whitespace-nowrap">atau URL:</span>
        <input type="text" id="${containerId}-url-input" value="${state.url}" placeholder="https://... atau /static/uploads/..." 
          class="flex-1 border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          oninput="pickerUrlInput('${containerId}', this.value)">
      </div>
    </div>`;
}

function pickerDragOver(e, id) {
  e.preventDefault();
  document.getElementById(id + '-dropzone').classList.add('dragover');
}
function pickerDragLeave(id) {
  document.getElementById(id + '-dropzone').classList.remove('dragover');
}
function pickerDrop(e, id) {
  e.preventDefault();
  document.getElementById(id + '-dropzone').classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file) pickerUpload(id, file);
}
function pickerFileChange(e, id) {
  const file = e.target.files[0];
  if (file) pickerUpload(id, file);
}
function pickerUrlInput(id, val) {
  imagePickers[id].url = val;
  const img = document.getElementById(id + '-preview-img');
  const wrap = document.getElementById(id + '-preview-wrap');
  const prompt = document.getElementById(id + '-prompt');
  if (val) {
    img.src = val;
    wrap.classList.remove('hidden');
    prompt.classList.add('hidden');
  } else {
    wrap.classList.add('hidden');
    prompt.classList.remove('hidden');
  }
}
async function pickerUpload(id, file) {
  const uploading = document.getElementById(id + '-uploading');
  const prompt = document.getElementById(id + '-prompt');
  const wrap = document.getElementById(id + '-preview-wrap');
  uploading.classList.remove('hidden');
  prompt.classList.add('hidden');
  wrap.classList.add('hidden');
  const fd = new FormData();
  fd.append('file', file);
  try {
    const r = await fetch('/api/cms/upload', { method: 'POST', body: fd });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || r.status);
    pickerSetUrl(id, j.url);
  } catch(ex) {
    uiAlert('Upload gagal: ' + ex.message);
    prompt.classList.remove('hidden');
  } finally {
    uploading.classList.add('hidden');
  }
}
function pickerSetUrl(id, url) {
  imagePickers[id].url = url;
  const img = document.getElementById(id + '-preview-img');
  const wrap = document.getElementById(id + '-preview-wrap');
  const prompt = document.getElementById(id + '-prompt');
  const urlInput = document.getElementById(id + '-url-input');
  img.src = url;
  wrap.classList.remove('hidden');
  prompt.classList.add('hidden');
  if (urlInput) urlInput.value = url;
  if (id === 'picker-logo' || id === 'picker-logo-university' || id === 'picker-logo-yayasan') renderGlobalPreview();
  if (id === 'picker-cover' || id === 'picker-struktur' || id === 'picker-logo-kabinet') renderTentangPreview();
}
function pickerClear(id) {
  imagePickers[id].url = '';
  const img = document.getElementById(id + '-preview-img');
  const wrap = document.getElementById(id + '-preview-wrap');
  const prompt = document.getElementById(id + '-prompt');
  const urlInput = document.getElementById(id + '-url-input');
  img.src = '';
  wrap.classList.add('hidden');
  prompt.classList.remove('hidden');
  if (urlInput) urlInput.value = '';
  const fileInput = document.getElementById(id + '-file');
  if (fileInput) fileInput.value = '';
  if (id === 'picker-logo' || id === 'picker-logo-university' || id === 'picker-logo-yayasan') renderGlobalPreview();
  if (id === 'picker-cover' || id === 'picker-struktur' || id === 'picker-logo-kabinet') renderTentangPreview();
}
function pickerGetUrl(id) {
  return imagePickers[id] ? imagePickers[id].url : '';
}

// ── Quill instances ──────────────────────────────────────────────────────────
const quills = {};
const toolbarOptions = [
  [{ header: [1, 2, 3, false] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ list: 'ordered' }, { list: 'bullet' }, { indent: '-1' }, { indent: '+1' }],
  ['link', 'blockquote'],
  [{ align: [] }],
  ['clean']
];
const toolbarFull = [
  [{ header: [1, 2, 3, false] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ list: 'ordered' }, { list: 'bullet' }, { indent: '-1' }, { indent: '+1' }],
  ['link', 'blockquote'],
  [{ align: [] }],
  ['clean']
];

function initQuill(id, toolbar) {
  if (quills[id]) return quills[id];
  const el = document.getElementById(id);
  if (!el) return null;
  quills[id] = new Quill('#' + id, {
    theme: 'snow',
    modules: {
      toolbar: toolbar || toolbarOptions,
      imageDrop: false,
      clipboard: { matchVisual: false }
    }
  });
  quills[id].getModule('toolbar').addHandler('image', function() {});
  return quills[id];
}
function quillGetHTML(id) {
  const q = quills[id];
  if (!q) return '';
  const html = q.root.innerHTML;
  return html === '<p><br></p>' ? '' : html;
}
function quillSetHTML(id, html) {
  const q = quills[id];
  if (!q) return;
  if (!html) { q.setContents([]); return; }
  q.root.innerHTML = html;
}

// ── Modal helpers ────────────────────────────────────────────────────────────
function openModal(id) { document.getElementById(id)?.classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id)?.classList.add('hidden'); }

let actionModalResolver = null;

function toUiMessage(errLike) {
  if (typeof errLike === 'string') return errLike;
  if (errLike && typeof errLike.message === 'string') return errLike.message;
  try { return JSON.stringify(errLike); } catch (_) { return String(errLike); }
}

function uiActionModal(opts = {}) {
  const { title = 'Konfirmasi', message = '', confirmText = 'OK', cancelText = 'Batal', showCancel = false, danger = false } = opts;
  const modal = document.getElementById('modalAction');
  const titleEl = document.getElementById('modalActionTitle');
  const msgEl = document.getElementById('modalActionMessage');
  const btnOk = document.getElementById('modalActionOk');
  const btnCancel = document.getElementById('modalActionCancel');
  if (!modal || !titleEl || !msgEl || !btnOk || !btnCancel) return Promise.resolve(showCancel ? true : undefined);
  titleEl.textContent = title;
  msgEl.innerHTML = toUiMessage(message);
  btnOk.textContent = confirmText;
  btnCancel.textContent = cancelText;
  btnCancel.classList.toggle('hidden', !showCancel);
  btnOk.classList.toggle('bg-red-600', !!danger);
  btnOk.classList.toggle('hover:bg-red-700', !!danger);
  btnOk.classList.toggle('bg-blue-600', !danger);
  btnOk.classList.toggle('hover:bg-blue-700', !danger);
  openModal('modalAction');
  return new Promise(resolve => {
    actionModalResolver = resolve;
    btnOk.onclick = () => { closeModal('modalAction'); actionModalResolver = null; resolve(showCancel ? true : undefined); };
    btnCancel.onclick = () => { closeModal('modalAction'); actionModalResolver = null; resolve(false); };
    modal.onclick = (e) => { if (e.target === modal) { closeModal('modalAction'); actionModalResolver = null; resolve(showCancel ? false : undefined); } };
  });
}

async function uiAlert(message, title = 'Informasi') {
  await uiActionModal({ title, message, confirmText: 'OK', showCancel: false });
}

async function uiConfirm(message, title = 'Konfirmasi', danger = false) {
  return uiActionModal({ title, message, confirmText: danger ? 'Ya, lanjutkan' : 'Ya', cancelText: 'Batal', showCancel: true, danger });
}

// ── Generic fetch ────────────────────────────────────────────────────────────
async function api(method, url, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(url, opts);
  if (!r.ok) { const e = await r.json().catch(() => ({error: r.status})); throw new Error(e.error || r.status); }
  return r.json().catch(() => ({}));
}

// ── Utility functions ─────────────────────────────────────────────────────────
function errHtml(e) { return `<div class="bg-red-50 text-red-700 rounded-lg p-4 text-sm border border-red-200">${e}</div>`; }
function emptyHtml(msg) { return `<div class="text-center py-12 text-slate-400"><p>${msg}</p></div>`; }
function currentPeriod() { return window.PERIOD || ''; }

function escHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripHtml(html) {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

// ── Chart/Stat helpers (shared by statistik & global-stats pages) ─────────────
const CHART_CHOICES = [
  { value: 'bar', label: 'Bar' },
  { value: 'line', label: 'Line' },
  { value: 'pie', label: 'Pie' },
  { value: 'doughnut', label: 'Doughnut' },
  { value: 'area', label: 'Area' },
  { value: 'radar', label: 'Radar' },
  { value: 'scatter', label: 'Scatter' },
  { value: 'bubble', label: 'Bubble' },
  { value: 'polar', label: 'Polar' },
  { value: 'histogram', label: 'Histogram' },
  { value: 'stacked_bar', label: 'Stacked Bar' },
  { value: 'grouped_bar', label: 'Grouped Bar' },
  { value: 'funnel', label: 'Funnel' },
  { value: 'heatmap', label: 'Heatmap' },
  { value: 'kpi', label: 'KPI Card' },
  { value: 'table', label: 'Table' }
];

function chartPreviewSVG(type) {
  const s = {
    bar: '<svg viewBox="0 0 100 56" class="w-full h-10"><rect x="8" y="28" width="14" height="20" rx="2" fill="#2563eb"/><rect x="30" y="20" width="14" height="28" rx="2" fill="#60a5fa"/><rect x="52" y="12" width="14" height="36" rx="2" fill="#93c5fd"/><rect x="74" y="24" width="14" height="24" rx="2" fill="#1d4ed8"/></svg>',
    line: '<svg viewBox="0 0 100 56" class="w-full h-10"><polyline points="6,40 24,30 42,34 60,16 78,22 94,10" fill="none" stroke="#2563eb" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="24" cy="30" r="2.5" fill="#60a5fa"/><circle cx="60" cy="16" r="2.5" fill="#60a5fa"/></svg>',
    pie: '<svg viewBox="0 0 100 56" class="w-full h-10"><circle cx="50" cy="28" r="18" fill="#dbeafe"/><path d="M50 28 L50 10 A18 18 0 0 1 66.5 35 Z" fill="#2563eb"/><path d="M50 28 L66.5 35 A18 18 0 0 1 36 41 Z" fill="#60a5fa"/></svg>',
    doughnut: '<svg viewBox="0 0 100 56" class="w-full h-10"><circle cx="50" cy="28" r="18" fill="none" stroke="#dbeafe" stroke-width="10"/><circle cx="50" cy="28" r="18" fill="none" stroke="#2563eb" stroke-width="10" stroke-dasharray="72 44" transform="rotate(-90 50 28)"/></svg>',
    area: '<svg viewBox="0 0 100 56" class="w-full h-10"><path d="M6 44 L24 30 L42 34 L60 16 L78 22 L94 12 L94 48 L6 48 Z" fill="#bfdbfe"/><polyline points="6,44 24,30 42,34 60,16 78,22 94,12" fill="none" stroke="#2563eb" stroke-width="2.5"/></svg>',
    radar: '<svg viewBox="0 0 100 56" class="w-full h-10"><polygon points="50,10 68,20 64,40 36,40 32,20" fill="#dbeafe" stroke="#93c5fd"/><polygon points="50,16 62,23 58,35 42,35 38,23" fill="#60a5fa" fill-opacity="0.55" stroke="#2563eb"/></svg>',
    scatter: '<svg viewBox="0 0 100 56" class="w-full h-10"><circle cx="16" cy="38" r="3" fill="#2563eb"/><circle cx="30" cy="28" r="3" fill="#60a5fa"/><circle cx="44" cy="34" r="3" fill="#3b82f6"/><circle cx="58" cy="18" r="3" fill="#1d4ed8"/><circle cx="72" cy="24" r="3" fill="#93c5fd"/><circle cx="86" cy="14" r="3" fill="#2563eb"/></svg>',
    bubble: '<svg viewBox="0 0 100 56" class="w-full h-10"><circle cx="22" cy="34" r="7" fill="#93c5fd"/><circle cx="44" cy="26" r="10" fill="#60a5fa"/><circle cx="66" cy="20" r="13" fill="#3b82f6"/><circle cx="82" cy="30" r="8" fill="#1d4ed8"/></svg>',
    polar: '<svg viewBox="0 0 100 56" class="w-full h-10"><circle cx="50" cy="28" r="18" fill="none" stroke="#cbd5e1"/><path d="M50 28 L50 10 A18 18 0 0 1 66 34 Z" fill="#2563eb"/><path d="M50 28 L66 34 A18 18 0 0 1 38 44 Z" fill="#60a5fa"/><path d="M50 28 L38 44 A18 18 0 0 1 32 18 Z" fill="#93c5fd"/></svg>',
    histogram: '<svg viewBox="0 0 100 56" class="w-full h-10"><rect x="10" y="30" width="11" height="18" fill="#bfdbfe"/><rect x="21" y="22" width="11" height="26" fill="#93c5fd"/><rect x="32" y="16" width="11" height="32" fill="#60a5fa"/><rect x="43" y="12" width="11" height="36" fill="#3b82f6"/><rect x="54" y="18" width="11" height="30" fill="#2563eb"/><rect x="65" y="26" width="11" height="22" fill="#1d4ed8"/><rect x="76" y="32" width="11" height="16" fill="#1e40af"/></svg>',
    stacked_bar: '<svg viewBox="0 0 100 56" class="w-full h-10"><rect x="12" y="12" width="14" height="16" fill="#93c5fd"/><rect x="12" y="28" width="14" height="20" fill="#2563eb"/><rect x="38" y="18" width="14" height="14" fill="#93c5fd"/><rect x="38" y="32" width="14" height="16" fill="#2563eb"/><rect x="64" y="10" width="14" height="22" fill="#93c5fd"/><rect x="64" y="32" width="14" height="16" fill="#2563eb"/></svg>',
    grouped_bar: '<svg viewBox="0 0 100 56" class="w-full h-10"><rect x="10" y="24" width="8" height="24" fill="#2563eb"/><rect x="20" y="30" width="8" height="18" fill="#93c5fd"/><rect x="38" y="18" width="8" height="30" fill="#2563eb"/><rect x="48" y="24" width="8" height="24" fill="#93c5fd"/><rect x="66" y="14" width="8" height="34" fill="#2563eb"/><rect x="76" y="20" width="8" height="28" fill="#93c5fd"/></svg>',
    funnel: '<svg viewBox="0 0 100 56" class="w-full h-10"><polygon points="12,12 88,12 74,22 26,22" fill="#2563eb"/><polygon points="26,24 74,24 64,34 36,34" fill="#60a5fa"/><polygon points="36,36 64,36 57,46 43,46" fill="#93c5fd"/></svg>',
    heatmap: '<svg viewBox="0 0 100 56" class="w-full h-10"><rect x="10" y="12" width="16" height="12" fill="#dbeafe"/><rect x="28" y="12" width="16" height="12" fill="#93c5fd"/><rect x="46" y="12" width="16" height="12" fill="#60a5fa"/><rect x="64" y="12" width="16" height="12" fill="#1d4ed8"/><rect x="10" y="26" width="16" height="12" fill="#93c5fd"/><rect x="28" y="26" width="16" height="12" fill="#60a5fa"/><rect x="46" y="26" width="16" height="12" fill="#2563eb"/><rect x="64" y="26" width="16" height="12" fill="#3b82f6"/><rect x="10" y="40" width="16" height="6" fill="#dbeafe"/><rect x="28" y="40" width="16" height="6" fill="#bfdbfe"/><rect x="46" y="40" width="16" height="6" fill="#93c5fd"/><rect x="64" y="40" width="16" height="6" fill="#60a5fa"/></svg>',
    kpi: '<svg viewBox="0 0 100 56" class="w-full h-10"><rect x="14" y="14" width="72" height="28" rx="6" fill="#eff6ff" stroke="#93c5fd"/><text x="50" y="31" text-anchor="middle" font-size="11" font-family="Arial, sans-serif" fill="#1d4ed8">92%</text></svg>',
    table: '<svg viewBox="0 0 100 56" class="w-full h-10"><rect x="10" y="12" width="80" height="32" rx="3" fill="#ffffff" stroke="#93c5fd"/><line x1="10" y1="23" x2="90" y2="23" stroke="#cbd5e1"/><line x1="10" y1="34" x2="90" y2="34" stroke="#cbd5e1"/><line x1="38" y1="12" x2="38" y2="44" stroke="#cbd5e1"/><line x1="64" y1="12" x2="64" y2="44" stroke="#cbd5e1"/></svg>'
  };
  return s[type] || s.bar;
}

function renderChartChoices(selectedValue = 'bar', readOnly = false) {
  const wrap = document.getElementById('stat-chart-options');
  if (!wrap) return;
  const current = selectedValue || 'bar';
  const typeInput = document.getElementById('stat-chart-type');
  if (typeInput) typeInput.value = current;
  wrap.innerHTML = CHART_CHOICES.map(c => {
    const active = c.value === current;
    return `<button type="button" ${readOnly ? 'disabled' : ''} class="chart-choice border rounded-lg p-2 text-xs font-medium transition text-left ${readOnly ? 'opacity-50 cursor-not-allowed ' : ''}${active ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}" data-chart-value="${c.value}">
      <div class="rounded-md border ${active ? 'border-blue-300 bg-blue-500/10' : 'border-slate-200 bg-slate-50'} p-1.5 mb-1 overflow-hidden">${chartPreviewSVG(c.value)}</div>
      <div class="truncate">${c.label}</div>
    </button>`;
  }).join('');
  const currentRaw = document.getElementById('stat-value')?.value || '';
  if (typeof renderStatValueInput === 'function') renderStatValueInput(current, currentRaw);
  if (typeof renderStatPreview === 'function') renderStatPreview(current, currentRaw);
}

function statChartMode(chartType) {
  if (['scatter', 'bubble', 'heatmap'].includes(chartType)) return 'xy';
  if (['stacked_bar', 'grouped_bar', 'funnel'].includes(chartType)) return 'series';
  if (['line', 'area', 'bar', 'histogram'].includes(chartType)) return 'series';
  return 'simple';
}

function statRowInputTemplate(mode, idx, row = {}) {
  if (mode === 'xy') {
    return `<div class="stat-row flex gap-2 items-center p-2 bg-slate-50 rounded-lg mb-2">
      <button type="button" data-remove-series class="text-red-500 hover:text-red-700 mr-1"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
      <input type="text" data-xy-x placeholder="Label" value="${escHtml(row.x || '')}" class="flex-1 border border-slate-300 rounded px-2 py-1 text-xs">
      <input type="number" data-xy-y placeholder="Nilai" value="${row.y ?? ''}" class="w-24 border border-slate-300 rounded px-2 py-1 text-xs">
    </div>`;
  }
  return `<div class="stat-row flex gap-2 items-center p-2 bg-slate-50 rounded-lg mb-2">
    <button type="button" data-remove-series class="text-red-500 hover:text-red-700 mr-1"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
    <input type="text" data-series-label placeholder="Label" value="${escHtml(row.label || '')}" class="flex-1 border border-slate-300 rounded px-2 py-1 text-xs">
    <input type="number" data-series-value placeholder="Nilai" value="${row.value ?? ''}" class="w-24 border border-slate-300 rounded px-2 py-1 text-xs">
  </div>`;
}

function collectStatInputValue(chartType) {
  const mode = statChartMode(chartType);
  const list = document.getElementById('stat-series-list');
  if (!list) return '';
  const rows = list.querySelectorAll('.stat-row');
  if (mode === 'xy') {
    const data = [];
    rows.forEach(r => {
      const x = r.querySelector('[data-xy-x]')?.value || '';
      const y = parseFloat(r.querySelector('[data-xy-y]')?.value) || 0;
      if (x) data.push({ x, y });
    });
    return JSON.stringify(data);
  }
  const data = [];
  rows.forEach(r => {
    const label = r.querySelector('[data-series-label]')?.value || '';
    const value = parseFloat(r.querySelector('[data-series-value]')?.value) || 0;
    if (label) data.push({ label, value });
  });
  return JSON.stringify(data);
}

function renderStatValueInput(chartType, rawValue = '') {
  const wrap = document.getElementById('stat-value-input-wrap');
  if (!wrap) return;
  const mode = statChartMode(chartType);
  let rows = [];
  try { rows = JSON.parse(rawValue || '[]'); if (!Array.isArray(rows)) rows = []; } catch(_) { rows = []; }
  if (rows.length === 0) rows = [{}];
  const html = `<div class="space-y-2">
    <div id="stat-series-list" class="max-h-48 overflow-y-auto">
      ${rows.map((r, i) => statRowInputTemplate(mode, i, r)).join('')}
    </div>
    <button type="button" id="btn-add-series" class="text-xs text-blue-600 hover:text-blue-800">+ Tambah baris</button>
  </div>`;
  wrap.innerHTML = html;
}

function statValuePreview(raw, chartType) {
  try {
    const data = JSON.parse(raw || '[]');
    if (!Array.isArray(data) || data.length === 0) return '-';
    if (chartType === 'kpi') return data[0]?.value ?? data[0]?.y ?? '-';
    return data.map(d => `${d.label || d.x}: ${d.value ?? d.y ?? 0}`).join(', ');
  } catch(_) { return '-'; }
}

function buildPreviewDataset(chartType, rawValue) {
  let data = [];
  try { data = JSON.parse(rawValue || '[]'); if (!Array.isArray(data)) data = []; } catch(_) {}
  const labels = data.map(d => d.label || d.x || '');
  const values = data.map(d => d.value ?? d.y ?? 0);
  return { labels, datasets: [{ label: 'Data', data: values, backgroundColor: ['#2563eb', '#60a5fa', '#93c5fd', '#1d4ed8', '#3b82f6'], borderColor: '#2563eb', fill: chartType === 'area' }] };
}

function renderStatPreview(chartType, rawValue) {
  const canvas = document.getElementById('stat-preview-chart');
  if (!canvas) return;
  if (statPreviewChart) { statPreviewChart.destroy(); statPreviewChart = null; }
  if (chartType === 'kpi' || chartType === 'table' || chartType === 'heatmap' || chartType === 'funnel') {
    const wrap = canvas.parentElement;
    if (wrap) wrap.innerHTML = `<div class="text-center py-4 text-slate-500">Preview: ${chartType.toUpperCase()}</div>`;
    return;
  }
  const ctx = canvas.getContext('2d');
  const ds = buildPreviewDataset(chartType, rawValue);
  const config = {
    type: chartType === 'area' ? 'line' : chartType,
    data: ds,
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: {} }
  };
  if (chartType === 'area') config.options.scales = { y: { beginAtZero: true } };
  statPreviewChart = new Chart(ctx, config);
}

