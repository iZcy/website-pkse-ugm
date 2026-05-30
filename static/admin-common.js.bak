
let state = { periods: [], faqs: [], stats: [], periodGallery: [], globalSetting: null, periodAbout: null };

// ── Pagination & Search Helpers ──────────────────────────────────────────
var _searchTimers = {};
function debounceSearch(key, fn, delay) { delay = delay || 350; if (_searchTimers[key]) clearTimeout(_searchTimers[key]); _searchTimers[key] = setTimeout(fn, delay); }
function pagHTML(key, page, pages) {
  if (pages <= 1) return '<div class="text-xs text-slate-400 py-2 text-center" id="pag-' + key + '">Menampilkan semua data</div>';
  var h = '<div class="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50" id="pag-' + key + '"><span class="text-xs text-slate-500">Halaman ' + page + ' dari ' + pages + '</span><div class="flex items-center gap-1">';
  h += pagBtn(key, Math.max(1, page-1), page, '&laquo;');
  var s = Math.max(1, page-2), e = Math.min(pages, page+2);
  if (s > 1) h += '<span class="px-1 text-xs text-slate-400">...</span>';
  for (var i = s; i <= e; i++) h += pagBtn(key, i, page, ''+i);
  if (e < pages) h += '<span class="px-1 text-xs text-slate-400">...</span>';
  h += pagBtn(key, Math.min(pages, page+1), page, '&raquo;');
  h += '</div></div>'; return h;
}
function pagBtn(key, t, c, l) { return t===c ? '<span class="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-600 text-white text-xs font-medium">'+l+'</span>' : '<button onclick="'+key+'GoPage('+t+')" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-200 text-slate-700 text-xs font-medium transition">'+l+'</button>'; }


const allowed = new Set(['pengumuman','artikel','departemen','program','anggota','periode','akun','global','tentang','broadcast','galeri','shortlink','faq-global','global-stats','statistik']);

let statPreviewChart = null;

function _selectedSectionFromURL_DEPRECATED() {
  const section = new URLSearchParams(window.location.search).get('section') || 'pengumuman';
  return allowed.has(section) ? section : 'pengumuman';
}

function _syncPeriodSwitcherRouteSection_DEPRECATED() {
  const hidden = document.getElementById('period-route-section');
  if (!hidden) return;
  hidden.value = selectedSectionFromURL();
}

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
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
          <p class="text-sm text-slate-500">Klik atau seret gambar ke sini</p>
          <p class="text-xs text-slate-400 mt-1">PNG, JPG, GIF, WebP — maks 5 MB</p>
        </div>
        <div id="${containerId}-preview-wrap" class="${state.url ? '' : 'hidden'} relative">
          <img id="${containerId}-preview-img" src="${state.url}" alt="preview" class="img-picker-preview mx-auto">
          <button type="button" onclick="pickerClear('${containerId}')"
            class="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 z-10">✕</button>
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
  if (!document.getElementById(id)) return null;
  quills[id] = new Quill('#' + id, {
    theme: 'snow',
    modules: {
      toolbar: toolbar || toolbarOptions,
      imageDrop: false,
      clipboard: { matchVisual: false }
    }
  });
  // Disable Quill's built-in image handler that shows "please enter a URL" prompt
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

// ── Tab switching ────────────────────────────────────────────────────────────
function _switchTab_DEPRECATED(name) {
  const target = document.getElementById('tab-' + name);
  if (!target) {
    name = 'pengumuman';
  }
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  const btn = document.getElementById('tab-btn-' + name);
  if (btn) btn.classList.add('active');
  const hidden = document.getElementById('period-route-section');
  if (hidden) hidden.value = name;
  loadTab(name);
}

function _loadTab_DEPRECATED(name) {
  if (name === 'pengumuman') loadPengumuman();
  if (name === 'artikel') loadArtikel();
  if (name === 'departemen') loadKementerian();
  if (name === 'program') loadPrograms();
  if (name === 'anggota') loadAnggota();
  if (name === 'periode') loadPeriode();
  if (name === 'akun') loadAkun();
  if (name === 'global') loadGlobal();
  if (name === 'tentang') loadTentang();
  if (name === 'broadcast') initBroadcast();
  if (name === 'galeri') loadGaleri();
  if (name === 'shortlink') loadShortlinks();
  
  if (name === 'faq-global') loadFAQs('GLOBAL');
  if (name === 'global-stats') loadGlobalStatsTab();
  if (name === 'statistik' && currentPeriod()) {
    // Load templates first, then statistics
    loadGlobalStatsTab().then(() => loadStatistik());
  }

}

// ── Shortlink ───────────────────────────────────────────────────────────────
function shortlinkURL(code) {
  return `${window.location.origin}/l/${encodeURIComponent(code || '')}`;
}

function loadShortlinks(page, search) {
  page = page || (state._slPage || 1); search = search !== undefined ? search : (state._slSearch || '');
  state._slPage = page; state._slSearch = search;
  const tb = document.getElementById('shortlink-tbody');
  if (!tb) return;
  api('GET', '/api/cms/shortlinks?page=' + page + '&per_page=20&search=' + encodeURIComponent(search)).then(function(data) {
    var rows = data.items || [];
    if (!rows.length) { tb.innerHTML = '<tr><td colspan="4" class="p-6 text-center text-slate-400">Belum ada short link.</td></tr>'; }
    else {
      tb.innerHTML = rows.map(function(row) {
        return '<tr class="border-b border-slate-100 hover:bg-slate-50"><td class="p-4 align-top font-medium text-slate-700">' + escHtml(row.label || '-') + '</td><td class="p-4 align-top"><a href="' + escHtml(shortlinkURL(row.code)) + '" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline break-all">' + escHtml(shortlinkURL(row.code)) + '</a></td><td class="p-4 align-top text-slate-600 break-all">' + escHtml(row.target_url || '') + '</td><td class="p-4 align-top text-right whitespace-nowrap"><button onclick="copyShortlink(\'' + (shortlinkURL(row.code)).replace(/'/g, "&#39;") + '\')" class="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1 rounded mr-1">Copy</button><button onclick="deleteShortlink(\'' + (row.id || '') + '\')" class="text-xs bg-red-50 hover:bg-red-100 text-red-700 px-2 py-1 rounded">Hapus</button></td></tr>';
      }).join('');
    }
    var pagEl = document.getElementById('shortlink-pagination'); if (pagEl) pagEl.innerHTML = pagHTML('shortlink', data.page, data.pages);
  }).catch(function(ex) { tb.innerHTML = '<tr><td colspan="4" class="p-6">' + errHtml(toUiMessage(ex)) + '</td></tr>'; });
}
window.shortlinkGoPage = function(p) { loadShortlinks(p); };
window.shortlinkSearch = function(s) { debounceSearch('shortlink', function() { loadShortlinks(1, s); }); };

async function createShortlink(targetURL, label, code) {
  const body = {
    target_url: targetURL,
    label: label || '',
    code: code || ''
  };
  const created = await api('POST', '/api/cms/shortlinks', body);
  loadShortlinks(1);
  return shortlinkURL(created.code || '');
}

async function copyShortlink(url) {
  try {
    await navigator.clipboard.writeText(url);
    uiAlert('Short link berhasil disalin.');
  } catch (_) {
    uiAlert('Gagal menyalin short link.');
  }
}

async function deleteShortlink(id) {
  if (!id) return;
  if (!await uiConfirm('Hapus short link ini?', 'Konfirmasi')) return;
  try {
    await api('DELETE', '/api/cms/shortlinks/' + id);
    loadShortlinks(1);
  } catch (ex) {
    uiAlert(ex);
  }
}

async function clearShortlinks() {
  if (!await uiConfirm('Bersihkan seluruh riwayat short link?', 'Konfirmasi')) return;
  try {
    await api('DELETE', '/api/cms/shortlinks?all=1');
    loadShortlinks(1);
  } catch (ex) {
    uiAlert(ex);
  }
}

// ── Modal helpers ────────────────────────────────────────────────────────────
function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

let actionModalResolver = null;

function toUiMessage(errLike) {
  if (typeof errLike === 'string') return errLike;
  if (errLike && typeof errLike.message === 'string') return errLike.message;
  try {
    return JSON.stringify(errLike);
  } catch (_) {
    return String(errLike);
  }
}

function uiActionModal(opts = {}) {
  const {
    title = 'Konfirmasi',
    message = '',
    confirmText = 'OK',
    cancelText = 'Batal',
    showCancel = false,
    danger = false
  } = opts;

  const modal = document.getElementById('modalAction');
  const titleEl = document.getElementById('modalActionTitle');
  const msgEl = document.getElementById('modalActionMessage');
  const btnOk = document.getElementById('modalActionOk');
  const btnCancel = document.getElementById('modalActionCancel');
  // Ensure modal doesn't hit browser edges
  if (modal) {
    modal.classList.add('my-4');
    var inner = modal.querySelector(':scope > div');
    if (inner) { inner.classList.add('my-auto', 'max-h-[90vh]', 'overflow-y-auto'); }
  }
  if (!modal || !titleEl || !msgEl || !btnOk || !btnCancel) {
    return Promise.resolve(showCancel ? true : undefined);
  }

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
    btnOk.onclick = () => {
      closeModal('modalAction');
      actionModalResolver = null;
      resolve(showCancel ? true : undefined);
    };
    btnCancel.onclick = () => {
      closeModal('modalAction');
      actionModalResolver = null;
      resolve(false);
    };
    modal.onclick = (e) => {
      if (e.target === modal) {
        closeModal('modalAction');
        actionModalResolver = null;
        resolve(showCancel ? false : undefined);
      }
    };
  });
}

async function uiAlert(message, title = 'Informasi') {
  await uiActionModal({ title, message, confirmText: 'OK', showCancel: false });
}

async function uiConfirm(message, title = 'Konfirmasi', danger = false) {
  return uiActionModal({ title, message, confirmText: danger ? 'Ya, lanjutkan' : 'Ya', cancelText: 'Batal', showCancel: true, danger });
}

function uiPrompt(message, defaultVal) {
  var result = null;
  var overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 bg-black/40 z-[90] flex items-center justify-center p-4 my-4';
  overlay.innerHTML = '<div class="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden my-auto max-h-[90vh] overflow-y-auto">' +
    '<div class="p-5 border-b border-slate-200"><h3 class="text-base font-bold text-slate-800">' + escHtml(message || 'Input') + '</h3></div>' +
    '<div class="p-5"><input type="text" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none" value="' + escHtml(defaultVal || '') + '"></div>' +
    '<div class="px-5 pb-5 flex justify-end gap-3">' +
    '<button id="uiPromptCancel" class="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition">Batal</button>' +
    '<button id="uiPromptOk" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">OK</button>' +
    '</div></div>';
  document.body.appendChild(overlay);
  var input = overlay.querySelector('input');
  setTimeout(function() { input.focus(); input.select(); }, 50);
  return new Promise(function(resolve) {
    function cleanup() { document.body.removeChild(overlay); }
    function doOk() { result = input.value; cleanup(); resolve(result); }
    function doCancel() { result = null; cleanup(); resolve(null); }
    overlay.querySelector('#uiPromptOk').onclick = doOk;
    overlay.querySelector('#uiPromptCancel').onclick = doCancel;
    input.addEventListener('keydown', function(e) { if (e.key === 'Enter') doOk(); if (e.key === 'Escape') doCancel(); });
    overlay.addEventListener('click', function(e) { if (e.target === overlay) doCancel(); });
  });
}

// ── Generic fetch ────────────────────────────────────────────────────────────
async function api(method, url, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(url, opts);
  if (!r.ok) { const e = await r.json().catch(() => ({error: r.status})); throw new Error(e.error || r.status); }
  return r.json().catch(() => ({}));
}

function errHtml(e) { return `<div class="bg-red-50 text-red-700 rounded-lg p-4 text-sm border border-red-200">${e}</div>`; }

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
  document.getElementById('stat-chart-type').value = current;
  wrap.innerHTML = CHART_CHOICES.map(c => {
    const active = c.value === current;
    return `<button type="button" ${readOnly ? 'disabled' : ''} class="chart-choice border rounded-lg p-2 text-xs font-medium transition text-left ${readOnly ? 'opacity-50 cursor-not-allowed ' : ''}${active ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}" data-chart-value="${c.value}">
      <div class="rounded-md border ${active ? 'border-blue-300 bg-blue-500/10' : 'border-slate-200 bg-slate-50'} p-1.5 mb-1 overflow-hidden">${chartPreviewSVG(c.value)}</div>
      <div class="truncate">${c.label}</div>
    </button>`;
  }).join('');
  const currentRaw = document.getElementById('stat-value')?.value || '';
  renderStatValueInput(current, currentRaw);
  renderStatPreview(current, currentRaw);
}

document.addEventListener('click', e => {
  const addGalleryBtn = e.target.closest('#btn-add-gallery-item');
  if (addGalleryBtn) {
    state.periodGallery.push({ title: '', caption: '', image_url: '', order: state.periodGallery.length });
    renderTentangGalleryEditor(state.periodGallery);
    return;
  }
  const removeGalleryBtn = e.target.closest('[data-remove-gallery]');
  if (removeGalleryBtn) {
    const idx = Number(removeGalleryBtn.getAttribute('data-remove-gallery'));
    if (!Number.isNaN(idx)) {
      state.periodGallery.splice(idx, 1);
      renderTentangGalleryEditor(state.periodGallery);
    }
    return;
  }
  const addSeriesBtn = e.target.closest('#btn-add-series');
  if (addSeriesBtn) {
    const chartType = document.getElementById('stat-chart-type')?.value || 'bar';
    const mode = statChartMode(chartType) === 'xy' ? 'xy' : 'series';
    const list = document.getElementById('stat-series-list');
    if (list) {
      const nextIdx = list.querySelectorAll('.stat-row').length;
      list.insertAdjacentHTML('beforeend', statRowInputTemplate(mode, nextIdx, {}));
      renderStatPreview(chartType, collectStatInputValue(chartType));
    }
    return;
  }
  const removeSeriesBtn = e.target.closest('[data-remove-series]');
  if (removeSeriesBtn) {
    const row = removeSeriesBtn.closest('.stat-row');
    if (row) row.remove();
    const chartType = document.getElementById('stat-chart-type')?.value || 'bar';
    try {
      renderStatPreview(chartType, collectStatInputValue(chartType));
    } catch (_) {
      renderStatPreview(chartType, '');
    }
    return;
  }
  const btn = e.target.closest('.chart-choice');
  if (!btn) return;
  const value = btn.getAttribute('data-chart-value') || 'bar';
  renderChartChoices(value);
});

function currentPeriod() {
    return window.customPeriodOverride || "{{.SelectedPeriod}}";
}
function emptyHtml(msg) { return `<div class="text-center py-12 text-slate-400"><p>${msg}</p></div>`; }

function periodSubPeriods(period) {
  const src = Array.isArray(period?.sub_periods) ? period.sub_periods : [];
  const cleaned = src.map(s => (s || '').trim()).filter(Boolean);
  return cleaned.length ? cleaned : ['Gelombang 1'];
}

// ── PENGUMUMAN ───────────────────────────────────────────────────────────────
function loadPengumuman(page, search) {
  page = page || (state._pengumumanPage || 1); search = search !== undefined ? search : (state._pengumumanSearch || '');
  state._pengumumanPage = page; state._pengumumanSearch = search;
  const el = document.getElementById('list-pengumuman');
  if (!el) return;
  api('GET', `/api/cms/announcements?period=${PERIOD}&page=` + page + '&per_page=20&search=' + encodeURIComponent(search)).then(function(data) {
    var items = data.items || [];
    state.pengumuman = items;
    if (!items.length) { el.innerHTML = emptyHtml('Tidak ada data'); return; }
    el.innerHTML = items.map(a => `
      <div class="bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex items-start justify-between gap-4">
        <div class="flex items-start gap-4 flex-1 min-w-0">
          ${a.image_url ? `<img src="${a.image_url}" alt="" class="w-16 h-12 object-cover rounded-lg flex-shrink-0">` : ''}
          <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <h3 class="font-semibold text-slate-800">${escHtml(a.title)}</h3>
            <span class="text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${a.published ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}">${a.published ? 'Terbit' : 'Draft'}</span>
          </div>
          <p class="text-slate-500 text-sm line-clamp-2">${stripHtml(a.content)}</p>
          </div>
        </div>
        <div class="flex gap-2 flex-shrink-0">
          <button onclick='editPengumuman(${JSON.stringify(a)})' class="text-blue-600 hover:text-blue-800 p-1" title="Edit">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          </button>
          <button onclick="deletePengumuman('${a.id}')" class="text-red-400 hover:text-red-600 p-1" title="Hapus">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
      </div>`).join('');
    var pagEl = document.getElementById('pengumuman-pagination'); if (pagEl) pagEl.innerHTML = pagHTML('pengumuman', data.page, data.pages);
  }).catch(function(e) { el.innerHTML = errHtml(e.message); });
}
window.pengumumanGoPage = function(p) { loadPengumuman(p); };
window.pengumumanSearch = function(s) { debounceSearch('pengumuman', function() { loadPengumuman(1, s); }); };

function openPengumumanModal() {
  document.getElementById('pengumuman-id').value = '';
  document.getElementById('pengumuman-title').value = '';
  document.getElementById('pengumuman-published').checked = false;
  document.getElementById('modalPengumumanTitle').textContent = 'Tambah Pengumuman';
  initQuill('editor-pengumuman');
  quillSetHTML('editor-pengumuman', '');
  createImagePicker('picker-pengumuman-image');
  openModal('modalPengumuman');
}

function editPengumuman(a) {
  document.getElementById('pengumuman-id').value = a.id;
  document.getElementById('pengumuman-title').value = a.title;
  document.getElementById('pengumuman-published').checked = a.published;
  document.getElementById('modalPengumumanTitle').textContent = 'Edit Pengumuman';
  initQuill('editor-pengumuman');
  quillSetHTML('editor-pengumuman', a.content || '');
  createImagePicker('picker-pengumuman-image', { initialUrl: a.image_url || '' });
  openModal('modalPengumuman');
}

async function submitPengumuman() {
  const id = document.getElementById('pengumuman-id').value;
  const body = {
    title: document.getElementById('pengumuman-title').value,
    content: quillGetHTML('editor-pengumuman'),
    image_url: pickerGetUrl('picker-pengumuman-image'),
    published: document.getElementById('pengumuman-published').checked,
    period_label: PERIOD
  };
  if (!body.title) { uiAlert('Judul harus diisi'); return; }
  try {
    if (id) await api('PUT', `/api/cms/announcements/${id}`, body);
    else await api('POST', '/api/cms/announcements', body);
    closeModal('modalPengumuman');
    loadPengumuman(1);
  } catch(ex) { uiAlert('Error: ' + ex.message); }
}

async function deletePengumuman(id) {
  if (!await uiConfirm('Hapus pengumuman ini?', 'Konfirmasi Hapus', true)) return;
  await api('DELETE', `/api/cms/announcements/${id}`);
  loadPengumuman(1);
}

// ── ARTIKEL ──────────────────────────────────────────────────────────────────
function loadArtikel(page, search) {
  page = page || (state._artikelPage || 1); search = search !== undefined ? search : (state._artikelSearch || '');
  state._artikelPage = page; state._artikelSearch = search;
  const el = document.getElementById('list-artikel');
  if (!el) return;
  api('GET', `/api/cms/articles?period=${PERIOD}&page=` + page + '&per_page=20&search=' + encodeURIComponent(search)).then(function(data) {
    var items = data.items || [];
    state.artikel = items;
    if (!items.length) { el.innerHTML = emptyHtml('Tidak ada data'); return; }
    el.innerHTML = items.map(a => `
      <div class="bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex items-start justify-between gap-4">
        <div class="flex items-start gap-4 flex-1">
          ${a.cover_url ? `<img src="${a.cover_url}" alt="" class="w-16 h-12 object-cover rounded-lg flex-shrink-0">` : ''}
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <h3 class="font-semibold text-slate-800 truncate">${escHtml(a.title)}</h3>
              <span class="text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${a.published ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}">${a.published ? 'Terbit' : 'Draft'}</span>
            </div>
            <p class="text-slate-400 text-xs font-mono">/artikel/${a.slug}</p>
            ${a.excerpt ? `<p class="text-slate-500 text-sm line-clamp-1 mt-1">${escHtml(a.excerpt)}</p>` : ''}
          </div>
        </div>
        <div class="flex gap-2 flex-shrink-0">
          <button onclick='editArtikel(${JSON.stringify(a)})' class="text-blue-600 hover:text-blue-800 p-1" title="Edit">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          </button>
          <button onclick="deleteArtikel('${a.id}')" class="text-red-400 hover:text-red-600 p-1" title="Hapus">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
      </div>`).join('');
    var pagEl = document.getElementById('artikel-pagination'); if (pagEl) pagEl.innerHTML = pagHTML('artikel', data.page, data.pages);
  }).catch(function(e) { el.innerHTML = errHtml(e.message); });
}
window.artikelGoPage = function(p) { loadArtikel(p); };
window.artikelSearch = function(s) { debounceSearch('artikel', function() { loadArtikel(1, s); }); };

function openArtikelModal() {
  document.getElementById('artikel-id').value = '';
  document.getElementById('artikel-title').value = '';
  document.getElementById('artikel-slug').value = '';
  document.getElementById('artikel-excerpt').value = '';
  document.getElementById('artikel-published').checked = false;
  document.getElementById('modalArtikelTitle').textContent = 'Tambah Artikel';
  initQuill('editor-artikel', toolbarFull);
  quillSetHTML('editor-artikel', '');
  createImagePicker('picker-artikel-cover');
  openModal('modalArtikel');
}

function editArtikel(a) {
  document.getElementById('artikel-id').value = a.id;
  document.getElementById('artikel-title').value = a.title;
  document.getElementById('artikel-slug').value = a.slug;
  document.getElementById('artikel-excerpt').value = a.excerpt || '';
  document.getElementById('artikel-published').checked = a.published;
  document.getElementById('modalArtikelTitle').textContent = 'Edit Artikel';
  initQuill('editor-artikel', toolbarFull);
  quillSetHTML('editor-artikel', a.content || '');
  createImagePicker('picker-artikel-cover', { initialUrl: a.cover_url || '' });
  openModal('modalArtikel');
}

function autoSlug() {
  const title = document.getElementById('artikel-title').value;
  document.getElementById('artikel-slug').value = title
    .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-');
}

async function submitArtikel() {
  const id = document.getElementById('artikel-id').value;
  const body = {
    title: document.getElementById('artikel-title').value,
    slug: document.getElementById('artikel-slug').value,
    excerpt: document.getElementById('artikel-excerpt').value,
    content: quillGetHTML('editor-artikel'),
    cover_url: pickerGetUrl('picker-artikel-cover'),
    published: document.getElementById('artikel-published').checked,
    period_label: PERIOD
  };
  if (!body.title || !body.slug) { uiAlert('Judul dan slug harus diisi'); return; }
  try {
    if (id) await api('PUT', `/api/cms/articles/${id}`, body);
    else await api('POST', '/api/cms/articles', body);
    closeModal('modalArtikel');
    loadArtikel(1);
  } catch(ex) { uiAlert('Error: ' + ex.message); }
}

async function deleteArtikel(id) {
  if (!await uiConfirm('Hapus artikel ini?', 'Konfirmasi Hapus', true)) return;
  await api('DELETE', `/api/cms/articles/${id}`);
  loadArtikel(1);
}

// ── TENTANG PERIODE ──────────────────────────────────────────────────────────
async function loadTentang() {
  initQuill('editor-sejarah');
  initQuill('editor-visi');
  initQuill('editor-misi');
  ['editor-sejarah', 'editor-visi', 'editor-misi'].forEach((id) => {
    const q = quills[id];
    if (q && !q.__previewBound) {
      q.on('text-change', () => renderTentangPreview());
      q.__previewBound = true;
    }
  });
  createImagePicker('picker-cover');
  createImagePicker('picker-struktur');
  createImagePicker('picker-logo-kabinet');
  try {
    const pa = await api('GET', `/api/cms/period-about?period=${PERIOD}`);
    state.periodAbout = pa || {};
    quillSetHTML('editor-sejarah', pa.sejarah || '');
    quillSetHTML('editor-visi', pa.visi || '');
    quillSetHTML('editor-misi', pa.misi || '');
    document.getElementById('tentang-tagline-title').value = pa.tagline_title || '';
    document.getElementById('tentang-tagline-subtitle').value = pa.tagline_subtitle || '';
    document.getElementById('tentang-tagline-desc').value = pa.tagline_description || '';
    if (pa.cover_image_url) pickerSetUrl('picker-cover', pa.cover_image_url);
    else pickerClear('picker-cover');
    if (pa.hierarchy_image_url) pickerSetUrl('picker-struktur', pa.hierarchy_image_url);
    else pickerClear('picker-struktur');
    if (pa.logo_kabinet_url) pickerSetUrl('picker-logo-kabinet', pa.logo_kabinet_url);
    else pickerClear('picker-logo-kabinet');
    state.periodGallery = Array.isArray(pa.gallery) ? pa.gallery : [];
    renderTentangPreview();
  } catch(e) {
    state.periodAbout = { period_label: PERIOD };
    state.periodGallery = [];
    renderTentangPreview();
  }
}

async function loadGaleri() {
  if (!state.periodAbout) {
    await loadTentang();
  }
  renderTentangGalleryEditor(state.periodGallery || []);
}

document.getElementById('btn-save-gallery')?.addEventListener('click', async () => {
  const msg = document.getElementById('galeri-msg');
  const current = await api('GET', `/api/cms/period-about?period=${PERIOD}`).catch(() => ({ period_label: PERIOD }));
  const gallery = collectTentangGallery();
  try {
    await api('PUT', '/api/cms/period-about', {
      ...current,
      period_label: PERIOD,
      gallery
    });
    state.periodGallery = gallery;
    renderTentangPreview();
    msg.classList.remove('hidden');
    setTimeout(() => msg.classList.add('hidden'), 3000);
  } catch (ex) {
    uiAlert('Error: ' + ex.message);
  }
});



// ── DEPARTEMEN ───────────────────────────────────────────────────────────────
let deptSortInstance = null;
let memberSortInstances = [];
let deptCache = [];
let memberCache = [];

function getMembersByDept(deptName) {
  return memberCache
    .filter(m => (m.department || '') === deptName)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
}

function renderDeptMemberItem(m) {
  return `<li class="dept-member-item flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2" data-member-id="${m.id}">
    <div class="flex items-center gap-2 min-w-0">
      <button type="button" class="member-drag text-slate-400 hover:text-slate-600" title="Geser urutan">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9h8M8 15h8"/></svg>
      </button>
      ${m.photo_url
        ? `<img src="${m.photo_url}" class="w-8 h-8 rounded-full object-cover">`
        : `<div class="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 text-xs">N/A</div>`}
      <div class="min-w-0">
        <p class="text-sm font-medium text-slate-800 truncate">${escHtml(m.full_name || '')}</p>
        <p class="text-xs text-slate-500 truncate">${escHtml(m.position || '-')}</p>
      </div>
    </div>
    <button onclick="unassignMember('${m.id}')" class="text-red-500 hover:text-red-700 text-xs font-medium">Lepas</button>
  </li>`;
}

function destroyDeptSortables() {
  if (deptSortInstance) {
    deptSortInstance.destroy();
    deptSortInstance = null;
  }
  memberSortInstances.forEach(s => s.destroy());
  memberSortInstances = [];
}

async function persistDepartmentOrderFromDom() {
  const cards = Array.from(document.querySelectorAll('#dept-cards .dept-card'));
  if (!cards.length) return;
  for (let idx = 0; idx < cards.length; idx++) {
    const id = cards[idx].dataset.deptId;
    await api('PUT', `/api/cms/departments/${id}`, { sort_order: idx });
  }
}

async function persistMemberOrderFromList(ul, deptName) {
  const ids = Array.from(ul.querySelectorAll('.dept-member-item')).map(li => li.dataset.memberId);
  if (!ids.length) return;
  for (let idx = 0; idx < ids.length; idx++) {
    await api('PUT', `/api/cms/members/${ids[idx]}`, {
      sort_order: idx,
      department: deptName
    });
  }
}

async function handleMemberDrop(evt) {
  const movedId = evt.item?.dataset?.memberId;
  const fromDept = evt.from?.dataset?.deptName || '';
  const toDept = evt.to?.dataset?.deptName || '';
  if (!movedId) return;

  if (fromDept !== toDept) {
    const moved = memberCache.find(m => m.id === movedId);
    await api('PUT', `/api/cms/members/${movedId}`, {
      department: toDept,
      position: moved?.position || '',
      sort_order: evt.newIndex || 0
    });
  }

  if (evt.from && evt.from.classList.contains('dept-member-list')) {
    await persistMemberOrderFromList(evt.from, fromDept);
  }
  if (evt.to && evt.to.classList.contains('dept-member-list') && evt.to !== evt.from) {
    await persistMemberOrderFromList(evt.to, toDept);
  }
  await loadKementerian();
  await loadAnggota();
}

function initDeptSortables() {
  destroyDeptSortables();
  const deptCards = document.getElementById('dept-cards');
  if (deptCards) {
    deptSortInstance = Sortable.create(deptCards, {
      animation: 180,
      handle: '.dept-drag',
      draggable: '.dept-card',
      onEnd: async () => {
        try {
          await persistDepartmentOrderFromDom();
          await loadKementerian();
        } catch (ex) {
          uiAlert('Gagal menyimpan urutan kementerian: ' + ex.message);
        }
      }
    });
  }

  document.querySelectorAll('.dept-member-list').forEach(ul => {
    const sortable = Sortable.create(ul, {
      group: 'members-cross-dept',
      animation: 180,
      handle: '.member-drag',
      draggable: '.dept-member-item',
      onEnd: async evt => {
        try {
          await handleMemberDrop(evt);
        } catch (ex) {
          uiAlert('Gagal menyimpan urutan anggota: ' + ex.message);
        }
      }
    });
    memberSortInstances.push(sortable);
  });
}

function buildDeptTree(depts) {
  const map = {};
  const roots = [];
  depts.forEach(d => { d._children = []; map[d.id] = d; });
  depts.forEach(d => {
    if (d.parent_id && map[d.parent_id]) { map[d.parent_id]._children.push(d); }
    else { roots.push(d); }
  });
  return roots;
}

function renderDeptCard(d, depth) {
  const members = getMembersByDept(d.name);
  const ml = depth * 24;
  const borderColor = depth === 0 ? 'border-slate-200' : 'border-slate-100';
  const bgColor = depth === 0 ? 'bg-white' : 'bg-slate-50/60';
  const childrenHtml = d._children.length
    ? `<div class="ml-6 mt-2 space-y-2 border-l-2 border-slate-200 pl-4">${d._children.map(c => renderDeptCard(c, depth + 1)).join('')}</div>`
    : '';
  return `
    <div class="dept-card ${bgColor} rounded-xl p-4 shadow-sm border ${borderColor} space-y-3" data-dept-id="${d.id}" data-dept-name="${escHtml(d.name)}" ${ml ? `style="margin-left:${ml}px"` : ''}>
      <div class="flex items-start justify-between gap-4">
        <div class="flex items-start gap-2 min-w-0">
          <button type="button" class="dept-drag mt-0.5 text-slate-400 hover:text-slate-600" title="Geser urutan departemen">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9h8M8 15h8"/></svg>
          </button>
          <div class="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden mt-0.5">
            ${d.icon_url ? `<img src="${escHtml(d.icon_url)}" class="w-full h-full object-contain p-1" alt="icon">` : '<svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>'}
          </div>
          <div class="min-w-0">
            <h3 class="font-semibold text-slate-800">${escHtml(d.name)}</h3>
            ${d.description ? `<p class="text-slate-500 text-sm">${escHtml(d.description)}</p>` : ''}
          </div>
        </div>
        <div class="flex gap-2 flex-shrink-0">
          <button onclick="addSubDept('${d.id}')" class="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium">+ Sub</button>
          <button onclick="openAssignMemberModal('${d.id}')" class="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium">Assign</button>
          <button onclick='editDept(${JSON.stringify(d).replace(/'/g, "&#39;")})' class="text-blue-600 hover:text-blue-800 p-1" title="Edit">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          </button>
          <button onclick="deleteDept('${d.id}')" class="text-red-400 hover:text-red-600 p-1" title="Hapus">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
      </div>
      <ul class="dept-member-list space-y-2 min-h-[40px] rounded-lg bg-slate-50 p-2" data-dept-name="${escHtml(d.name)}">
        ${members.length
          ? members.map(renderDeptMemberItem).join('')
          : '<li class="text-xs text-slate-400 p-2">Belum ada anggota di kementerian ini.</li>'}
      </ul>
      ${childrenHtml}
    </div>`;
}

async function loadKementerian() {
  const el = document.getElementById('list-departemen');
  if (!el) return;
  try {
    const [depts, members] = await Promise.all([
      api('GET', `/api/cms/departments?period=${PERIOD}`),
      api('GET', `/api/cms/members?period=${PERIOD}`)
    ]);
    deptCache = depts || [];
    memberCache = (members && members.items) ? members.items : (members || []);

    if (!deptCache.length) {
      el.innerHTML = emptyHtml('Belum ada departemen.');
      destroyDeptSortables();
      return;
    }

    const tree = buildDeptTree(deptCache);
    el.innerHTML = `<div id="dept-cards" class="space-y-3">${tree.map(d => renderDeptCard(d, 0)).join('')}</div>`;
    initDeptSortables();
  } catch (e) {
    el.innerHTML = errHtml(e.message);
  }
}

function populateDeptParentDropdown(excludeId = null) {
  const select = document.getElementById('dept-parent');
  select.innerHTML = '<option value="">Tidak ada (Kementerian Utama)</option>';
  
  function addOptions(depts, level = 0) {
    depts.forEach(d => {
      if (d.id !== excludeId) {
        const indent = '—'.repeat(level);
        const prefix = level > 0 ? indent + ' ' : '';
        const option = document.createElement('option');
        option.value = d.id;
        option.textContent = prefix + d.name;
        select.appendChild(option);
      }
    });
  }
  
  addOptions(deptCache);
}

function resetDeptForm() {
  document.getElementById('dept-id').value = '';
  document.getElementById('dept-name').value = '';
  document.getElementById('dept-desc').value = '';
  document.getElementById('dept-parent').value = '';
  createImagePicker('picker-dept-icon');
  populateDeptParentDropdown();
  document.getElementById('modalDeptTitle').textContent = 'Tambah Kementerian';
}

function editDept(d) {
  document.getElementById('dept-id').value = d.id;
  document.getElementById('dept-name').value = d.name;
  document.getElementById('dept-desc').value = d.description || '';
  createImagePicker('picker-dept-icon', { initialUrl: d.icon_url || '' });
  populateDeptParentDropdown(d.id);
  document.getElementById('dept-parent').value = d.parent_id || '';
  document.getElementById('modalDeptTitle').textContent = 'Edit Kementerian';
  openModal('modalKementerian');
}

function addSubDept(parentId) {
  resetDeptForm();
  document.getElementById('dept-parent').value = parentId;
  document.getElementById('modalDeptTitle').textContent = 'Tambah Sub-Kementerian';
  openModal('modalKementerian');
}

async function deleteDept(id) {
  if (!await uiConfirm('Hapus kementerian ini?', 'Konfirmasi Hapus', true)) return;
  await api('DELETE', `/api/cms/departments/${id}`);
  await loadKementerian();
}

function openAssignMemberModal(deptId) {
  const dept = deptCache.find(d => d.id === deptId);
  if (!dept) return;
  const available = memberCache.filter(m => {
    const active = m?.active_periods && m.active_periods[PERIOD];
    return active && !(m.department || '');
  });
  const sel = document.getElementById('assign-member-id');
  document.getElementById('assign-dept-id').value = deptId;
  document.getElementById('assign-member-position').value = '';

  if (!available.length) {
    sel.innerHTML = '<option value="">Tidak ada anggota yang belum ditempatkan</option>';
  } else {
    sel.innerHTML = available.map(m => `<option value="${m.id}">${escHtml(m.full_name)}${m.nickname ? ` (${escHtml(m.nickname)})` : ''}</option>`).join('');
  }
  openModal('modalAssignMember');
}

async function submitAssignMember() {
  const deptId = document.getElementById('assign-dept-id').value;
  const memberId = document.getElementById('assign-member-id').value;
  const position = document.getElementById('assign-member-position').value.trim();
  const dept = deptCache.find(d => d.id === deptId);
  if (!dept || !memberId) {
    uiAlert('Pilih anggota yang valid.');
    return;
  }

  const currentCount = getMembersByDept(dept.name).length;
  await api('PUT', `/api/cms/members/${memberId}`, {
    department: dept.name,
    position,
    sort_order: currentCount
  });
  closeModal('modalAssignMember');
  await loadKementerian();
  await loadAnggota();
}

async function unassignMember(memberId) {
  if (!await uiConfirm('Lepas anggota dari departemen?', 'Konfirmasi')) return;
  await api('PUT', `/api/cms/members/${memberId}`, {
    department: '',
    position: '',
    sort_order: 0
  });
  await loadKementerian();
  await loadAnggota();
}

// ── PROGRAM ──────────────────────────────────────────────────────────────────
let programCache = [];
let programDeptCache = [];

async function loadPrograms() {
  const tb = document.getElementById('program-tbody');
  if (!tb) return;
  try {
    const [programs, depts] = await Promise.all([
      api('GET', `/api/cms/programs?period=${PERIOD}`),
      api('GET', `/api/cms/departments?period=${PERIOD}`)
    ]);
    programCache = programs || [];
    programDeptCache = depts || [];

    // Populate department filter dropdown
    const deptSel = document.getElementById('programDeptFilter');
    if (deptSel) {
      deptSel.innerHTML = '<option value="">Semua</option>' + programDeptCache.map(d => `<option value="${escHtml(d.name)}">${escHtml(d.name)}</option>`).join('');
    }

    renderProgramTable();
  } catch (e) {
    tb.innerHTML = `<tr><td colspan="4" class="p-6">${errHtml(e.message)}</td></tr>`;
  }
}

function renderProgramTable() {
  const tb = document.getElementById('program-tbody');
  if (!tb) return;
  const dept = document.getElementById('programDeptFilter')?.value || '';
  const query = document.getElementById('programSearchInput')?.value.toLowerCase().trim() || '';

  const filtered = programCache.filter(p => {
    const matchDept = !dept || (p.department || '').toLowerCase() === dept.toLowerCase();
    const matchSearch = !query || (p.title || '').toLowerCase().includes(query) || (p.description || '').toLowerCase().includes(query);
    return matchDept && matchSearch;
  });

  if (!filtered.length) {
    tb.innerHTML = '<tr><td colspan="4" class="p-6 text-center text-slate-400">Tidak ada program yang cocok.</td></tr>';
    return;
  }

  tb.innerHTML = filtered.map(p => `
    <tr class="border-b border-slate-100 hover:bg-slate-50">
      <td class="p-4 align-top text-slate-700">${escHtml(p.department || '-')}</td>
      <td class="p-4 align-top font-medium text-slate-800">
        <div class="flex items-center gap-2">
          ${p.image_url ? `<img src="${p.image_url}" alt="" class="w-10 h-10 rounded-lg object-cover">` : ''}
          <span>${escHtml(p.title || '')}</span>
        </div>
      </td>
      <td class="p-4 align-top text-slate-600">${escHtml(p.description || '')}</td>
      <td class="p-4 align-top text-right whitespace-nowrap">
        <button onclick="editProgramById('${p.id}')" class="text-blue-600 hover:text-blue-800 p-1" title="Edit">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
        </button>
        <button onclick="deleteProgram('${p.id}')" class="text-red-400 hover:text-red-600 p-1" title="Hapus">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </button>
      </td>
    </tr>
  `).join('');
}

function filterPrograms() {
  renderProgramTable();
}

function fillProgramDepartmentOptions(selected = '') {
  const sel = document.getElementById('program-department');
  if (!sel) return;
  if (!programDeptCache.length) {
    sel.innerHTML = '<option value="">Belum ada kementerian</option>';
    return;
  }
  sel.innerHTML = programDeptCache.map(d => `<option value="${escHtml(d.name)}" ${d.name === selected ? 'selected' : ''}>${escHtml(d.name)}</option>`).join('');
}

async function openProgramModal() {
  if (!programDeptCache.length) {
    try {
      programDeptCache = await api('GET', `/api/cms/departments?period=${PERIOD}`);
    } catch (_) {}
  }
  if (!programDeptCache.length) {
    uiAlert('Tambahkan kementerian terlebih dahulu sebelum membuat program.');
    return;
  }
  document.getElementById('program-id').value = '';
  document.getElementById('program-title').value = '';
  document.getElementById('program-desc').value = '';
  document.getElementById('modalProgramTitle').textContent = 'Tambah Program';
  createImagePicker('picker-program-image');
  fillProgramDepartmentOptions(programDeptCache[0]?.name || '');
  openModal('modalProgram');
}

function editProgramById(id) {
  const p = programCache.find(x => x.id === id);
  if (!p) return;
  document.getElementById('program-id').value = p.id || '';
  document.getElementById('program-title').value = p.title || '';
  document.getElementById('program-desc').value = p.description || '';
  document.getElementById('modalProgramTitle').textContent = 'Edit Program';
  createImagePicker('picker-program-image', { initialUrl: p.image_url || '' });
  fillProgramDepartmentOptions(p.department || '');
  openModal('modalProgram');
}

async function deleteProgram(id) {
  if (!await uiConfirm('Hapus program ini?', 'Konfirmasi Hapus', true)) return;
  await api('DELETE', `/api/cms/programs/${id}`);
  await loadPrograms();
}

// ── ANGGOTA ──────────────────────────────────────────────────────────────────
function renderAnggotaActivationEditor(activePeriods = {}) {
  const wrap = document.getElementById('anggota-activation-wrap');
  if (!wrap) return;
  if (ROLE !== 'superadmin') {
    wrap.innerHTML = '';
    return;
  }
  wrap.innerHTML = `
    <label class="block text-sm font-semibold text-slate-700 mb-1">Aktif per Periode/Sub-Periode</label>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-2">${(state.periods || []).map(p => {
      const options = periodSubPeriods(p).map(sp => `<option value="${sp}" ${activePeriods[p.label] === sp ? 'selected' : ''}>${escHtml(sp)}</option>`).join('');
      return `<div class="grid grid-cols-2 gap-2 items-center border border-slate-200 rounded-lg p-2 bg-slate-50">
        <div class="text-xs text-slate-600 font-medium">${escHtml(p.display_name || p.label)}</div>
        <select data-period="${p.label}" class="anggota-active-subperiod w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs">
          <option value="">Tidak aktif</option>
          ${options}
        </select>
      </div>`;
    }).join('')}</div>`;
}

function collectAnggotaActivation() {
  const periods = {};
  document.querySelectorAll('.anggota-active-subperiod').forEach(sel => {
    const val = (sel.value || '').trim();
    const p = sel.getAttribute('data-period');
    if (p && val) periods[p] = val;
  });
  return { periods };
}

function loadAnggota(page, search) {
  page = page || (state._anggotaPage || 1); search = search !== undefined ? search : (state._anggotaSearch || '');
  state._anggotaPage = page; state._anggotaSearch = search;
  const el = document.getElementById('list-anggota');
  if (!el) return;
  api('GET', `/api/cms/members?period=${PERIOD}&page=` + page + '&per_page=20&search=' + encodeURIComponent(search)).then(function(data) {
    var items = data.items || [];
    memberCache = items;
    if (!items.length) { el.innerHTML = emptyHtml('Tidak ada data'); return; }
    el.innerHTML = `<div class="overflow-x-auto bg-white rounded-lg border border-slate-200"><table class="w-full text-sm">
      <thead><tr class="border-b border-slate-200 text-left text-slate-600 text-xs uppercase tracking-wider bg-slate-50">
        <th class="px-4 py-3 bg-slate-50 font-semibold">Foto</th>
        <th class="px-4 py-3 bg-slate-50 font-semibold">Nama</th>
        <th class="px-4 py-3 bg-slate-50 font-semibold">Profil</th>
        <th class="px-4 py-3 bg-slate-50 font-semibold">Status Aktif</th>
        <th class="px-4 py-3 bg-slate-50 font-semibold">No. HP</th>
        <th class="px-4 py-3 bg-slate-50 font-semibold">Penempatan</th>
        <th class="px-4 py-3 bg-slate-50 font-semibold">Aksi</th>
      </tr></thead>
      <tbody class="divide-y divide-slate-100">
        ${items.map(m => `
        <tr class="bg-white hover:bg-slate-50">
          <td class="px-4 py-3 border-t border-slate-100">
            ${m.photo_url
              ? `<img src="${m.photo_url}" class="w-10 h-10 rounded-full object-cover">`
              : `<div class="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 text-xs">N/A</div>`}
          </td>
          <td class="px-4 py-3 border-t border-slate-100">
            <div class="font-medium text-slate-800">${escHtml(m.full_name)}</div>
            ${m.nickname ? `<div class="text-xs text-slate-400">${escHtml(m.nickname)}</div>` : ''}
          </td>
          <td class="px-4 py-3 text-slate-600 border-t border-slate-100">
            <div class="text-xs">${escHtml(m.program_studi || '-')}</div>
            <div class="text-xs text-slate-400">${escHtml(m.fakultas || '-')} • ${escHtml(m.angkatan || '-')}</div>
          </td>
          <td class="px-4 py-3 text-slate-600 border-t border-slate-100">
            ${m.active_periods && m.active_periods[PERIOD] ? `<span class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Aktif (${escHtml(m.active_periods[PERIOD])})</span>` : '<span class="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Tidak aktif</span>'}
          </td>
          <td class="px-4 py-3 text-slate-600 border-t border-slate-100 text-xs font-mono">
            ${m.phone ? escHtml(m.phone) : '<span class=\"text-slate-300\">-</span>'}
          </td>
          <td class="px-4 py-3 text-slate-600 border-t border-slate-100">
            ${m.department ? `<div class="text-sm">${escHtml(m.department)}</div>` : '<div class="text-xs text-amber-600">Belum ditempatkan</div>'}
            ${m.position ? `<div class="text-xs text-slate-400">${escHtml(m.position)}</div>` : ''}
          </td>
          <td class="px-4 py-3 border-t border-slate-100">
            <div class="flex gap-1">
              <button onclick='editAnggota(${JSON.stringify(m)})' class="text-blue-600 hover:text-blue-800 p-1" title="Edit">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
              </button>
              <button onclick="deleteAnggota('${m.id}')" class="text-red-400 hover:text-red-600 p-1" title="Hapus">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            </div>
          </td>
        </tr>`).join('')}
      </tbody>
    </table></div>`;
    var pagEl = document.getElementById('anggota-pagination'); if (pagEl) pagEl.innerHTML = pagHTML('anggota', data.page, data.pages);
  }).catch(function(e) { el.innerHTML = errHtml(e.message); });
}
window.anggotaGoPage = function(p) { loadAnggota(p); };
window.anggotaSearch = function(s) { debounceSearch('anggota', function() { loadAnggota(1, s); }); };

async function openAnggotaModal() {
  if (ROLE === 'superadmin' && (!state.periods || !state.periods.length)) {
    try { state.periods = await api('GET', '/api/cms/periods'); } catch (_) {}
  }
  document.getElementById('anggota-id').value = '';
  document.getElementById('anggota-fullname').value = '';
  document.getElementById('anggota-nickname').value = '';
  document.getElementById('anggota-program-studi').value = '';
  document.getElementById('anggota-fakultas').value = '';
  document.getElementById('anggota-angkatan').value = '';
  document.getElementById('anggota-phone').value = '';
  document.getElementById('modalAnggotaTitle').textContent = 'Tambah Anggota';
  renderAnggotaActivationEditor({});
  createImagePicker('picker-anggota-photo');
  createImagePicker('picker-anggota-cover');
  openModal('modalAnggota');
}

async function editAnggota(m) {
  if (ROLE === 'superadmin' && (!state.periods || !state.periods.length)) {
    try { state.periods = await api('GET', '/api/cms/periods'); } catch (_) {}
  }
  document.getElementById('anggota-id').value = m.id;
  document.getElementById('anggota-fullname').value = m.full_name;
  document.getElementById('anggota-nickname').value = m.nickname || '';
  document.getElementById('anggota-program-studi').value = m.program_studi || '';
  document.getElementById('anggota-fakultas').value = m.fakultas || '';
  document.getElementById('anggota-angkatan').value = m.angkatan || '';
  document.getElementById('anggota-phone').value = m.phone || '';
  document.getElementById('modalAnggotaTitle').textContent = 'Edit Anggota';
  renderAnggotaActivationEditor(m.active_periods || {});
  createImagePicker('picker-anggota-photo', { initialUrl: m.photo_url || '' });
  createImagePicker('picker-anggota-cover', { initialUrl: m.cover_url || '' });
  openModal('modalAnggota');
}

async function submitAnggota() {
  const id = document.getElementById('anggota-id').value;
  const activation = collectAnggotaActivation();
  const body = {
    full_name: document.getElementById('anggota-fullname').value,
    nickname: document.getElementById('anggota-nickname').value,
    program_studi: document.getElementById('anggota-program-studi').value,
    fakultas: document.getElementById('anggota-fakultas').value,
    angkatan: document.getElementById('anggota-angkatan').value,
    phone: document.getElementById('anggota-phone').value,
    active_periods: activation.periods,
    photo_url: pickerGetUrl('picker-anggota-photo'),
    cover_url: pickerGetUrl('picker-anggota-cover'),
    period_label: PERIOD
  };
  if (!body.full_name) { uiAlert('Nama harus diisi'); return; }
  try {
    if (id) await api('PUT', `/api/cms/members/${id}`, body);
    else await api('POST', '/api/cms/members', body);
    closeModal('modalAnggota');
    loadAnggota(1);
    await loadKementerian();
  } catch (ex) { uiAlert('Error: ' + ex.message); }
}

async function deleteAnggota(id) {
  if (!await uiConfirm('Hapus anggota ini?', 'Konfirmasi Hapus', true)) return;
  await api('DELETE', `/api/cms/members/${id}`);
  loadAnggota(1);
  await loadKementerian();
}

// ── MANAJEMEN PERIODE ────────────────────────────────────────────────────────
let periodSubperiodDraft = [];
let periodUsedSubperiods = new Set();

function renderPeriodSubperiodEditor() {
  const list = document.getElementById('periode-subperiod-list');
  if (!list) return;
  list.innerHTML = periodSubperiodDraft.map((sp, idx) => {
    const locked = periodUsedSubperiods.has(sp);
    const canDelete = periodSubperiodDraft.length > 1 && !locked;
    return `<div class="flex items-center gap-2">
      <input type="text" data-subperiod-index="${idx}" value="${escHtml(sp)}" class="flex-1 border border-slate-300 rounded-lg px-2 py-1.5 text-sm">
      <button type="button" data-remove-subperiod="${idx}" class="text-xs px-2 py-1 rounded ${canDelete ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}" ${canDelete ? '' : 'disabled'}>${locked ? 'Dipakai' : 'Hapus'}</button>
    </div>`;
  }).join('');
}

async function loadSubperiodUsage(periodLabel) {
  try {
    const members = await api('GET', `/api/cms/members?period=${encodeURIComponent(periodLabel)}`);
    const used = new Set();
    (members || []).forEach(m => {
      const sp = m?.active_periods?.[periodLabel];
      if (sp) used.add(sp);
    });
    periodUsedSubperiods = used;
  } catch (_) {
    periodUsedSubperiods = new Set();
  }
}

document.addEventListener('click', e => {
  if (e.target.matches('#btn-add-subperiod')) {
    periodSubperiodDraft.push(`Gelombang ${periodSubperiodDraft.length + 1}`);
    renderPeriodSubperiodEditor();
  }
  if (e.target.matches('[data-remove-subperiod]')) {
    const idx = parseInt(e.target.getAttribute('data-remove-subperiod'), 10);
    if (!Number.isNaN(idx) && periodSubperiodDraft.length > 1) {
      periodSubperiodDraft.splice(idx, 1);
      renderPeriodSubperiodEditor();
    }
  }
});

document.addEventListener('input', e => {
  if (e.target.matches('[data-subperiod-index]')) {
    const idx = parseInt(e.target.getAttribute('data-subperiod-index'), 10);
    if (!Number.isNaN(idx)) periodSubperiodDraft[idx] = e.target.value;
  }
});

async function loadPeriode() {
  const el = document.getElementById('list-periode');
  if (!el) return;
  try {
    const items = await api('GET', '/api/cms/periods');
    state.periods = items || [];
    if (!items || !items.length) { el.innerHTML = emptyHtml('Belum ada periode.'); return; }
    el.innerHTML = items.map(p => `
      <div class="bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          ${p.is_active ? '<span class="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">Aktif</span>' : ''}
          <div>
            <h3 class="font-semibold text-slate-800">${escHtml(p.display_name)}</h3>
            <p class="text-xs text-slate-400 font-mono">${p.label}</p>
          </div>
        </div>
        
        <div class="flex gap-2 flex-shrink-0 items-center">
          <button onclick="editPeriode('${p.label}')" class="text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-100">Edit</button>
          ${!p.is_active ? `<button onclick="activatePeriode('${p.label}')" class="bg-green-50 hover:bg-green-100 text-green-700 text-xs px-3 py-1.5 rounded-lg font-medium transition">Jadikan Aktif</button><button onclick="deletePeriode('${p.label}')" class="bg-red-50 hover:bg-red-100 text-red-600 text-xs px-3 py-1.5 rounded-lg font-medium transition">Hapus</button>` : ''}
        </div>
      </div>`).join('');
    // also populate akun period selector
    const sel = document.getElementById('akun-assigned-period');
    if (sel) {
      const cur = sel.value;
      sel.innerHTML = '<option value="">-- Pilih Periode --</option>' +
        items.map(p => `<option value="${p.label}" ${p.label === cur ? 'selected' : ''}>${escHtml(p.display_name)}</option>`).join('');
    }
  } catch(e) { el.innerHTML = errHtml(e.message); }
}


function editPeriode(label) {
    const p = (state.periods || []).find(x => x.label === label);
    if(!p) return;
    document.getElementById('periode-label').value = p.label;
    document.getElementById('periode-label').readOnly = true;
    document.getElementById('modalPeriodeTitle').textContent = 'Edit Periode';
    document.getElementById('periode-displayname').value = p.display_name;
    periodSubperiodDraft = [...periodSubPeriods(p)];
    document.getElementById('periode-subperiod-editor').classList.remove('hidden');
    loadSubperiodUsage(p.label).then(renderPeriodSubperiodEditor);
    openModal('modalPeriode');
}

function openPeriodeCreateModal() {
  document.getElementById('periode-label').readOnly = false;
  document.getElementById('modalPeriodeTitle').textContent = 'Tambah Periode';
  document.getElementById('formPeriode').reset();
  document.getElementById('periode-subperiod-editor').classList.add('hidden');
  periodSubperiodDraft = ['Gelombang 1'];
  periodUsedSubperiods = new Set();
  openModal('modalPeriode');
}

async function activatePeriode(label) {
  if (!await uiConfirm(`Jadikan periode "${label}" sebagai aktif?`, 'Konfirmasi Aktivasi')) return;
  try {
    await api('PUT', `/api/cms/periods/${label}/activate`);
    loadPeriode();
  } catch(ex) { uiAlert('Error: ' + ex.message); }
}

async function deletePeriode(label) {
  if (!await uiConfirm(`Hapus periode "${label}"? Periode yang memiliki data tidak dapat dihapus.`, 'Konfirmasi Hapus', true)) return;
  try {
    await api('DELETE', `/api/cms/periods/${label}`);
    loadPeriode();
  } catch(ex) { uiAlert('Error: ' + ex.message); }
}


document.getElementById('formPeriode')?.addEventListener('submit', async e => {
  e.preventDefault();
  const label = document.getElementById('periode-label').value;
  const isEditing = document.getElementById('periode-label').readOnly;
  
  const body = {
    label: label,
    display_name: document.getElementById('periode-displayname').value,
    sub_periods: (isEditing ? periodSubperiodDraft : ['Gelombang 1']).map(s => s.trim()).filter(Boolean)
  };
  try {
    if(isEditing) {
        await api('PUT', '/api/cms/periods/' + label, body);
    } else {
        await api('POST', '/api/cms/periods', body);
    }
    closeModal('modalPeriode');
    document.getElementById('formPeriode').reset();
    loadPeriode();
  } catch(ex) { uiAlert('Error: ' + ex.message); }
});
//__REPLACE_ME__


// ── MANAJEMEN AKUN ───────────────────────────────────────────────────────────
function loadAkun(page, search) {
  page = page || (state._akunPage || 1); search = search !== undefined ? search : (state._akunSearch || '');
  state._akunPage = page; state._akunSearch = search;
  const el = document.getElementById('list-akun');
  if (!el) return;
  api('GET', '/api/cms/accounts?page=' + page + '&per_page=20&search=' + encodeURIComponent(search)).then(function(data) {
    var items = data.items || [];
    if (!items || !items.length) { el.innerHTML = emptyHtml('Belum ada akun.'); return; }
    el.innerHTML = `<div class="overflow-x-auto bg-white rounded-lg border border-slate-200"><table class="w-full text-sm">
      <thead><tr class="border-b border-slate-200 text-left text-slate-600 text-xs uppercase tracking-wider bg-slate-50">
        <th class="px-4 py-3 bg-slate-50 font-semibold">Username</th>
        <th class="px-4 py-3 bg-slate-50 font-semibold">Role</th>
        <th class="px-4 py-3 bg-slate-50 font-semibold">Periode</th>
        <th class="px-4 py-3 bg-slate-50 font-semibold">Aksi</th>
      </tr></thead>
      <tbody class="divide-y divide-slate-100">
        ${items.map(u => `
        <tr class="bg-white hover:bg-slate-50">
          <td class="px-4 py-3 font-medium text-slate-800 border-t border-slate-100">${escHtml(u.username)}</td>
          <td class="px-4 py-3 border-t border-slate-100"><span class="px-2 py-0.5 rounded-full text-xs font-medium ${u.role === 'superadmin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}">${u.role}</span></td>
          <td class="px-4 py-3 text-slate-500 border-t border-slate-100">${u.assigned_period || '—'}</td>
          <td class="px-4 py-3 border-t border-slate-100">
            <div class="flex gap-1">
              <button onclick='editAkun(${JSON.stringify(u)})' class="text-blue-600 hover:text-blue-800 p-1" title="Edit">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
              </button>
              <button onclick="deleteAkun('${u.id}')" class="text-red-400 hover:text-red-600 p-1" title="Hapus">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            </div>
          </td>
        </tr>`).join('')}
      </tbody>
    </table></div>`;
    var pagEl = document.getElementById('akun-pagination'); if (pagEl) pagEl.innerHTML = pagHTML('akun', data.page, data.pages);
  }).catch(function(e) { el.innerHTML = errHtml(e.message); });
}
window.akunGoPage = function(p) { loadAkun(p); };
window.akunSearch = function(s) { debounceSearch('akun', function() { loadAkun(1, s); }); };

function openAkunModal() {
  document.getElementById('akun-id').value = '';
  document.getElementById('akun-username').value = '';
  document.getElementById('akun-password').value = '';
  document.getElementById('akun-role').value = 'admin';
  document.getElementById('akun-pw-hint').textContent = '';
  document.getElementById('modalAkunTitle').textContent = 'Tambah Akun';
  toggleAssignedPeriod();
  openModal('modalAkun');
}

function editAkun(u) {
  document.getElementById('akun-id').value = u.id;
  document.getElementById('akun-username').value = u.username;
  document.getElementById('akun-password').value = '';
  document.getElementById('akun-role').value = u.role;
  document.getElementById('akun-assigned-period').value = u.assigned_period || '';
  document.getElementById('akun-pw-hint').textContent = '(kosong = tidak diubah)';
  document.getElementById('modalAkunTitle').textContent = 'Edit Akun';
  toggleAssignedPeriod();
  openModal('modalAkun');
}

async function deleteAkun(id) {
  if (!await uiConfirm('Hapus akun ini?', 'Konfirmasi Hapus', true)) return;
  await api('DELETE', `/api/cms/accounts/${id}`);
  loadAkun(1);
}

function toggleAssignedPeriod() {
  const role = document.getElementById('akun-role').value;
  document.getElementById('akun-period-wrap').style.display = role === 'admin' ? '' : 'none';
}

// ── GLOBAL SETTING ───────────────────────────────────────────────────────────
async function loadGlobal() {
  initQuill('editor-global-about');
  if (quills['editor-global-about'] && !quills['editor-global-about'].__previewBound) {
    quills['editor-global-about'].on('text-change', () => renderGlobalPreview());
    quills['editor-global-about'].__previewBound = true;
  }
  createImagePicker('picker-logo');
  createImagePicker('picker-logo-university');
  createImagePicker('picker-logo-yayasan');
  try {
    const g = await api('GET', '/api/cms/global-setting');
    state.globalSetting = g || {};
    document.getElementById('global-orgname').value = g.org_name || '';
    document.getElementById('global-header-title').value = g.header_title || '';
    document.getElementById('global-header-subtitle').value = g.header_subtitle || '';
    document.getElementById('global-hero-badge').value = g.hero_badge_text || '';
    document.getElementById('global-hero-title-main').value = g.hero_title_main || '';
    document.getElementById('global-hero-title-accent').value = g.hero_title_accent || '';
    document.getElementById('global-footer-title').value = g.footer_title || '';
    document.getElementById('global-footer-copy').value = g.footer_copy_text || '';
    document.getElementById('global-footer-text').value = g.footer_text || '';
    quillSetHTML('editor-global-about', g.about_html || '');
    if (g.logo_url) pickerSetUrl('picker-logo', g.logo_url);
    if (g.logo_university_url) pickerSetUrl('picker-logo-university', g.logo_university_url);
    if (g.logo_yayasan_url) pickerSetUrl('picker-logo-yayasan', g.logo_yayasan_url);
    const sm = g.social_media || {};
    document.getElementById('sm-instagram').value = sm.instagram || '';
    document.getElementById('sm-twitter').value = sm.twitter || '';
    document.getElementById('sm-facebook').value = sm.facebook || '';
    document.getElementById('sm-youtube').value = sm.youtube || '';
    document.getElementById('sm-linkedin').value = sm.linkedin || '';
    document.getElementById('sm-tiktok').value = sm.tiktok || '';
    renderGlobalPreview();
  } catch(e) {
    state.globalSetting = {};
    renderGlobalPreview();
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function escHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function stripHtml(s) {
  if (!s) return '';
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function statValuePreview(raw, chartType) {
  const parsed = parseStatInputValue(raw, chartType);
  if (parsed.mode === 'single') return String(parsed.single || '-');
  if (!parsed.points.length) return '-';
  if (parsed.mode === 'xy') return `${parsed.points.length} titik koordinat`;
  return `${parsed.points.length} baris data`;
}

function statChartMode(chartType) {
  const t = String(chartType || '').toLowerCase();
  if (t === 'kpi') return 'single';
  if (t === 'scatter' || t === 'bubble') return 'xy';
  return 'series';
}

function parseStatInputValue(raw, chartType) {
  const txt = String(raw || '').trim();
  const mode = statChartMode(chartType);
  if (!txt) return { mode, single: '', points: [] };
  if (mode === 'single') return { mode, single: txt, points: [] };
  try {
    const parsed = JSON.parse(txt);
    if (!Array.isArray(parsed)) return { mode, single: txt, points: [] };
    const points = parsed.map((item) => ({
      label: String(item?.label ?? '').trim(),
      value: Number(item?.value),
      x: Number(item?.x),
      y: Number(item?.y),
      r: Number(item?.r)
    }));
    return { mode, single: '', points };
  } catch (_) {
    if (mode === 'xy') {
      const points = txt.split(/[;\n]+/).map((line, idx) => {
        const [xRaw, yRaw] = line.split(',').map(v => String(v || '').trim());
        const x = Number(xRaw);
        const y = Number(yRaw);
        if (Number.isNaN(x) || Number.isNaN(y)) return null;
        return { label: `Titik ${idx + 1}`, x, y, r: 6 };
      }).filter(Boolean);
      return { mode, single: '', points };
    }
    const pairs = txt.split(/[;\n]+/).map((line) => {
      const [labelRaw, valueRaw] = line.split(':');
      const label = String(labelRaw || '').trim();
      const value = Number(String(valueRaw || '').trim());
      if (!label || Number.isNaN(value)) return null;
      return { label, value };
    }).filter(Boolean);
    if (pairs.length) return { mode, single: '', points: pairs };
    const singleNumeric = Number(txt);
    if (!Number.isNaN(singleNumeric)) {
      return { mode, single: '', points: [{ label: 'Nilai', value: singleNumeric }] };
    }
    return { mode, single: txt, points: [] };
  }
}

function statRowInputTemplate(mode, idx, row = {}) {
  if (mode === 'xy') {
    return `<div class="grid grid-cols-12 gap-2 items-center stat-row" data-row-idx="${idx}">
      <input type="text" class="col-span-4 border border-slate-300 rounded-lg px-2 py-2 text-xs" data-row-label placeholder="Label" value="${escHtml(row.label || '')}">
      <input type="number" step="any" class="col-span-3 border border-slate-300 rounded-lg px-2 py-2 text-xs" data-row-x placeholder="X" value="${Number.isFinite(row.x) ? row.x : ''}">
      <input type="number" step="any" class="col-span-3 border border-slate-300 rounded-lg px-2 py-2 text-xs" data-row-y placeholder="Y" value="${Number.isFinite(row.y) ? row.y : ''}">
      <button type="button" class="col-span-2 text-xs bg-red-50 hover:bg-red-100 text-red-700 rounded-lg py-2" data-remove-series="${idx}">Hapus</button>
    </div>`;
  }
  return `<div class="grid grid-cols-12 gap-2 items-center stat-row" data-row-idx="${idx}">
    <input type="text" class="col-span-6 border border-slate-300 rounded-lg px-2 py-2 text-xs" data-row-label placeholder="Label" value="${escHtml(row.label || '')}">
    <input type="number" step="any" class="col-span-4 border border-slate-300 rounded-lg px-2 py-2 text-xs" data-row-value placeholder="Nilai" value="${Number.isFinite(row.value) ? row.value : ''}">
    <button type="button" class="col-span-2 text-xs bg-red-50 hover:bg-red-100 text-red-700 rounded-lg py-2" data-remove-series="${idx}">Hapus</button>
  </div>`;
}

function renderStatSeriesRows(mode, rows = []) {
  const list = document.getElementById('stat-series-list');
  if (!list) return;
  const safeRows = rows.length ? rows : [{}];
  list.innerHTML = safeRows.map((row, idx) => statRowInputTemplate(mode, idx, row)).join('');
}

function collectStatInputValue(chartType) {
  const mode = statChartMode(chartType);
  if (mode === 'single') {
    return (document.getElementById('stat-simple-value')?.value || '').trim();
  }
  const rows = [...document.querySelectorAll('#stat-series-list .stat-row')];
  if (!rows.length) throw new Error('Tambahkan minimal 1 baris data.');
  if (mode === 'xy') {
    const points = rows.map((row, idx) => {
      const label = (row.querySelector('[data-row-label]')?.value || '').trim() || `Titik ${idx + 1}`;
      const x = Number(row.querySelector('[data-row-x]')?.value);
      const y = Number(row.querySelector('[data-row-y]')?.value);
      if (Number.isNaN(x) || Number.isNaN(y)) {
        throw new Error(`Baris ${idx + 1} harus punya nilai X dan Y numerik.`);
      }
      const point = { label, x, y };
      if (String(chartType).toLowerCase() === 'bubble') point.r = 6;
      return point;
    });
    return JSON.stringify(points);
  }
  const points = rows.map((row, idx) => {
    const label = (row.querySelector('[data-row-label]')?.value || '').trim();
    const value = Number(row.querySelector('[data-row-value]')?.value);
    if (!label || Number.isNaN(value)) {
      throw new Error(`Baris ${idx + 1} harus punya label dan nilai numerik.`);
    }
    return { label, value };
  });
  return JSON.stringify(points);
}

function renderStatValueInput(chartType, rawValue = '') {
  const mode = statChartMode(chartType);
  const label = document.getElementById('stat-value-label');
  const help = document.getElementById('stat-value-help');
  const simpleWrap = document.getElementById('stat-simple-wrap');
  const seriesWrap = document.getElementById('stat-series-wrap');
  const addBtn = document.getElementById('btn-add-series');
  const parsed = parseStatInputValue(rawValue, chartType);

  if (!label || !help || !simpleWrap || !seriesWrap || !addBtn) return;

  if (mode === 'single') {
    label.textContent = 'Nilai Utama';
    help.textContent = 'Nilai tunggal untuk KPI card.';
    simpleWrap.classList.remove('hidden');
    seriesWrap.classList.add('hidden');
    document.getElementById('stat-simple-value').value = parsed.single || '';
  } else if (mode === 'xy') {
    label.textContent = 'Data Titik';
    help.textContent = String(chartType).toLowerCase() === 'bubble'
      ? 'Isi titik koordinat X dan Y. Bubble akan memakai ukuran default.'
      : 'Isi titik koordinat X dan Y untuk scatter chart.';
    simpleWrap.classList.add('hidden');
    seriesWrap.classList.remove('hidden');
    addBtn.textContent = '+ Tambah Titik';
    renderStatSeriesRows('xy', parsed.points);
  } else {
    label.textContent = 'Data Label dan Nilai';
    help.textContent = 'Isi data seperti tabel sederhana: label + angka.';
    simpleWrap.classList.add('hidden');
    seriesWrap.classList.remove('hidden');
    addBtn.textContent = '+ Tambah Baris Data';
    renderStatSeriesRows('series', parsed.points);
  }
}

function buildPreviewDataset(chartType, rawValue) {
  const parsed = parseStatInputValue(rawValue, chartType);
  const type = String(chartType || 'bar').toLowerCase();
  if (parsed.mode === 'single') {
    return {
      labels: ['Nilai'],
      datasets: [{ label: 'Nilai', data: [Number(parsed.single) || 0], backgroundColor: ['#2563eb'] }],
      chartType: 'bar'
    };
  }
  if (parsed.mode === 'xy') {
    const data = parsed.points.map((p) => ({ x: Number(p.x) || 0, y: Number(p.y) || 0, r: Number(p.r) || 6 }));
    return {
      labels: parsed.points.map((p) => p.label || ''),
      datasets: [{ label: 'Data', data, backgroundColor: '#2563eb', borderColor: '#2563eb' }],
      chartType: type === 'bubble' ? 'bubble' : 'scatter'
    };
  }
  return {
    labels: parsed.points.map((p) => p.label || '-'),
    datasets: [{ label: 'Data', data: parsed.points.map((p) => Number(p.value) || 0), backgroundColor: '#60a5fa', borderColor: '#2563eb' }],
    chartType: ['line', 'radar'].includes(type) ? type : ['pie', 'doughnut'].includes(type) ? type : type === 'polar' ? 'polarArea' : 'bar'
  };
}

function renderStatPreview(chartType, rawValue) {
  const canvas = document.getElementById('stat-preview-canvas');
  const empty = document.getElementById('stat-preview-empty');
  if (!canvas || !empty) return;
  const parsed = parseStatInputValue(rawValue, chartType);
  const hasData = parsed.mode === 'single' ? !!String(parsed.single || '').trim() : parsed.points.length > 0;
  if (statPreviewChart) {
    statPreviewChart.destroy();
    statPreviewChart = null;
  }
  if (!hasData) {
    empty.classList.remove('hidden');
    empty.classList.add('flex');
    return;
  }
  empty.classList.add('hidden');
  empty.classList.remove('flex');
  const preview = buildPreviewDataset(chartType, rawValue);
  statPreviewChart = new Chart(canvas, {
    type: preview.chartType,
    data: { labels: preview.labels, datasets: preview.datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: preview.chartType === 'pie' || preview.chartType === 'doughnut' || preview.chartType === 'polarArea' ? {} : { y: { beginAtZero: true } }
    }
  });
}

function renderTentangPreview() {
  const wrap = document.getElementById('tentang-preview');
  if (!wrap) return;
  const title = (document.getElementById('tentang-tagline-title')?.value || '').trim();
  const subtitle = (document.getElementById('tentang-tagline-subtitle')?.value || '').trim();
  const desc = (document.getElementById('tentang-tagline-desc')?.value || '').trim();
  const cover = pickerGetUrl('picker-cover') || '';
  const struktur = pickerGetUrl('picker-struktur') || '';
  const sejarah = stripHtml(quillGetHTML('editor-sejarah')).slice(0, 160);
  const visi = stripHtml(quillGetHTML('editor-visi')).slice(0, 120);
  const misi = stripHtml(quillGetHTML('editor-misi')).slice(0, 120);
  const galleryCount = (state.periodGallery || []).length;
  wrap.innerHTML = `
    <div class="space-y-2">
      <p class="text-xs uppercase tracking-wide text-slate-400">Hero Tentang Periode</p>
      <h4 class="text-lg font-bold text-slate-800">${escHtml(title || '-')}</h4>
      <p class="text-sm text-slate-600">${escHtml(subtitle || '-')}</p>
      <p class="text-sm text-slate-500">${escHtml(desc || '-')}</p>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
        <div class="rounded-lg border border-slate-200 bg-slate-50 p-2">
          <p class="text-xs text-slate-500 mb-2">Cover</p>
          ${cover ? `<img src="${escHtml(cover)}" alt="cover" class="w-full h-24 object-cover rounded">` : '<p class="text-xs text-slate-400">Belum ada cover.</p>'}
        </div>
        <div class="rounded-lg border border-slate-200 bg-slate-50 p-2">
          <p class="text-xs text-slate-500 mb-2">Struktur</p>
          ${struktur ? `<img src="${escHtml(struktur)}" alt="struktur" class="w-full h-24 object-cover rounded">` : '<p class="text-xs text-slate-400">Belum ada gambar struktur.</p>'}
        </div>
      </div>
      <div class="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p class="text-xs text-slate-500">Ringkasan Tentang</p>
        <p class="text-xs text-slate-700 mt-1"><span class="font-semibold">Latar Belakang:</span> ${escHtml(sejarah || '-')}</p>
        <p class="text-xs text-slate-700 mt-1"><span class="font-semibold">Visi:</span> ${escHtml(visi || '-')}</p>
        <p class="text-xs text-slate-700 mt-1"><span class="font-semibold">Misi:</span> ${escHtml(misi || '-')}</p>
      </div>
      <p class="text-xs text-slate-500">Galeri saat ini: <span class="font-semibold text-slate-700">${galleryCount}</span> item.</p>
    </div>
  `;
}

function renderGlobalPreview() {
  const wrap = document.getElementById('global-preview');
  if (!wrap) return;
  const orgName = (document.getElementById('global-orgname')?.value || '').trim();
  const headerTitle = (document.getElementById('global-header-title')?.value || '').trim();
  const headerSubtitle = (document.getElementById('global-header-subtitle')?.value || '').trim();
  const heroBadge = (document.getElementById('global-hero-badge')?.value || '').trim();
  const heroMain = (document.getElementById('global-hero-title-main')?.value || '').trim();
  const heroAccent = (document.getElementById('global-hero-title-accent')?.value || '').trim();
  const footerTitle = (document.getElementById('global-footer-title')?.value || '').trim();
  const footerText = (document.getElementById('global-footer-text')?.value || '').trim();
  const footerCopy = (document.getElementById('global-footer-copy')?.value || '').trim();
  const logo = pickerGetUrl('picker-logo') || '';
  const logoUniversity = pickerGetUrl('picker-logo-university') || '';
  const logoYayasan = pickerGetUrl('picker-logo-yayasan') || '';
  const aboutSummary = stripHtml(quillGetHTML('editor-global-about')).slice(0, 140);
  const social = {
    instagram: (document.getElementById('sm-instagram')?.value || '').trim(),
    twitter: (document.getElementById('sm-twitter')?.value || '').trim(),
    facebook: (document.getElementById('sm-facebook')?.value || '').trim(),
    youtube: (document.getElementById('sm-youtube')?.value || '').trim(),
    linkedin: (document.getElementById('sm-linkedin')?.value || '').trim(),
    tiktok: (document.getElementById('sm-tiktok')?.value || '').trim()
  };
  const socialCount = Object.values(social).filter(Boolean).length;
  wrap.innerHTML = `
    <div class="space-y-3">
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-1">
          ${logo ? `<img src="${escHtml(logo)}" alt="logo" class="h-8 w-8 rounded object-contain border border-slate-200">` : '<div class="h-8 w-8 rounded bg-slate-100 border border-slate-200"></div>'}
          ${logoUniversity ? `<img src="${escHtml(logoUniversity)}" alt="university" class="h-8 w-8 rounded object-contain border border-slate-200">` : ''}
          ${logoYayasan ? `<img src="${escHtml(logoYayasan)}" alt="yayasan" class="h-8 w-8 rounded object-contain border border-slate-200">` : ''}
        </div>
        <div>
          <p class="text-sm font-semibold text-slate-800">${escHtml(orgName || '-')}</p>
          <p class="text-xs text-slate-500">${escHtml(headerTitle || '-')} • ${escHtml(headerSubtitle || '-')}</p>
        </div>
      </div>
      <div class="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p class="text-xs text-slate-500">Hero</p>
        <p class="text-xs text-blue-600 font-semibold">${escHtml(heroBadge || '-')}</p>
        <p class="text-sm font-semibold text-slate-800">${escHtml(heroMain || '-')} <span class="text-blue-700">${escHtml(heroAccent || '')}</span></p>
      </div>
      <div class="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p class="text-xs text-slate-500">Footer</p>
        <p class="text-sm font-semibold text-slate-800">${escHtml(footerTitle || '-')}</p>
        <p class="text-xs text-slate-600">${escHtml(footerText || '-')}</p>
        <p class="text-xs text-slate-500">Copyright: ${escHtml(footerCopy || '-')}</p>
      </div>
      <div class="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p class="text-xs text-slate-500">Ringkasan Tentang Global</p>
        <p class="text-xs text-slate-700 mt-1">${escHtml(aboutSummary || '-')}</p>
      </div>
      <p class="text-xs text-slate-500">Tautan media sosial aktif: <span class="font-semibold text-slate-700">${socialCount}</span></p>
    </div>
  `;
}

function renderTentangGalleryEditor(items = []) {
  state.periodGallery = Array.isArray(items) ? items.map((it, idx) => ({
    title: it?.title || '',
    image_url: it?.image_url || '',
    caption: it?.caption || '',
    order: Number.isFinite(Number(it?.order)) ? Number(it.order) : idx
  })) : [];
  const wrap = document.getElementById('tentang-gallery-list');
  if (!wrap) return;
  if (!state.periodGallery.length) {
    wrap.innerHTML = '<div class="text-xs text-slate-400 border border-dashed border-slate-300 rounded-lg p-3">Belum ada item galeri.</div>';
    return;
  }
  wrap.innerHTML = state.periodGallery.map((item, idx) => `
    <div class="border border-slate-200 rounded-lg p-3 bg-white" data-gallery-index="${idx}">
      <div class="flex items-center justify-between mb-2">
        <p class="text-xs font-bold text-slate-600 uppercase tracking-wide">Item ${idx + 1}</p>
        <button type="button" class="text-xs bg-red-50 hover:bg-red-100 text-red-700 px-2 py-1 rounded" data-remove-gallery="${idx}">Hapus</button>
      </div>
      <div class="space-y-2">
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Judul</label>
          <input type="text" class="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs" data-gallery-title="${idx}" value="${escHtml(item.title || '')}">
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Caption</label>
          <input type="text" class="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs" data-gallery-caption="${idx}" value="${escHtml(item.caption || '')}">
        </div>
      </div>
      <div class="mt-3">
        <label class="block text-xs font-semibold text-slate-600 mb-1">Gambar</label>
        <div id="picker-gallery-${idx}"></div>
      </div>
    </div>
  `).join('');
  state.periodGallery.forEach((item, idx) => {
    createImagePicker(`picker-gallery-${idx}`, { initialUrl: item.image_url || '' });
  });
  renderTentangPreview();
}

function collectTentangGallery() {
  return state.periodGallery.map((_, idx) => {
    const title = (document.querySelector(`[data-gallery-title="${idx}"]`)?.value || '').trim();
    const caption = (document.querySelector(`[data-gallery-caption="${idx}"]`)?.value || '').trim();
    const imageURL = (pickerGetUrl(`picker-gallery-${idx}`) || '').trim();
    return {
      title,
      caption,
      image_url: imageURL,
      order: idx
    };
  }).filter(item => item.image_url);
}

document.addEventListener('input', (e) => {
  const t = e.target;
  if (!t) return;

  if (t.id === 'stat-simple-value' || t.matches('#stat-series-list input')) {
    const chartType = document.getElementById('stat-chart-type')?.value || 'bar';
    try {
      const value = collectStatInputValue(chartType);
      document.getElementById('stat-value').value = value;
      renderStatPreview(chartType, value);
    } catch (_) {
      renderStatPreview(chartType, '');
    }
    return;
  }

  if (['tentang-tagline-title', 'tentang-tagline-subtitle', 'tentang-tagline-desc'].includes(t.id)) {
    renderTentangPreview();
    return;
  }

  if (['global-orgname', 'global-header-title', 'global-header-subtitle', 'global-hero-badge', 'global-hero-title-main', 'global-hero-title-accent', 'global-footer-title', 'global-footer-copy', 'global-footer-text', 'sm-instagram', 'sm-twitter', 'sm-facebook', 'sm-youtube', 'sm-linkedin', 'sm-tiktok'].includes(t.id)) {
    renderGlobalPreview();
  }
});


// ── FAQ GLOBAL & PERIODE ──────────────────────────────────────────────────

function initFAQSorable(pLabel) {
  const tb = document.getElementById('faq-global-tbody');
  if(!tb) return;
  
  if (tb._sortable) tb._sortable.destroy();
  tb._sortable = Sortable.create(tb, {
    animation: 180,
    handle: '.faq-drag',
    onEnd: async () => {
      const rows = tb.querySelectorAll('.faq-row');
      const updates = [];
      rows.forEach((row, index) => {
        const id = row.getAttribute('data-id');
        const f = state.faqs.find(x => x.id === id);
        if(f && f.order !== index) {
            f.order = index;
            updates.push( api('PUT', '/api/cms/faqs/' + id, f) );
        }
      });
      if(updates.length > 0) {
        try {
            await Promise.all(updates);
        } catch(e) {
            uiAlert('Gagal mengurutkan FAQ: ' + e.message);
        }
      }
    }
  });
}
function loadFAQs(pLabel, page, search) {
  page = page || (state._faqPage || 1); search = search !== undefined ? search : (state._faqSearch || '');
  state._faqPage = page; state._faqSearch = search;
  const isGlobal = (pLabel === 'GLOBAL');
  const tb = document.getElementById('faq-global-tbody');
  api('GET', '/api/cms/faqs?period=' + encodeURIComponent(pLabel) + '&page=' + page + '&per_page=20&search=' + encodeURIComponent(search)).then(function(data) {
    var items = data.items || [];
    state.faqs = items;
    if (!items.length) {
      tb.innerHTML = '<tr><td colspan="4" class="p-6 text-center text-slate-400">Tidak ada data</td></tr>';
    } else {
      tb.innerHTML = items.map(f => `
        <tr class="border-b border-slate-100 hover:bg-slate-50 transition faq-row" data-id="${f.id}">
          <td class="p-4 align-middle w-10 cursor-move faq-drag text-slate-400 hover:text-slate-600"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"/></svg></td>
          <td class="p-4 align-middle font-medium">${escHtml((f.question||'').substring(0,30))}...</td>
          <td class="p-4 align-middle">${escHtml((f.answer||'').substring(0,30))}...</td>
                  <td class="p-4 align-middle text-right">
            <button onclick="editFAQ('${f.id}','${pLabel}')" class="text-blue-600 p-1 bg-blue-50 border rounded mr-1">Edit</button>
            <button onclick="deleteFAQ('${f.id}','${pLabel}')" class="text-red-600 p-1 bg-red-50 border rounded">Hapus</button>
          </td>
        </tr>
      `).join('');
      initFAQSorable(pLabel);
    }
    var pagEl = document.getElementById('faq-pagination'); if (pagEl) pagEl.innerHTML = pagHTML('faq', data.page, data.pages);
  }).catch(function(e) { tb.innerHTML = `<tr><td colspan="3">${errHtml(e.message)}</td></tr>`; });
}
window.faqGoPage = function(p) {
  var isGlobal = (document.getElementById('faq-global-tbody')?.querySelector('tr')) ? true : false;
  var activeTab = document.querySelector('.faq-tab-btn.active');
  var pLabel = 'GLOBAL';
  if (activeTab && activeTab.dataset.label) pLabel = activeTab.dataset.label;
  if (!isGlobal && activeTab) pLabel = activeTab.dataset.label;
  loadFAQs(pLabel, p);
};
window.faqSearch = function(s) {
  debounceSearch('faq', function() {
    var activeTab = document.querySelector('.faq-tab-btn.active');
    var pLabel = activeTab && activeTab.dataset.label ? activeTab.dataset.label : 'GLOBAL';
    loadFAQs(pLabel, 1, s);
  });
};
function openFAQModal(pLabel) {
  document.getElementById('formFAQ').reset();
  document.getElementById('faq-id').value = '';
  document.getElementById('faq-period').value = pLabel;
  openModal('modalFAQ');
}
function editFAQ(id, pLabel) {
  const f = state.faqs.find(x => x.id === id);
  if(!f) return;
  document.getElementById('faq-id').value = f.id;
  document.getElementById('faq-period').value = f.period_label;
  document.getElementById('faq-question').value = f.question||'';
  document.getElementById('faq-answer').value = f.answer||'';
  openModal('modalFAQ');
}
async function deleteFAQ(id, pLabel) {
  if(!await uiConfirm('Hapus FAQ ini?', 'Konfirmasi Hapus', true)) return;
  await api('DELETE', '/api/cms/faqs/' + id);
  loadFAQs(pLabel, 1);
}
// ── STATISTIK ──────────────────────────────────────────────────────────

async function syncStats() {
    const cur = currentPeriod();
    if(!cur || cur === '_TEMPLATE_') return uiAlert("Pilih periode valid!");
  if(!await uiConfirm("Tarik template statistik global ke periode ini?", 'Konfirmasi Sinkronisasi')) return;
    try {
        await api('POST', '/api/cms/sync-stats', { period_label: cur });
        uiAlert("Berhasil menarik template.");
        loadStatistik();
    } catch(e) { uiAlert(e); }
}
function initStatsSortable(tbodyId) {
  const tb = document.getElementById(tbodyId);
  if (!tb) return;
  if (tb._sortable) tb._sortable.destroy();
  tb._sortable = Sortable.create(tb, {
    animation: 180,
    handle: '.stat-drag',
    onEnd: async () => {
      const rows = tb.querySelectorAll('tr[data-id]');
      for (let i = 0; i < rows.length; i++) {
        const id = rows[i].getAttribute('data-id');
        const source = [...(state.global_stats || []), ...(state.stats || [])].find(x => x.id === id);
        if (!source) continue;
        const payload = {
          ...source,
          order: i,
          template_id: source.template_id || source.id,
          chart_type: source.chart_type || 'bar',
          fillable: !!source.fillable,
          visible: source.visible !== false
        };
        await api('PUT', '/api/cms/stats/' + id, payload);
      }
      if (tbodyId === 'global-stats-tbody') loadGlobalStatsTab();
      else loadStatistik();
    }
  });
}

async function toggleTemplateFlag(id, key, checked) {
  const s = (state.global_stats || []).find(x => x.id === id);
  if (!s) return;
  const payload = {
    ...s,
    template_id: s.template_id || s.id,
    chart_type: s.chart_type || 'bar',
    fillable: key === 'fillable' ? checked : !!s.fillable,
    visible: key === 'visible' ? checked : s.visible !== false,
    period_label: '_TEMPLATE_'
  };
  await api('PUT', '/api/cms/stats/' + id, payload);
  loadGlobalStatsTab();
}

async function loadGlobalStatsTab() {
    const tb = document.getElementById('global-stats-tbody');
    try {
        const items = await api('GET', '/api/cms/stats?period=_TEMPLATE_');
        state.global_stats = items || [];
        tb.innerHTML = (items||[]).map(s => `
          <tr class="border-b border-slate-100 hover:bg-slate-50 transition" data-id="${s.id}">
            <td class="p-4 align-middle w-10 cursor-move stat-drag text-slate-400 hover:text-slate-600"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"/></svg></td>
            <td class="p-4 align-middle font-medium">${escHtml(s.label||'')}</td>
            <td class="p-4 align-middle text-slate-500">${escHtml(s.desc||'')}</td>
            <td class="p-4 align-middle text-xs">${escHtml((s.chart_type||'bar').toUpperCase())}</td>
            <td class="p-4 align-middle"><input type="checkbox" ${s.fillable ? 'checked' : ''} onchange="toggleTemplateFlag('${s.id}','fillable',this.checked)"></td>
            <td class="p-4 align-middle"><input type="checkbox" ${s.visible === false ? '' : 'checked'} onchange="toggleTemplateFlag('${s.id}','visible',this.checked)"></td>
            <td class="p-4 align-middle text-right">
              <button onclick="editGlobalStat('${s.id}')" class="text-blue-600 p-1 bg-blue-50 border rounded mr-1">Edit</button>
              <button onclick="deleteGlobalStat('${s.id}')" class="text-red-600 p-1 bg-red-50 border rounded">Hapus</button>
            </td>
          </tr>
        `).join('');
        if(!items || !items.length) tb.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-slate-500">Belum ada template. Tambahkan metrik.</td></tr>`;
        initStatsSortable('global-stats-tbody');
    } catch(e) {
        tb.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-red-500">${e}</td></tr>`;
    }
}

function openStatModalGlobal() {
  document.getElementById('formStatistik').reset();
  document.getElementById('modalStatistikTitle').textContent = 'Tambah Template Statistik';
  document.getElementById('stat-id').value = '';
  document.getElementById('stat-template-id').value = '';
  document.getElementById('stat-period').value = '_TEMPLATE_';
  document.getElementById('stat-value').value = '';
  document.getElementById('stat-value-wrap').classList.add('hidden');
  document.getElementById('stat-preview-wrap').classList.add('hidden');
  document.getElementById('stat-flags-wrap').classList.add('hidden');
  document.getElementById('stat-value').disabled = true;
  document.getElementById('stat-label').disabled = false;
  document.getElementById('stat-desc').disabled = false;
  document.getElementById('stat-chart-type').disabled = false;
  renderChartChoices('bar');
  document.getElementById('stat-fillable').checked = false;
  document.getElementById('stat-visible').checked = true;
  document.getElementById('stat-fillable').disabled = true;
  document.getElementById('stat-visible').disabled = true;
  openModal('modalStatistik');
}

function editGlobalStat(id) {
  const s = state.global_stats.find(x => x.id === id);
  if(!s) return;
  document.getElementById('modalStatistikTitle').textContent = 'Edit Template Statistik';
  document.getElementById('stat-id').value = s.id;
  document.getElementById('stat-template-id').value = s.template_id || s.id;
  document.getElementById('stat-period').value = s.period_label;
  document.getElementById('stat-label').value = s.label||'';
  document.getElementById('stat-value').value = s.value||'';
  document.getElementById('stat-desc').value = s.desc||'';
  renderChartChoices(s.chart_type || 'bar');
  document.getElementById('stat-fillable').checked = !!s.fillable;
  document.getElementById('stat-visible').checked = s.visible !== false;
  document.getElementById('stat-value-wrap').classList.add('hidden');
  document.getElementById('stat-preview-wrap').classList.add('hidden');
  document.getElementById('stat-flags-wrap').classList.remove('hidden');
  document.getElementById('stat-value').disabled = true;
  document.getElementById('stat-label').disabled = false;
  document.getElementById('stat-desc').disabled = false;
  document.getElementById('stat-chart-type').disabled = false;
  document.getElementById('stat-fillable').disabled = false;
  document.getElementById('stat-visible').disabled = false;
  openModal('modalStatistik');
}

async function deleteGlobalStat(id) {
  if(!await uiConfirm('Hapus template ini?', 'Konfirmasi Hapus', true)) return;
  try {
    await api('DELETE', '/api/cms/stats/' + id);
    loadGlobalStatsTab();
  } catch(e) { uiAlert(e); }
}

async function loadStatistik() {
  const cur = currentPeriod();
  if(!cur) return;
  const tb = document.getElementById('statistik-tbody');
  try {
    // Load template statistik with Fillable=true
    const templates = await api('GET', '/api/cms/stats?period=_TEMPLATE_');
    const fillableTemplates = (templates||[]).filter(t => t.fillable);
    
    // Load period statistik values
    const periodStats = await api('GET', '/api/cms/stats?period=' + cur);
    state.stats = periodStats || [];
    
    // Create map of period stats by template_id
    const statsMap = {};
    state.stats.forEach(s => {
      const templateId = s.template_id || s.id;
      statsMap[templateId] = s;
    });
    
    tb.innerHTML = fillableTemplates.map(template => {
      const stat = statsMap[template.id];
      const value = stat ? stat.value : '';
      return `
      <tr class="border-b border-slate-100 hover:bg-slate-50 transition" data-id="${template.id}">
        <td class="p-4 align-middle w-10 cursor-move stat-drag text-slate-400 hover:text-slate-600"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"/></svg></td>
        <td class="p-4 align-middle font-medium">${escHtml(template.label||'')}</td>
        <td class="p-4 align-middle">
          <p class="font-semibold text-slate-700">${escHtml(statValueDisplay(value, template.chart_type || 'bar'))}</p>
          <p class="text-xs text-slate-500 mt-1">Mode: ${escHtml(statChartMode(template.chart_type || 'bar'))}</p>
        </td>
        <td class="p-4 align-middle min-w-[120px]">
          <div class="rounded-md border border-slate-200 bg-slate-50 p-1.5">${chartPreviewSVG(template.chart_type || 'bar')}</div>
        </td>
        <td class="p-4 align-middle">${escHtml(template.desc||'')}</td>
        <td class="p-4 align-middle text-right">
          <button onclick="editStatPeriod('${template.id}')" class="text-blue-600 p-1 bg-blue-50 border rounded mr-1">Isi Nilai</button>
        </td>
      </tr>
    `}).join('');
    
    if(!fillableTemplates.length) {
      tb.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-slate-500">Belum ada template statistik yang dapat diisi. Buat template di Template Statistik terlebih dahulu.</td></tr>`;
    }
  } catch(e) { tb.innerHTML = `<tr><td colspan="6">${errHtml(e.message)}</td></tr>`; }
}

// Display formatted stat value based on chart type  
function statValueDisplay(value, chartType) {
  if (!value) return '-';
  try {
    const mode = statChartMode(chartType);
    if (mode === 'single') return value;
    
    // For series mode, try to parse and show summary
    try {
      const data = typeof value === 'string' ? JSON.parse(value) : value;
      if (Array.isArray(data)) {
        const count = data.length;
        return count === 1 ? `${data[0].label}: ${data[0].value}` : `${count} data points`;
      }
      return String(value).substring(0, 50);
    } catch(ex) {
      return String(value).substring(0, 50);
    }
  } catch(ex) {
    return String(value).substring(0, 50);
  }
}
function openStatModal() {
  const cur = currentPeriod();
  if(!cur) return uiAlert('Pilih periode dulu.');
  document.getElementById('formStatistik').reset();
  document.getElementById('modalStatistikTitle').textContent = 'Tambah Nilai Statistik Periode';
  document.getElementById('stat-id').value = '';
  document.getElementById('stat-template-id').value = '';
  document.getElementById('stat-period').value = cur;
  document.getElementById('stat-value-wrap').classList.remove('hidden');
  document.getElementById('stat-preview-wrap').classList.remove('hidden');
  document.getElementById('stat-flags-wrap').classList.add('hidden');
  document.getElementById('stat-value').disabled = false;
  document.getElementById('stat-label').disabled = true;
  document.getElementById('stat-desc').disabled = true;
  document.getElementById('stat-value').value = '';
  renderChartChoices('bar');
  renderStatValueInput('bar', '');
  renderStatPreview('bar', '');
  document.getElementById('stat-chart-type').disabled = true;
  document.getElementById('stat-fillable').disabled = true;
  document.getElementById('stat-visible').disabled = true;
  openModal('modalStatistik');
}
function editStatPeriod(templateId) {
  const cur = currentPeriod();
  if(!cur) return uiAlert('Pilih periode dulu.');
  
  // Find template
  const template = state.global_stats && state.global_stats.find(x => x.id === templateId);
  if(!template) return uiAlert('Template tidak ditemukan.');
  
  // Find existing period stat
  const existing = state.stats && state.stats.find(x => (x.template_id || x.id) === templateId);
  
  document.getElementById('formStatistik').reset();
  document.getElementById('modalStatistikTitle').textContent = 'Isi Nilai: ' + escHtml(template.label||'');
  document.getElementById('stat-id').value = existing ? existing.id : '';
  document.getElementById('stat-template-id').value = templateId;
  document.getElementById('stat-period').value = cur;
  document.getElementById('stat-label').value = template.label||'';
  document.getElementById('stat-value').value = existing ? existing.value : '';
  document.getElementById('stat-desc').value = template.desc||'';
  
  // Hide label, desc, type, flags - only show value input
  document.getElementById('stat-value-wrap').classList.remove('hidden');
  document.getElementById('stat-preview-wrap').classList.remove('hidden');
  document.getElementById('stat-flags-wrap').classList.add('hidden');
  
  // Hide label/desc/type inputs and disable chart type switching
  document.getElementById('stat-label').disabled = true;
  document.getElementById('stat-desc').disabled = true;
  document.getElementById('stat-chart-type').disabled = true;
  document.getElementById('stat-fillable').disabled = true;
  document.getElementById('stat-visible').disabled = true;
  document.getElementById('stat-value').disabled = false;
  
  // Setup value input UI
  renderChartChoices(template.chart_type || 'bar', true);
  renderStatValueInput(template.chart_type || 'bar', existing ? existing.value : '');
  renderStatPreview(template.chart_type || 'bar', existing ? existing.value : '');
  
  openModal('modalStatistik');
}

function editStat(id) {
  const s = state.stats.find(x => x.id === id);
  if(!s) return;
  document.getElementById('modalStatistikTitle').textContent = 'Edit Nilai Statistik Periode';
  document.getElementById('stat-id').value = s.id;
  document.getElementById('stat-template-id').value = s.template_id || s.id;
  document.getElementById('stat-period').value = s.period_label;
  document.getElementById('stat-label').value = s.label||'';
  document.getElementById('stat-value').value = s.value||'';
  document.getElementById('stat-desc').value = s.desc||'';
  renderChartChoices(s.chart_type || 'bar');
  document.getElementById('stat-fillable').checked = !!s.fillable;
  document.getElementById('stat-visible').checked = s.visible !== false;
  document.getElementById('stat-value-wrap').classList.remove('hidden');
  document.getElementById('stat-preview-wrap').classList.remove('hidden');
  document.getElementById('stat-flags-wrap').classList.add('hidden');
  document.getElementById('stat-value').disabled = false;
  document.getElementById('stat-label').disabled = true;
  document.getElementById('stat-desc').disabled = true;
  document.getElementById('stat-chart-type').disabled = true;
  document.getElementById('stat-fillable').disabled = true;
  document.getElementById('stat-visible').disabled = true;
  renderStatValueInput(s.chart_type || 'bar', s.value || '');
  renderStatPreview(s.chart_type || 'bar', s.value || '');
  openModal('modalStatistik');
}



// ── BROADCAST WIZARD ─────────────────────────────────────────────────────
let bcWs = null;
let qrRefreshTimer = null;
let bcCurrentStep = 1;
let bcSessionID = null;
let bcPreviewDebounce = null;
let bcContactRows = [];
let bcColumnHeaders = [];
let bcColumnLabels = [];
let bcUndoStack = [];
let bcRedoStack = [];
let bcSelRange = null;
let bcSelAnchor = null;
let bcSelecting = false;
let bcCurrentTab = 'connection';
let bcBroadcasting = false;
let bcLiveLogCount = 0;

function initBroadcast() {
  loadWAStatus();
  connectBCWebSocket();
  populatePeriodFilter();
  loadBCSession().then(function() {
    loadBCContacts();
  });
  loadBCHistory();
  bcGoToStep(1);
  document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); bcUndo(); }
    else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); bcRedo(); }
    else if ((e.ctrlKey || e.metaKey) && e.key === 'c' && bcSelRange) { e.preventDefault(); bcCopySelection(); }
  });
}

// -- Tab Switching --

function bcSwitchTab(tab) {
  if (bcBroadcasting && tab !== 'broadcast') return;
  bcCurrentTab = tab;
  document.querySelectorAll('.bc-tab-panel').forEach(function(el) { el.classList.add('hidden'); });
  document.querySelectorAll('.bc-tab-btn').forEach(function(el) {
    el.classList.remove('bg-white', 'text-blue-700', 'shadow-sm');
    el.classList.add('text-slate-500');
  });
  var panel = document.getElementById('bc-tab-' + tab);
  if (panel) panel.classList.remove('hidden');
  var btn = document.getElementById('bc-tab-btn-' + tab);
  if (btn) {
    btn.classList.remove('text-slate-500');
    btn.classList.add('bg-white', 'text-blue-700', 'shadow-sm');
  }
  if (tab === 'log') loadBCHistory();
}

function bcToggleHelp() {
  var modal = document.getElementById('bc-help-modal');
  if (!modal) return;
  if (modal.classList.contains('hidden')) {
    modal.classList.remove('hidden');
    var hc = document.getElementById('bc-help-content');
    if (hc && !hc.dataset.loaded) {
      hc.dataset.loaded = '1';
      var L = String.fromCharCode(123,123), R = String.fromCharCode(125,125);
      var ex = function(t) { return '<span class="text-blue-600">' + t + '</span>'; };
      var cm = function(t) { return '<code class="bg-slate-200 text-slate-800 px-1 rounded text-xs">' + t + '</code>'; };
      var res = function(t) { return '<span class="text-green-600 font-semibold">' + t + '</span>'; };
      // Get first contact's data for live examples
      var sample = {};
      if (bcContactRows.length > 0) {
        bcColumnHeaders.forEach(function(h) { sample[h] = bcContactRows[0][h] || ''; });
      }
      var colInfo = bcColumnHeaders.map(function(h, i) {
        var label = bcColumnLabels[i] || h;
        var val = sample[h] || '(kosong)';
        return '<tr><td class="pr-3 py-0.5 font-mono text-blue-600 whitespace-nowrap">' + ex(L + h + R) + '</td><td class="pr-3 py-0.5 text-slate-400 text-xs">' + escHtml(label) + '</td><td class="py-0.5 text-slate-700 text-xs truncate max-w-[180px]" title="' + escHtml(val) + '">' + escHtml(val) + '</td></tr>';
      }).join('');
      var sWrap = function(label, template, output) {
        return '<div class="mb-3"><div class="text-[10px] text-slate-400 mb-0.5">' + label + '</div>'
          + '<div class="bg-slate-800 text-slate-200 rounded p-2 font-mono text-[11px] whitespace-pre-wrap leading-relaxed">' + template + '</div>'
          + '<div class="mt-0.5 flex items-start gap-1"><span class="text-slate-400 text-[10px]">&#8594;</span><div class="bg-green-50 border border-green-200 rounded p-1.5 font-mono text-[11px] text-green-800 whitespace-pre-wrap flex-1">' + (output || res('(kosong)')) + '</div></div></div>';
      };
      var s = sample;
      var evalEx = function(tmpl) {
        try { return renderBCTemplateJS(tmpl, JSON.parse(JSON.stringify(sample))); } catch(e) { return '(error)'; }
      };
      hc.innerHTML =
        '<div class="flex gap-3" style="min-height:400px">'
        // LEFT COLUMN — Syntax Reference
        + '<div class="flex-1 min-w-0 space-y-4 text-xs">'
        // Variables
        + '<div>'
        + '<h4 class="font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">'
        + '<span class="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.5 rounded font-mono">' + L + 'var' + R + '</span> Variabel</h4>'
        + '<p class="text-slate-500 mb-1">Sisipkan nilai kolom kontak.</p>'
        + '<div class="bg-slate-50 border border-slate-200 rounded p-2 font-mono text-[11px]">Halo ' + ex(L + 'nickname' + R) + '!</div></div>'
        // Filters
        + '<div>'
        + '<h4 class="font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">'
        + '<span class="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0.5 rounded font-mono">' + L + 'var|filter' + R + '</span> Filter</h4>'
        + '<div class="bg-slate-50 border border-slate-200 rounded p-2 font-mono text-[11px] space-y-0.5">'
        + '<p>' + ex(L + 'var|uppercase' + R) + ' <span class="text-slate-400">kapital semua</span></p>'
        + '<p>' + ex(L + 'var|lowercase' + R) + ' <span class="text-slate-400">kecil semua</span></p>'
        + '<p>' + ex(L + 'var|capitalize' + R) + ' <span class="text-slate-400">kapital pertama</span></p>'
        + '<p>' + ex(L + 'var|titlecase' + R) + ' <span class="text-slate-400">Title Case</span></p>'
        + '<p>' + ex(L + 'var|trim' + R) + ' <span class="text-slate-400">hapus spasi</span></p>'
        + '<p>' + ex(L + 'var|length' + R) + ' <span class="text-slate-400">jumlah karakter</span></p>'
        + '<p>' + ex(L + 'var|default:"fb"' + R) + ' <span class="text-slate-400">fallback</span></p>'
        + '<p>' + ex(L + 'var|slice:"0,6"' + R) + ' <span class="text-slate-400">potong teks</span></p>'
        + '<p>' + ex(L + 'var|replace:"a,b"' + R) + ' <span class="text-slate-400">ganti teks</span></p>'
        + '<p>' + ex(L + 'var|repeat:3' + R) + ' <span class="text-slate-400">ulang Nx</span></p>'
        + '</div></div>'
        // Set & Math
        + '<div>'
        + '<h4 class="font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">'
        + '<span class="bg-teal-100 text-teal-700 text-[10px] px-1.5 py-0.5 rounded font-mono">' + L + 'set' + R + '</span> '
        + '<span class="bg-orange-100 text-orange-700 text-[10px] px-1.5 py-0.5 rounded font-mono">' + L + 'var+N' + R + '</span> Set & Math</h4>'
        + '<div class="bg-slate-50 border border-slate-200 rounded p-2 font-mono text-[11px] space-y-0.5">'
        + '<p>' + ex(L + 'set x="Halo"' + R) + ' <span class="text-slate-400">definisi variabel</span></p>'
        + '<p>' + ex(L + 'angkatan + 1' + R) + ' <span class="text-slate-400">tambah</span></p>'
        + '<p>' + ex(L + 'angkatan - 4' + R) + ' <span class="text-slate-400">kurang</span></p>'
        + '</div></div>'
        // Conditionals
        + '<div>'
        + '<h4 class="font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">'
        + '<span class="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0.5 rounded font-mono">' + L + 'if' + R + '</span> Kondisional</h4>'
        + '<p class="text-slate-500 mb-1">Bersarang (nested) didukung. ' + cm(L + 'else' + R) + ' opsional.</p>'
        + '<div class="bg-slate-50 border border-slate-200 rounded p-2 font-mono text-[11px] whitespace-pre-wrap leading-relaxed">'
        + ex(L + 'if angkatan == "2022"' + R) + '\n  Freshman!\n' + ex(L + 'else' + R) + '\n  Senior!\n' + ex(L + 'endif' + R)
        + '</div>'
        + '<div class="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] text-slate-500">'
        + '<div><b class="text-slate-600">Perbandingan:</b></div><div>' + cm('==') + ' ' + cm('!=') + ' ' + cm('>') + ' ' + cm('>=') + ' ' + cm('<') + ' ' + cm('<=') + '</div>'
        + '<div><b class="text-slate-600">Teks:</b></div><div>' + cm('contains') + ' ' + cm('!contains') + ' ' + cm('startswith') + ' ' + cm('!startswith') + ' ' + cm('endswith') + ' ' + cm('!endswith') + '</div>'
        + '<div><b class="text-slate-600">Regex:</b></div><div>' + cm('matches') + ' ' + cm('!matches') + '</div>'
        + '<div><b class="text-slate-600">Keberadaan:</b></div><div>' + cm('empty') + ' ' + cm('notempty') + '</div>'
        + '</div></div>'
        + '</div>'
        // RIGHT COLUMN — Live Examples with current data
        + '<div class="flex-1 min-w-0 space-y-3 text-xs">'
        + '<div class="bg-blue-50 border border-blue-200 rounded-lg p-2">'
        + '<h4 class="font-bold text-blue-800 mb-1 text-[10px]">Kolom Tersedia (kontak pertama)</h4>'
        + '<table class="w-full text-[11px]">' + colInfo + '</table></div>'
        // Live examples
        + sWrap('Variabel dasar', ex(L + 'full_name|titlecase' + R) + ' (' + ex(L + 'nickname' + R) + ')', evalEx('{{full_name|titlecase}} ({{nickname}})'))
        + sWrap('Filter default', ex(L + 'position|default:"Anggota"' + R), evalEx('{{position|default:"Anggota"}}'))
        + sWrap('Math', 'Gen ' + ex(L + 'angkatan + 4' + R), evalEx('Gen {{angkatan + 4}}'))
        + sWrap('Kondisional == (true)', ex(L + 'if angkatan == "2022"' + R) + '\\nAngkatan 2022!' + ex(L + 'else' + R) + '\\nLain' + ex(L + 'endif' + R), evalEx('{{if angkatan == "2022"}}Angkatan 2022!{{else}}Lain{{endif}}'))
        + sWrap('Kondisional empty', ex(L + 'if position empty' + R) + '\\nNo jabatan' + ex(L + 'endif' + R), evalEx('{{if position empty}}No jabatan{{endif}}'))
        + sWrap('Kondisional contains', ex(L + 'if fakultas contains "Tek"' + R) + '\\nFak. Teknik' + ex(L + 'else' + R) + '\\nLain' + ex(L + 'endif' + R), evalEx('{{if fakultas contains "Tek"}}Fak. Teknik{{else}}Lain{{endif}}'))
        + sWrap('Nested kondisional', ex(L + 'if angkatan == "2022"' + R) + '\\n' + ex(L + 'if fakultas contains "Tek"' + R) + '\\nTI 22' + ex(L + 'else' + R) + '\\nNon-Tek 22' + ex(L + 'endif' + R) + '\\n' + ex(L + 'else' + R) + '\\nNon-2022' + ex(L + 'endif' + R), evalEx('{{if angkatan == "2022"}}{{if fakultas contains "Tek"}}TI 22{{else}}Non-Tek 22{{endif}}{{else}}Non-2022{{endif}}'))
        + sWrap('Regex matches', ex(L + 'if phone matches "^0817"' + R) + '\\nPrefix 0817!' + ex(L + 'else' + R) + '\\nLain' + ex(L + 'endif' + R), evalEx('{{if phone matches "^0817"}}Prefix 0817!{{else}}Lain{{endif}}'))
        + sWrap('Template lengkap', ex(L + 'set salam="Halo"' + R) + '\\n' + ex(L + 'salam' + R) + ', ' + ex(L + 'full_name|titlecase' + R) + '!\\n' + ex(L + 'if position notempty' + R) + '\\n' + ex(L + 'position' + R) + ' di ' + ex(L + 'department' + R) + '\\n' + ex(L + 'else' + R) + '\\nAnggota ' + ex(L + 'department' + R) + '\\n' + ex(L + 'endif' + R),
          evalEx('{{set salam="Halo"}}\n{{salam}}, {{full_name|titlecase}}!\n{{if position notempty}}{{position}} di {{department}}\n{{else}}Anggota {{department}}\n{{endif}}'))
        + '</div>'
        + '</div>';
    }
  } else {
    modal.classList.add('hidden');
  }
}

function bcCopyLLMContext() {
  if (!bcColumnHeaders || !bcColumnHeaders.length) { uiAlert('Belum ada data kontak.'); return; }
  var sample = {};
  if (bcContactRows.length > 0) {
    bcColumnHeaders.forEach(function(h) { sample[h] = bcContactRows[0][h] || ''; });
  }
  var cols = bcColumnHeaders.map(function(h, i) {
    return '  - ' + h + ' (label: "' + (bcColumnLabels[i] || h) + '") = ' + (sample[h] || '(kosong)');
  }).join('\n');
  var ctx = '# Template Broadcast PKSE UGM\n\n'
    + '## Data Columns (from first contact)\n' + cols + '\n\n'
    + '## Template Syntax Rules\n'
    + '- Variable: {{column_name}}\n'
    + '- Filters: {{col|uppercase}}, {{col|lowercase}}, {{col|capitalize}}, {{col|titlecase}}, {{col|trim}}, {{col|length}}, {{col|default:"fallback"}}, {{col|slice:"start,end"}}, {{col|replace:"find,replace"}}, {{col|repeat:N}}\n'
    + '- Math: {{col + N}}, {{col - N}}\n'
    + '- Set variable: {{set var="value"}} then use {{var}}\n'
    + '- Conditionals (support nesting):\n'
    + '  {{if col == "val"}}...{{else}}...{{endif}}\n'
    + '  {{if col != "val"}}...{{endif}}\n'
    + '  {{if col contains "val"}}...{{endif}}\n'
    + '  {{if col startswith "val"}}...{{endif}}\n'
    + '  {{if col endswith "val"}}...{{endif}}\n'
    + '  {{if col matches "regex"}}...{{endif}}\n'
    + '  {{if col empty}}...{{endif}}\n'
    + '  {{if col notempty}}...{{endif}}\n'
    + '  {{if col > "val"}}...{{endif}}\n'
    + '  {{if col >= "val"}}...{{endif}}\n'
    + '  {{if col < "val"}}...{{endif}}\n'
    + '  {{if col <= "val"}}...{{endif}}\n\n'
    + '## Task\n'
    + 'Using the data columns above, generate a WhatsApp broadcast message template using the syntax rules.\n'
    + 'Use conditionals to handle different cases (e.g., empty fields, different departments, etc.).\n'
    + 'Only output the template text, nothing else.\n';
  navigator.clipboard.writeText(ctx).then(function() {
    uiAlert('Context berhasil disalin ke clipboard!');
  }).catch(function() {
    // Fallback
    var ta = document.createElement('textarea');
    ta.value = ctx; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta);
    uiAlert('Context berhasil disalin ke clipboard!');
  });
}


function bcLockBroadcast() {
  bcBroadcasting = true;
  var lock = document.getElementById('bc-send-lock');
  if (lock) lock.classList.remove('hidden');
  var liveProgress = document.getElementById('bc-live-progress');
  if (liveProgress) liveProgress.classList.remove('hidden');
  bcLiveLogCount = 0;
  var logEl = document.getElementById('bc-live-log');
  if (logEl) logEl.innerHTML = '';
}

function bcUnlockBroadcast() {
  bcBroadcasting = false;
  var lock = document.getElementById('bc-send-lock');
  if (lock) lock.classList.add('hidden');
  var liveProgress = document.getElementById('bc-live-progress');
  if (liveProgress) liveProgress.classList.add('hidden');
  var btn = document.getElementById('bc-send-btn');
  if (btn) { btn.disabled = false; btn.classList.remove('opacity-50'); }
}

function bcAddLiveLogEntry(phone, status, error) {
  var logEl = document.getElementById('bc-live-log');
  if (!logEl) return;
  bcLiveLogCount++;
  var ok = status === 'sent';
  var icon = ok ? '<span class="text-green-500 flex-shrink-0">&#10003;</span>' : '<span class="text-red-500 flex-shrink-0">&#10007;</span>';
  var errText = error ? '<span class="text-red-400 truncate max-w-[200px]"> — ' + escHtml(error) + '</span>' : '';
  var div = document.createElement('div');
  div.className = 'bc-log-entry flex items-center gap-2 text-xs py-1 px-2 rounded ' + (ok ? 'bg-green-50' : 'bg-red-50');
  div.innerHTML = '<span class="text-slate-400 w-6 text-right flex-shrink-0">' + bcLiveLogCount + '</span>' + icon + '<span class="text-slate-700 font-mono">' + escHtml(phone) + '</span>' + errText;
  logEl.appendChild(div);
  logEl.scrollTop = logEl.scrollHeight;
}

// ── Step Navigation ──────────────────────────────────────────────────────

function bcGoToStep(step) {
  if (step > bcCurrentStep) {
    if (!validateBCStep(bcCurrentStep)) return;
    saveBCSession();
  } else if (step < bcCurrentStep) {
    saveBCSession();
  }
  bcCurrentStep = step;
  document.querySelectorAll('.bc-step-panel').forEach(function(el) { el.classList.add('hidden'); });
  var panel = document.getElementById('bc-step-' + step);
  if (panel) panel.classList.remove('hidden');
  updateStepIndicators(step);
  if (step === 2) {
    renderBCVarChips();
    renderBCPreviewRowSelector();
    renderBCTestContactSelector();
    startLivePreview();
  }
  if (step === 3) {
    updateBCSendSummary();
  }
}

function updateStepIndicators(currentStep) {
  for (var i = 1; i <= 3; i++) {
    var ind = document.getElementById('step-ind-' + i);
    if (!ind) continue;
    var numEl = ind.querySelector('.step-num');
    if (i < currentStep) {
      ind.className = 'bc-step-ind flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500 text-white text-xs sm:text-sm font-medium';
      if (numEl) { numEl.className = 'step-num w-5 h-5 rounded-full bg-white text-green-500 text-xs flex items-center justify-center font-bold'; numEl.textContent = '\u2713'; }
    } else if (i === currentStep) {
      ind.className = 'bc-step-ind flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600 text-white text-xs sm:text-sm font-medium';
      if (numEl) { numEl.className = 'step-num w-5 h-5 rounded-full bg-white text-blue-600 text-xs flex items-center justify-center font-bold'; numEl.textContent = i; }
    } else {
      ind.className = 'bc-step-ind flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-200 text-slate-500 text-xs sm:text-sm font-medium';
      if (numEl) { numEl.className = 'step-num w-5 h-5 rounded-full bg-slate-300 text-slate-500 text-xs flex items-center justify-center font-bold'; numEl.textContent = i; }
    }
  }
}

function validateBCStep(step) {
  if (step === 1) {
    var selected = bcContactRows.filter(function(r) { return r._selected; });
    if (selected.length === 0) {
      uiAlert('Pilih minimal 1 kontak (centang baris).');
      return false;
    }
    return true;
  }
  if (step === 2) {
    var tmpl = document.getElementById('bc-template');
    if (!tmpl || !tmpl.value.trim()) {
      uiAlert('Template pesan tidak boleh kosong.');
      return false;
    }
    return true;
  }
  return true;
}

function updateBCSendSummary() {
  var selected = bcContactRows.filter(function(r) { return r._selected; });
  var el = document.getElementById('bc-selected-count');
  if (el) el.textContent = selected.length;
}

// ── Session Persistence ──────────────────────────────────────────────────

async function loadBCSession() {
  try {
    var data = await api('GET', '/api/broadcast/session');
    if (data && data.session && data.session.id) {
      bcSessionID = data.session.id;
      if (data.session.columns && data.session.columns.length > 0) {
        bcColumnHeaders = data.session.columns || [];
        bcColumnLabels = data.session.labels || data.session.columns || [];
        bcContactRows = (data.session.rows || []).map(function(r) {
          var row = {};
          for (var k in r) { if (r.hasOwnProperty(k)) row[k] = r[k]; }
          row._selected = false;
          return row;
        });
      }
      if (data.session.template) {
        var tmpl = document.getElementById('bc-template');
        if (tmpl) tmpl.value = data.session.template;
      }
      if (data.session.delay_ms) {
        var delayEl = document.getElementById('bc-delay');
        if (delayEl) delayEl.value = Math.round(data.session.delay_ms / 1000);
      }
    }
  } catch(e) { /* start fresh */ }
}

async function saveBCSession() {
  try {
    var rows = bcContactRows.map(function(r) {
      var clean = {};
      for (var k in r) { if (r.hasOwnProperty(k) && k !== '_selected') clean[k] = r[k]; }
      return clean;
    });
    var tmpl = document.getElementById('bc-template');
    var delayEl = document.getElementById('bc-delay');
    var body = {
      columns: bcColumnHeaders,
      labels: bcColumnLabels,
      rows: rows,
      template: tmpl ? tmpl.value : '',
      delay_ms: delayEl ? (parseInt(delayEl.value) || 3) * 1000 : 3000,
      period: window.PERIOD || ''
    };
    if (bcSessionID) body.session_id = bcSessionID;
    var data = await api('PUT', '/api/broadcast/session', body);
    if (data && data.session_id) bcSessionID = data.session_id;
  } catch(e) { /* non-critical */ }
}

// ── WhatsApp Connection ──────────────────────────────────────────────────

async function loadWAStatus() {
  try {
    var data = await api('GET', '/api/broadcast/status');
    var dot = document.getElementById('wa-status-dot');
    var txt = document.getElementById('wa-status-text');
    var qrContainer = document.getElementById('wa-qr-container');
    if (data.connected) {
      dot.className = 'w-3 h-3 rounded-full bg-green-500';
      txt.textContent = 'WhatsApp terhubung';
      if (qrContainer) qrContainer.classList.add('hidden');
      if (qrRefreshTimer) { clearInterval(qrRefreshTimer); qrRefreshTimer = null; }
    } else {
      dot.className = 'w-3 h-3 rounded-full bg-red-500';
      txt.textContent = 'WhatsApp tidak terhubung';
      if (qrContainer) qrContainer.classList.remove('hidden');
      loadWAQR();
      if (!qrRefreshTimer) qrRefreshTimer = setInterval(loadWAQR, 15000);
    }
  } catch(e) {
    var d = document.getElementById('wa-status-dot');
    var t = document.getElementById('wa-status-text');
    if (d) d.className = 'w-3 h-3 rounded-full bg-slate-400';
    if (t) t.textContent = 'Service tidak tersedia';
  }
}

async function loadWAQR() {
  try {
    var resp = await fetch('/api/broadcast/qr');
    if (resp.ok && resp.headers.get('content-type') && resp.headers.get('content-type').startsWith('image/')) {
      var blob = await resp.blob();
      var img = document.getElementById('wa-qr-img');
      if (img) img.src = URL.createObjectURL(blob);
      var c = document.getElementById('wa-qr-container');
      if (c) c.classList.remove('hidden');
    }
  } catch(e) {}
}

async function disconnectWA() {
  if (!await uiConfirm('Disconnect WhatsApp?')) return;
  await api('POST', '/api/broadcast/disconnect');
  loadWAStatus();
}

// ── Period Filter ─────────────────────────────────────────────────────────

function populatePeriodFilter() {
  var sel = document.getElementById('bc-contact-filter');
  if (!sel) return;
  var current = window.PERIOD || '';
  api('GET', '/api/periods').then(function(periods) {
    if (!periods || !Array.isArray(periods)) return;
    sel.innerHTML = '<option value="ALL">Semua Periode</option>';
    periods.forEach(function(p) {
      var opt = document.createElement('option');
      opt.value = p.label || p.Label;
      opt.textContent = p.display_name || p.DisplayName || p.label || p.Label;
      if ((p.label || p.Label) === current) opt.selected = true;
      sel.appendChild(opt);
    });
  }).catch(function() {});
}

// ── Contact Management ───────────────────────────────────────────────────

async function loadBCContacts() {
  try {
    var filterEl = document.getElementById('bc-contact-filter');
    var period = filterEl ? filterEl.value : (window.PERIOD || 'ALL');
    var contacts = await api('GET', '/api/broadcast/anggota-contacts?period=' + encodeURIComponent(period));
    if (!contacts || !Array.isArray(contacts)) {
      if (bcContactRows.length === 0) { bcColumnHeaders = []; bcColumnLabels = []; }
      renderBCContactsTable();
      return;
    }
    // Save existing selection state by phone
    var existingSel = {};
    bcContactRows.forEach(function(r) { if (r._selected && r.phone) existingSel[r.phone] = true; });
    bcContactRows = [];
    bcColumnHeaders = [];
    bcColumnLabels = [];
    if (contacts.length > 0) {
      var colMap = {
        'full_name': 'Nama', 'nickname': 'Nickname', 'phone': 'No. HP',
        'department': 'Kementerian', 'position': 'Jabatan',
        'program_studi': 'Program Studi', 'fakultas': 'Fakultas', 'angkatan': 'Angkatan'
      };
      for (var key in contacts[0]) {
        if (!contacts[0].hasOwnProperty(key)) continue;
        bcColumnHeaders.push(key);
        bcColumnLabels.push(colMap[key] || key);
      }
    }
    contacts.forEach(function(c) {
      var row = {};
      bcColumnHeaders.forEach(function(h) {
        var val = c[h] !== undefined ? c[h] : '';
        if (!val) {
          // try snake_case variant
          var snake = h.replace(/([A-Z])/g, function(m) { return '_' + m.toLowerCase(); });
          val = c[snake] !== undefined ? c[snake] : '';
        }
        row[h] = val;
      });
      row._selected = !!existingSel[row.phone];
      bcContactRows.push(row);
    });
    renderBCContactsTable();
  } catch(e) {
    renderBCContactsTable();
  }
}

// ── Undo / Redo ──────────────────────────────────────────────────
function bcSnapshot() {
  return {
    rows: bcContactRows.map(function(r) { var o = {}; for (var k in r) o[k] = r[k]; return o; }),
    headers: bcColumnHeaders.slice(),
    labels: bcColumnLabels.slice()
  };
}
function bcRestore(snap) {
  bcContactRows = snap.rows;
  bcColumnHeaders = snap.headers;
  bcColumnLabels = snap.labels;
  renderBCContactsTable();
  saveBCSession();
}
function bcPushUndo() {
  bcUndoStack.push(bcSnapshot());
  bcRedoStack = [];
}
function bcUndo() {
  if (bcUndoStack.length === 0) return;
  bcRedoStack.push(bcSnapshot());
  bcRestore(bcUndoStack.pop());
}
function bcRedo() {
  if (bcRedoStack.length === 0) return;
  bcUndoStack.push(bcSnapshot());
  bcRestore(bcRedoStack.pop());
}

// ── Cell Selection ──────────────────────────────────────────────────────
function bcNormRange(r) {
  var r1 = Math.min(r.startRow, r.endRow), r2 = Math.max(r.startRow, r.endRow);
  var c1 = Math.min(r.startCol, r.endCol), c2 = Math.max(r.startCol, r.endCol);
  return {r1:r1, c1:c1, r2:r2, c2:c2};
}
function bcIsCellSelected(ri, ci) {
  if (!bcSelRange) return false;
  var n = bcNormRange(bcSelRange);
  return ri >= n.r1 && ri <= n.r2 && ci >= n.c1 && ci <= n.c2;
}
function bcSetSelection(sr, sc, er, ec) {
  bcSelRange = {startRow:sr, startCol:sc, endRow:er, endCol:ec};
  bcUpdateCellStyles();
}
function bcClearSelection() {
  bcSelRange = null;
  bcSelAnchor = null;
  bcUpdateCellStyles();
}
function bcUpdateCellStyles() {
  var tds = document.querySelectorAll('#bc-contacts-table td[data-row]');
  tds.forEach(function(td) {
    var ri = parseInt(td.getAttribute('data-row'));
    var col = td.getAttribute('data-col');
    var ci = bcColumnHeaders.indexOf(col);
    if (bcIsCellSelected(ri, ci)) td.classList.add('bg-blue-200');
    else td.classList.remove('bg-blue-200');
  });
}
var bcMouseDownPos = null;
function bcCellMouseDown(e, cell) {
  if (bcSelRange) { bcSelRange = null; bcSelAnchor = null; bcUpdateCellStyles(); }
  if (!cell.hasAttribute('data-row')) return;
  var ri = parseInt(cell.getAttribute('data-row'));
  var col = cell.getAttribute('data-col');
  var ci = bcColumnHeaders.indexOf(col);
  if (ci < 0) return;
  if (e.shiftKey && bcSelAnchor) {
    bcSetSelection(bcSelAnchor.row, bcSelAnchor.col, ri, ci);
  } else {
    bcMouseDownPos = {x: e.clientX, y: e.clientY, ri: ri, ci: ci};
  }
}
function bcCellMouseMove(e, cell) {
  if (!bcMouseDownPos || !(e.buttons & 1)) return;
  var dx = e.clientX - bcMouseDownPos.x, dy = e.clientY - bcMouseDownPos.y;
  if (!bcSelecting && (dx*dx + dy*dy) < 25) return;
  if (!bcSelecting) {
    bcSelecting = true;
    bcSelAnchor = {row: bcMouseDownPos.ri, col: bcMouseDownPos.ci};
    document.addEventListener('mouseup', bcCellMouseUp);
    document.addEventListener('selectstart', bcPreventSelect);
  }
  var ri = parseInt(cell.getAttribute('data-row'));
  var col = cell.getAttribute('data-col');
  var ci = bcColumnHeaders.indexOf(col);
  if (ci < 0) return;
  bcSetSelection(bcSelAnchor.row, bcSelAnchor.col, ri, ci);
}
function bcCellMouseUp() {
  bcMouseDownPos = null;
  bcSelecting = false;
  bcSelAnchor = null;
  bcUpdateCellStyles();
  document.removeEventListener('mouseup', bcCellMouseUp);
  document.removeEventListener('selectstart', bcPreventSelect);
}
function bcPreventSelect(e) { e.preventDefault(); }
function bcCopySelection() {
  if (!bcSelRange) return;
  var n = bcNormRange(bcSelRange);
  var lines = [];
  for (var ri = n.r1; ri <= n.r2; ri++) {
    if (ri >= bcContactRows.length) break;
    var vals = [];
    for (var ci = n.c1; ci <= n.c2; ci++) {
      if (ci >= bcColumnHeaders.length) break;
      vals.push(bcContactRows[ri][bcColumnHeaders[ci]] || '');
    }
    lines.push(vals.join('\t'));
  }
  navigator.clipboard.writeText(lines.join('\n')).catch(function(){});
}

// ── Delete Column ────────────────────────────────────────────────────────
async function deleteBCColumn(colIdx) {
  if (colIdx < 0 || colIdx >= bcColumnHeaders.length) return;
  var key = bcColumnHeaders[colIdx];
  var label = bcColumnLabels[colIdx] || key;
  if (!await uiConfirm('Hapus kolom "' + label + '"?')) return;
  bcPushUndo();
  bcColumnHeaders.splice(colIdx, 1);
  bcColumnLabels.splice(colIdx, 1);
  bcContactRows.forEach(function(r) { delete r[key]; });
  bcClearSelection();
  renderBCContactsTable();
  saveBCSession();
}

function renderBCContactsTable() {
  var tbody = document.getElementById('bc-contacts-tbody');
  var countEl = document.getElementById('bc-contact-count');
  if (!tbody) return;
  var selectedCount = bcContactRows.filter(function(r) { return r._selected; }).length;
  var selCountEl = document.getElementById('bc-selected-count');
  if (selCountEl) selCountEl.textContent = selectedCount;
  if (countEl) countEl.textContent = bcContactRows.length + ' kontak' + (selectedCount > 0 ? ' (' + selectedCount + ' dipilih)' : '');

  if (bcContactRows.length === 0 || bcColumnHeaders.length === 0) {
    var colspan = Math.max(bcColumnHeaders.length + 2, 3);
    tbody.innerHTML = '<tr><td colspan="' + colspan + '" class="text-center text-slate-400 py-8 text-sm">Tidak ada kontak. Tambahkan baris manual atau paste CSV.</td></tr>';
    renderBCHeaders();
    return;
  }

  tbody.innerHTML = bcContactRows.map(function(row, ri) {
    var cells = bcColumnHeaders.map(function(col, ci) {
      var val = row[col] || '';
      var selCls = bcIsCellSelected(ri, ci) ? ' bg-blue-200' : '';
      return '<td class="px-2 py-1 border-r border-slate-100 last:border-r-0' + selCls + '" contenteditable="true" data-row="' + ri + '" data-col="' + escHtml(col) + '" onmousedown="bcCellMouseDown(event,this)" onmousemove="bcCellMouseMove(event,this)" onblur="onBCCellEdit(this,' + ri + ',\'' + escHtml(col) + '\')" onkeydown="onBCellKey(event,this)" onpaste="onBCCellPaste(event,this)">' + escHtml(val) + '</td>';
    }).join('');
    return '<tr class="border-t border-slate-100 hover:bg-blue-50/50">' +
      '<td class="px-2 py-1 text-center w-8"><input type="checkbox" ' + (row._selected ? 'checked' : '') + ' onchange="bcContactRows[' + ri + ']._selected=this.checked;renderBCContactsTable()" class="rounded"></td>' +
      cells +
      '<td class="px-2 py-1 text-center w-10"><button onclick="deleteBCRow(' + ri + ')" class="text-red-400 hover:text-red-600 text-xs p-1" title="Hapus">&times;</button></td>' +
      '</tr>';
  }).join('');
  renderBCHeaders();

}

function renderBCHeaders() {
  var thead = document.querySelector('#bc-contacts-table thead tr');
  if (!thead) return;
  var html = '<th class="px-3 py-2 w-8 text-center"><input type="checkbox" onchange="toggleAllBCRows(this.checked)" class="rounded" title="Pilih semua"></th>';
  bcColumnHeaders.forEach(function(col, ci) {
    var label = bcColumnLabels[ci] || col;
    html += '<th class="px-3 py-2 min-w-[120px] cursor-pointer hover:text-blue-600 select-none whitespace-nowrap group" ondblclick="renameBCColumn(' + ci + ')" title="Double-click untuk rename variabel">' + escHtml(label) + '<button onclick="event.stopPropagation();deleteBCColumn(' + ci + ')" class="ml-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 text-xs transition" title="Hapus kolom">&times;</button></th>';
  });
  html += '<th class="px-3 py-2 w-10"></th>';
  thead.innerHTML = html;
}

function onBCCellEdit(el, rowIdx, colKey) {
  bcPushUndo();
  if (bcContactRows[rowIdx]) {
    bcContactRows[rowIdx][colKey] = el.textContent;
  }
}

function onBCellKey(event, el) {
  if (event.key === 'Enter') { event.preventDefault(); el.blur(); }
}

function toggleAllBCRows(checked) {
  bcContactRows.forEach(function(r) { r._selected = checked; });
  renderBCContactsTable();
}

function addBCRow() {
  bcPushUndo();
  var row = { _selected: true };
  bcColumnHeaders.forEach(function(h) { row[h] = ''; });
  bcContactRows.push(row);
  renderBCContactsTable();
}

async function addBCColumn() {
  bcPushUndo();
  var name = await uiPrompt('Nama kolom baru:');
  if (!name || !name.trim()) return;
  var key = name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_');
  if (!key) { key = 'col_' + bcColumnHeaders.length; }
  if (bcColumnHeaders.indexOf(key) >= 0) {
    uiAlert('Kolom "' + key + '" sudah ada.');
    return;
  }
  bcColumnHeaders.push(key);
  bcColumnLabels.push(name.trim());
  bcContactRows.forEach(function(row) { row[key] = ''; });
  renderBCContactsTable();
}

function deleteBCRow(idx) {
  bcPushUndo();
  bcContactRows.splice(idx, 1);
  renderBCContactsTable();
}

async function renameBCColumn(colIdx) {
  bcPushUndo();
  var key = bcColumnHeaders[colIdx];
  var currentLabel = bcColumnLabels[colIdx] || key;
  var newLabel = await uiPrompt('Rename kolom "' + currentLabel + '":', currentLabel);
  if (newLabel === null || !newLabel.trim() || newLabel.trim() === currentLabel) return;
  bcColumnLabels[colIdx] = newLabel.trim();
  var newKey = newLabel.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_');
  if (newKey && newKey !== key && bcColumnHeaders.indexOf(newKey) < 0) {
    bcContactRows.forEach(function(row) {
      if (row.hasOwnProperty(key)) { row[newKey] = row[key]; delete row[key]; }
    });
    bcColumnHeaders[colIdx] = newKey;
  }
  renderBCContactsTable();
}

function onBCCellPaste(e, cell) {
  bcPushUndo();
  var text = (e.clipboardData || window.clipboardData).getData('text');
  if (!text) return;
  e.preventDefault();
  e.stopPropagation();
  var startRow = parseInt(cell.getAttribute('data-row'));
  var startColIdx = bcColumnHeaders.indexOf(cell.getAttribute('data-col'));
  if (startColIdx < 0) return;
  var lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  var origRow = startRow, origCol = startColIdx;
  if (bcSelRange) { var n = bcNormRange(bcSelRange); origRow = n.r1; origCol = n.c1; }
  // First pass: determine needed dimensions
  var maxCols = 0;
  var parsedLines = [];
  for (var i = 0; i < lines.length; i++) {
    var vals = lines[i].split('\t');
    parsedLines.push(vals);
    if (vals.length > maxCols) maxCols = vals.length;
  }
  // Expand columns if needed (add unnamed-N for extras)
  while (bcColumnHeaders.length < origCol + maxCols) {
    bcColumnHeaders.push('unnamed-' + (bcColumnHeaders.length + 1));
    bcColumnLabels.push('unnamed-' + bcColumnHeaders.length);
  }
  // Expand rows if needed
  while (bcContactRows.length < origRow + lines.length) {
    var emptyRow = {};
    bcColumnHeaders.forEach(function(h) { emptyRow[h] = ''; });
    bcContactRows.push(emptyRow);
  }
  // Fill data
  for (var i = 0; i < parsedLines.length; i++) {
    var ri = origRow + i;
    for (var vi = 0; vi < parsedLines[i].length; vi++) {
      var ci = origCol + vi;
      if (ci < bcColumnHeaders.length) {
        bcContactRows[ri][bcColumnHeaders[ci]] = parsedLines[i][vi];
      }
    }
  }
  renderBCContactsTable();
  saveBCSession();
}

function handleBCPaste(e) {
  var text = (e.clipboardData || window.clipboardData).getData('text');
  if (!text) return;

  // Always find the nearest cell from the event target
  var cell = e.target;
  if (!cell || !cell.hasAttribute || !cell.hasAttribute('data-row')) {
    cell = document.activeElement;
  }
  if (!cell || !cell.hasAttribute || !cell.hasAttribute('data-row')) return;

  e.preventDefault();
  e.stopPropagation();

  var startRow = parseInt(cell.getAttribute('data-row'));
  var startColIdx = bcColumnHeaders.indexOf(cell.getAttribute('data-col'));
  if (startColIdx < 0) return;

  // Parse: tab = column separator, newline = row separator
  var lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();

  var origRow = startRow, origCol = startColIdx;
  if (bcSelRange) { var n = bcNormRange(bcSelRange); origRow = n.r1; origCol = n.c1; }
  // First pass: determine needed dimensions
  var maxCols = 0;
  var parsedLines = [];
  for (var i = 0; i < lines.length; i++) {
    var vals = lines[i].split('\t');
    parsedLines.push(vals);
    if (vals.length > maxCols) maxCols = vals.length;
  }
  // Expand columns if needed (add unnamed-N for extras)
  while (bcColumnHeaders.length < origCol + maxCols) {
    bcColumnHeaders.push('unnamed-' + (bcColumnHeaders.length + 1));
    bcColumnLabels.push('unnamed-' + bcColumnHeaders.length);
  }
  // Expand rows if needed
  while (bcContactRows.length < origRow + lines.length) {
    var emptyRow = {};
    bcColumnHeaders.forEach(function(h) { emptyRow[h] = ''; });
    bcContactRows.push(emptyRow);
  }
  // Fill data
  for (var i = 0; i < parsedLines.length; i++) {
    var ri = origRow + i;
    for (var vi = 0; vi < parsedLines[i].length; vi++) {
      var ci = origCol + vi;
      if (ci < bcColumnHeaders.length) {
        bcContactRows[ri][bcColumnHeaders[ci]] = parsedLines[i][vi];
      }
    }
  }
  renderBCContactsTable();
  saveBCSession();
}

function parseCSVLine(line, sep) {
  var result = [];
  var current = '';
  var inQuotes = false;
  for (var i = 0; i < line.length; i++) {
    var c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else { current += c; }
    } else {
      if (c === '"') { inQuotes = true; }
      else if (c === sep) { result.push(current); current = ''; }
      else { current += c; }
    }
  }
  result.push(current);
  return result;
}

// ── Variable Chips ───────────────────────────────────────────────────────

function renderBCVarChips() {
  var container = document.getElementById('bc-var-chips');
  if (!container) return;
  if (bcColumnHeaders.length === 0) {
    container.innerHTML = '<span class="text-xs text-slate-400 italic">Tidak ada variabel. Muat kontak di Langkah 1.</span>';
    return;
  }
  container.innerHTML = bcColumnHeaders.map(function(h, i) {
    var label = bcColumnLabels[i] || h;
    return '<button type="button" onclick="insertBCVar(\'' + escHtml(h) + '\')" class="bc-var-chip">{{' + escHtml(h) + '}} <span class="text-blue-400 font-normal">' + escHtml(label) + '</span></button>';
  }).join('');
}

function insertBCVar(varName) {
  var textarea = document.getElementById('bc-template');
  if (!textarea) return;
  var start = textarea.selectionStart;
  var end = textarea.selectionEnd;
  var text = textarea.value;
  var insert = '{{' + varName + '}}';
  textarea.value = text.substring(0, start) + insert + text.substring(end);
  textarea.selectionStart = textarea.selectionEnd = start + insert.length;
  textarea.focus();
  debouncedPreview();
}

// ── Live Preview (debounced 500ms) ───────────────────────────────────────

function renderBCPreviewRowSelector() {
  var sel = document.getElementById('bc-preview-row');
  if (!sel) return;
  var selected = [];
  bcContactRows.forEach(function(r, i) { if (r._selected) selected.push(i); });
  sel.innerHTML = selected.map(function(ri) {
    var name = bcContactRows[ri].full_name || bcContactRows[ri].phone || ('Baris ' + (ri + 1));
    return '<option value="' + ri + '">' + escHtml(name) + '</option>';
  }).join('');
}

function startLivePreview() {
  var textarea = document.getElementById('bc-template');
  if (!textarea) return;
  textarea.removeEventListener('input', onBCTemplateInput);
  textarea.addEventListener('input', onBCTemplateInput);
  debouncedPreview();
}

function onBCTemplateInput() {
  debouncedPreview();
}

function debouncedPreview() {
  if (bcPreviewDebounce) clearTimeout(bcPreviewDebounce);
  bcPreviewDebounce = setTimeout(updateLivePreview, 500);
}

function updateLivePreview() {
  var template = document.getElementById('bc-template') ? document.getElementById('bc-template').value : '';
  var rowIdx = parseInt(document.getElementById('bc-preview-row') ? document.getElementById('bc-preview-row').value : '-1');
  var box = document.getElementById('bc-preview-box');
  if (!box) return;
  if (!template || isNaN(rowIdx) || !bcContactRows[rowIdx]) {
    box.innerHTML = '<span class="text-slate-400 italic">Pilih kontak dan ketik template untuk melihat preview.</span>';
    return;
  }
  var vars = {};
  bcColumnHeaders.forEach(function(h) { vars[h] = bcContactRows[rowIdx][h] || ''; });
  var rendered = renderBCTemplateJS(template, vars);
  box.textContent = rendered;
}

function renderBCTemplateJS(template, vars) {
  var MAX_ITER = 10, iter = 0;
  function evalCond(col, op, val) {
    var cv = (vars[col] !== undefined) ? String(vars[col]) : '';
    switch (op) {
      case '==': return cv === val;
      case '!=': return cv !== val;
      case 'contains': return val ? cv.indexOf(val) >= 0 : false;
      case '!contains': return val ? cv.indexOf(val) < 0 : false;
      case 'startswith': return val ? cv.indexOf(val) === 0 : false;
      case '!startswith': return val ? cv.indexOf(val) !== 0 : false;
      case 'endswith': return val ? cv.slice(-val.length) === val : false;
      case '!endswith': return val ? cv.slice(-val.length) !== val : false;
      case 'matches': try { return val ? new RegExp(val,'i').test(cv) : false; } catch(e) { return false; }
      case '!matches': try { return val ? !new RegExp(val,'i').test(cv) : false; } catch(e) { return false; }
      case 'empty': return cv.trim() === '';
      case 'notempty': return cv.trim() !== '';
      case '>': return parseFloat(cv) > parseFloat(val || '0');
      case '>=': return parseFloat(cv) >= parseFloat(val || '0');
      case '<': return parseFloat(cv) < parseFloat(val || '0');
      case '<=': return parseFloat(cv) <= parseFloat(val || '0');
      default: return false;
    }
  }
  function processConditionals(tmpl) {
    var quotedOps = '==|!=|contains|!contains|startswith|!startswith|endswith|!endswith|matches|!matches|>|>=|<|<=';
    var unquotedOps = 'empty|notempty';
    var reQ = new RegExp('\\{\\{if\\s+(\\w+)\\s*(' + quotedOps + ')\\s*"([^"]*?)"\\s*\\}\\}');
    var reU = new RegExp('\\{\\{if\\s+(\\w+)\\s*(' + unquotedOps + ')\\s*\\}\\}');
    while (iter++ < MAX_ITER) {
      var mQ = tmpl.match(reQ);
      var mU = tmpl.match(reU);
      var match = null, col, op, val;
      if (mQ && mQ.index !== undefined) { match = mQ; col = match[1]; op = match[2]; val = match[3]; }
      else if (mU && mU.index !== undefined) { match = mU; col = match[1]; op = match[2]; val = null; }
      if (!match) break;
      var startIdx = match.index;
      var afterStart = startIdx + match[0].length;
      var depth = 1, elsePos = -1, endPos = -1, searchFrom = afterStart;
      while (depth > 0 && searchFrom < tmpl.length) {
        var nI = tmpl.indexOf('{{if', searchFrom), nE = tmpl.indexOf('{{else}}', searchFrom), nD = tmpl.indexOf('{{endif}}', searchFrom);
        if (nD === -1) break;
        var nearest = nD;
        if (nE !== -1 && nE < nearest) nearest = nE;
        if (nI !== -1 && nI < nearest) { depth++; searchFrom = nI + 4; continue; }
        if (nearest === nD) { depth--; if (depth === 0) endPos = nD; searchFrom = nD + 9; continue; }
        if (depth === 1) elsePos = nearest;
        searchFrom = nearest + 8;
      }
      if (endPos === -1) break;
      var result;
      if (elsePos !== -1) {
        var t = tmpl.substring(afterStart, elsePos), f = tmpl.substring(elsePos + 8, endPos);
        result = evalCond(col, op, val) ? t : f;
      } else {
        var b = tmpl.substring(afterStart, endPos);
        result = evalCond(col, op, val) ? b : '';
      }
      // If result is empty, clean up surrounding blank lines to avoid excess whitespace
      if (!result) {
        var blockEnd = endPos + 9;
        var prevNL = tmpl.lastIndexOf('\n', startIdx - 1);
        var nextNL = tmpl.indexOf('\n', blockEnd);
        if (prevNL !== -1 && nextNL !== -1) {
          var before = tmpl.substring(prevNL + 1, startIdx);
          var after = tmpl.substring(blockEnd, nextNL);
          if (before.trim() === '' && after.trim() === '') {
            tmpl = tmpl.substring(0, prevNL) + tmpl.substring(nextNL + 1);
            continue;
          }
        }
        if (prevNL !== -1 && tmpl.substring(prevNL + 1, startIdx).trim() === '') {
          var afterEnd = tmpl.indexOf('\n', blockEnd);
          if (afterEnd !== -1 && tmpl.substring(blockEnd, afterEnd).trim() === '') {
            tmpl = tmpl.substring(0, prevNL) + tmpl.substring(afterEnd + 1);
            continue;
          }
        }
      }
      tmpl = tmpl.substring(0, startIdx) + result + tmpl.substring(endPos + 9);
    }
    return tmpl;
  }
  function processSet(tmpl) {
    return tmpl.replace(/\{\{set\s+(\w+)\s*=\s*"([^"]*?)"\s*\}\}/g, function(m, k, v) { vars[k] = v; return ''; });
  }
  function processMath(tmpl) {
    tmpl = tmpl.replace(/\{\{(\w+)\s*\+\s*(\d+)\}\}/g, function(m, col, n) { return String((parseInt(vars[col]) || 0) + parseInt(n)); });
    tmpl = tmpl.replace(/\{\{(\w+)\s*-\s*(\d+)\}\}/g, function(m, col, n) { return String((parseInt(vars[col]) || 0) - parseInt(n)); });
    return tmpl;
  }
  function processFilters(tmpl) {
    tmpl = tmpl.replace(/\{\{(\w+)\|uppercase\}\}/g, function(m, c) { return (vars[c] || '').toUpperCase(); });
    tmpl = tmpl.replace(/\{\{(\w+)\|lowercase\}\}/g, function(m, c) { return (vars[c] || '').toLowerCase(); });
    tmpl = tmpl.replace(/\{\{(\w+)\|capitalize\}\}/g, function(m, c) { var s=(vars[c]||''); return s.charAt(0).toUpperCase()+s.slice(1).toLowerCase(); });
    tmpl = tmpl.replace(/\{\{(\w+)\|titlecase\}\}/g, function(m, c) { return (vars[c]||'').replace(/\b\w/g,function(ch){return ch.toUpperCase();}); });
    tmpl = tmpl.replace(/\{\{(\w+)\|trim\}\}/g, function(m, c) { return (vars[c] || '').trim(); });
    tmpl = tmpl.replace(/\{\{(\w+)\|default:"([^"]*?)"\}\}/g, function(m, c, fb) { return (vars[c] && String(vars[c]).trim()) ? vars[c] : fb; });
    tmpl = tmpl.replace(/\{\{(\w+)\|length\}\}/g, function(m, c) { return String((vars[c] || '').length); });
    tmpl = tmpl.replace(/\{\{(\w+)\|slice:"([^"]*?)"\}\}/g, function(m, c, args) {
      var parts = args.split(',').map(function(s){return parseInt(s.trim());});
      return (vars[c]||'').slice(parts[0], parts[1]);
    });
    tmpl = tmpl.replace(/\{\{(\w+)\|replace:"([^"]*?)"\}\}/g, function(m, c, args) {
      var parts = args.split(',').map(function(s){return s.trim();});
      return (vars[c]||'').split(parts[0]).join(parts[1] || '');
    });
    tmpl = tmpl.replace(/\{\{(\w+)\|repeat:(\d+)\}\}/g, function(m, c, n) {
      var s = vars[c] || ''; var r = ''; for (var i = 0; i < parseInt(n); i++) r += (i > 0 ? '\n' : '') + s; return r;
    });
    return tmpl;
  }
  function processVars(tmpl) {
    for (var k in vars) {
      if (vars.hasOwnProperty(k)) {
        tmpl = tmpl.replace(new RegExp('\\{\\{' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\}\\}', 'g'), vars[k]);
      }
    }
    return tmpl;
  }
  // Execute pipeline
  template = processSet(template);
  template = processMath(template);
  template = processFilters(template);
  template = processConditionals(template);
  template = processVars(template);
  // Collapse 3+ consecutive newlines into 2 (max 1 blank line between paragraphs)
  template = template.replace(/\n{3,}/g, '\n\n');
  // Strip whitespace from otherwise-blank lines
  template = template.replace(/^[ \t]+$/gm, '');
  return template;
}

// ── Send ─────────────────────────────────────────────────────────────────

async function sendBCTest() {
  var templateEl = document.getElementById('bc-template');
  if (!templateEl || !templateEl.value.trim()) { uiAlert('Template pesan kosong.'); return; }
  var sel = document.getElementById('bc-test-contact');
  var phoneEl = document.getElementById('bc-test-phone');
  var contactIdx = sel ? sel.value : '';
  var phone = '';
  var msg = '';
  if (contactIdx !== '' && bcContactRows[parseInt(contactIdx)]) {
    // Send to existing contact — use their actual data
    var row = bcContactRows[parseInt(contactIdx)];
    var phoneKeys = ['phone', 'no_hp', 'no__hp', 'nomor_hp', 'nomor', 'no hp'];
    for (var i = 0; i < phoneKeys.length; i++) {
      if (bcColumnHeaders.indexOf(phoneKeys[i]) >= 0) { phone = (row[phoneKeys[i]] || '').replace(/\D/g, ''); break; }
    }
    if (!phone || phone.length < 8) { uiAlert('Kontak tidak memiliki nomor HP valid.'); return; }
    var vars = {};
    bcColumnHeaders.forEach(function(h) { vars[h] = row[h] || ''; });
    msg = renderBCTemplateJS(templateEl.value, vars);
  } else {
    // Custom number — send exactly what the preview shows
    phone = phoneEl ? phoneEl.value.trim().replace(/\D/g, '') : '';
    if (!phone || phone.length < 8) { uiAlert('Masukkan nomor HP valid (min 8 digit).'); return; }
    var previewBox = document.getElementById('bc-preview-box');
    msg = previewBox ? previewBox.textContent : renderBCTemplateJS(templateEl.value, {});
  }
  try {
    await api('POST', '/api/broadcast/send', { message: msg, phones: [phone], messages: [msg], delay_ms: 0 });
    uiAlert('Test terkirim ke ' + phone);
  } catch(e) {
    uiAlert('Gagal kirim test: ' + e.message);
  }
}

function renderBCTestContactSelector() {
  var sel = document.getElementById('bc-test-contact');
  if (!sel) return;
  var selected = [];
  bcContactRows.forEach(function(r, i) { if (r._selected) selected.push(i); });
  var phoneKeys = ['phone', 'no_hp', 'no__hp', 'nomor_hp', 'nomor', 'no hp'];
  sel.innerHTML = '<option value="">-- pilih kontak --</option>' + selected.map(function(ri) {
    var name = bcContactRows[ri].full_name || bcContactRows[ri].nickname || ('Baris ' + (ri + 1));
    return '<option value="' + ri + '">' + escHtml(name) + '</option>';
  }).join('');
}

function toggleBCTestPhone() {
  var sel = document.getElementById('bc-test-contact');
  var wrap = document.getElementById('bc-test-phone-wrap');
  if (!sel || !wrap) return;
  if (sel.value === '') {
    wrap.classList.remove('hidden');
  } else {
    wrap.classList.add('hidden');
  }
}

async function sendBroadcast() {
  var selected = bcContactRows.filter(function(r) { return r._selected; });
  if (selected.length === 0) { uiAlert('Pilih minimal 1 kontak.'); return; }
  var templateEl = document.getElementById('bc-template');
  if (!templateEl || !templateEl.value.trim()) { uiAlert('Template pesan kosong.'); return; }
  if (!await uiConfirm('Kirim broadcast ke ' + selected.length + ' kontak?')) return;

  var phoneKeys = ['phone', 'no_hp', 'no__hp', 'nomor_hp', 'nomor', 'no hp'];
  var phoneKey = null;
  for (var i = 0; i < phoneKeys.length; i++) {
    if (bcColumnHeaders.indexOf(phoneKeys[i]) >= 0) { phoneKey = phoneKeys[i]; break; }
  }
  if (!phoneKey) { uiAlert('Kolom nomor HP tidak ditemukan. Pastikan ada kolom "phone" atau "no_hp".'); return; }

  var phones = [];
  var messages = [];
  selected.forEach(function(row) {
    var ph = (row[phoneKey] || '').replace(/\D/g, '');
    if (ph.length < 8) return;
    phones.push(ph);
    var vars = {};
    bcColumnHeaders.forEach(function(h) { vars[h] = row[h] || ''; });
    messages.push(renderBCTemplateJS(templateEl.value, vars));
  });

  if (phones.length === 0) { uiAlert('Tidak ada kontak dengan nomor HP valid.'); return; }

  var delayEl = document.getElementById('bc-delay');
  var delayMs = delayEl ? (parseInt(delayEl.value) || 3) * 1000 : 3000;

  bcLockBroadcast();

  try {
    await api('POST', '/api/broadcast/send', {
      message: templateEl.value,
      phones: phones,
      messages: messages,
      delay_ms: delayMs
    });
  } catch(e) {
    uiAlert('Gagal memulai broadcast: ' + e.message);
    bcUnlockBroadcast();
    var liveProgress = document.getElementById('bc-live-progress');
    if (liveProgress) liveProgress.classList.add('hidden');
  }
}

// ── History ──────────────────────────────────────────────────────────────

async function loadBCHistory() {
  var list = document.getElementById('bc-history-list');
  if (!list) return;
  try {
    var logs = await api('GET', '/api/broadcast/logs');
    if (!logs || !Array.isArray(logs) || logs.length === 0) {
      list.innerHTML = '<p class="text-sm text-slate-400 italic">Belum ada riwayat broadcast.</p>';
      return;
    }
    list.innerHTML = '<div class="space-y-2">' + logs.slice(0, 20).map(function(log) {
      var statusBadge = '';
      if (log.status === 'done') statusBadge = '<span class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Selesai</span>';
      else if (log.status === 'failed') statusBadge = '<span class="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Gagal</span>';
      else if (log.status === 'partial') statusBadge = '<span class="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Sebagian</span>';
      else if (log.status === 'sending') statusBadge = '<span class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Mengirim</span>';
      else statusBadge = '<span class="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">' + escHtml(log.status || '') + '</span>';
      var date = log.started_at ? new Date(log.started_at).toLocaleString('id-ID') : '';
      var msg = (log.message || '').substring(0, 80);
      return '<div class="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50" onclick="showBCDetail(\'' + log.id + '\', this)">' +
        statusBadge +
        '<span class="text-xs text-slate-400 hidden sm:inline">' + date + '</span>' +
        '<span class="text-sm text-slate-700 flex-1 truncate">' + escHtml(msg) + '</span>' +
        '<span class="text-xs text-slate-400">' + (log.sent_count || 0) + '/' + (log.total_receivers || 0) + '</span>' +
        '</div>';
    }).join('') + '</div>';
  } catch(e) {
    list.innerHTML = '<p class="text-sm text-red-500">Gagal memuat riwayat.</p>';
  }
}

async function showBCDetail(id, rowEl) {
  var prev = document.getElementById('bc-log-detail-inline');
  if (prev) prev.remove();
  if (rowEl) {
    var alreadyOpen = rowEl.nextElementSibling && rowEl.nextElementSibling.id === 'bc-log-detail-inline';
    if (alreadyOpen) { return; }
  }
  try {
    var data = await api('GET', '/api/broadcast/logs/' + id);
    if (!data || !data.log) return;
    var log = data.log;
    var recipients = data.recipients || [];
    var statusText = log.status === 'done' ? 'Selesai' : log.status === 'failed' ? 'Gagal' : (log.status || '');
    var statusColor = log.status === 'done' ? 'green' : log.status === 'failed' ? 'red' : 'yellow';
    var html = '<div id="bc-log-detail-inline" class="ml-4 sm:ml-8 mt-1 border border-slate-200 rounded-lg p-4 bg-white">' +
      '<div class="flex items-center justify-between mb-3">' +
      '<h4 class="text-sm font-bold text-slate-700">Detail Broadcast</h4>' +
      '<button onclick="this.closest(\'#bc-log-detail-inline\').remove()" class="text-xs text-slate-400 hover:text-slate-600">&times; Tutup</button>' +
      '</div>' +
      '<div class="text-sm text-slate-600 space-y-1 mb-3">' +
      '<p><strong>Status:</strong> <span class="text-' + statusColor + '-600">' + escHtml(statusText) + '</span></p>' +
      '<p><strong>Terkirim:</strong> ' + (log.sent_count || 0) + ' / ' + (log.total_receivers || 0) + '</p>' +
      (log.completed_at ? '<p><strong>Selesai:</strong> ' + new Date(log.completed_at).toLocaleString('id-ID') + '</p>' : '') +
      '</div>' +
      '<div class="border-t border-slate-200 pt-3">' +
      '<p class="text-xs font-medium text-slate-500 mb-2">Pesan:</p>' +
      '<div class="bg-slate-50 rounded-lg p-3 text-sm text-slate-700 whitespace-pre-wrap max-h-32 overflow-y-auto">' + escHtml(log.message || '') + '</div>' +
      '</div>';
    if (recipients.length > 0) {
      html += '<div class="border-t border-slate-200 pt-3 mt-3">' +
        '<p class="text-xs font-medium text-slate-500 mb-2">Penerima (' + recipients.length + '):</p>' +
        '<div class="max-h-40 overflow-y-auto space-y-1">' +
        recipients.map(function(r) {
          var icon = r.status === 'sent' ? '<span class="text-green-500">&#10003;</span>' : '<span class="text-red-500">&#10007;</span>';
          return '<div class="text-xs flex items-center gap-2">' + icon + ' <span class="text-slate-600">' + escHtml(r.phone || '') + '</span>' + (r.error ? '<span class="text-red-400">' + escHtml(r.error) + '</span>' : '') + '</div>';
        }).join('') +
        '</div></div>';
    }
    html += '</div>';
    if (rowEl && rowEl.parentNode) {
      rowEl.insertAdjacentHTML('afterend', html);
    } else {
      var list = document.getElementById('bc-history-list');
      if (list) list.insertAdjacentHTML('beforeend', html);
    }
  } catch(e) {}
}

// ── WebSocket ────────────────────────────────────────────────────────────

function connectBCWebSocket() {
  if (bcWs) return;
  try {
    var proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    bcWs = new WebSocket(proto + '//' + location.host + '/api/broadcast/ws');
    bcWs.onmessage = function(evt) {
      try { handleBCEvent(JSON.parse(evt.data)); } catch(e) {}
    };
    bcWs.onclose = function() {
      bcWs = null;
      setTimeout(connectBCWebSocket, 5000);
    };
    bcWs.onerror = function() { if (bcWs) bcWs.close(); };
  } catch(e) {}
}

function handleBCEvent(data) {
  if (!data || !data.type) return;
  if (data.type === 'broadcast_progress') {
    var bar = document.getElementById('bc-live-bar');
    var sentEl = document.getElementById('bc-live-sent');
    var failedEl = document.getElementById('bc-live-failed');
    var percentEl = document.getElementById('bc-live-percent');
    if (bar) bar.style.width = (data.percentage || 0) + '%';
    if (sentEl) sentEl.textContent = (data.sent || 0) + ' terkirim';
    if (failedEl) failedEl.textContent = (data.failed || 0) + ' gagal';
    if (percentEl) percentEl.textContent = Math.round(data.percentage || 0) + '%';
    if (data.phone) {
      bcAddLiveLogEntry(data.phone, data.status || 'sent', data.error || '');
    }
  }
  if (data.type === 'broadcast_completed') {
    bcUnlockBroadcast();
    loadBCHistory();
    loadWAStatus();
    var msg = data.status === 'done' ? 'Broadcast selesai! ' + (data.sent || 0) + ' pesan terkirim.'
      : data.status === 'failed' ? 'Broadcast gagal. ' + (data.failed || 0) + ' dari ' + (data.total || 0) + ' gagal.'
      : 'Broadcast sebagian: ' + (data.sent || 0) + ' terkirim, ' + (data.failed || 0) + ' gagal.';
    uiAlert(msg, 'Hasil Broadcast');
  }
}
