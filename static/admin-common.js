
let state = { periods: [], faqs: [], stats: [], periodGallery: [], globalSetting: null, periodAbout: null };


let statPreviewChart = null;

function _selectedSectionFromURL_DEPRECATED() {
  const section = new URLSearchParams(window.location.search).get('section') || 'pengumuman';
  const allowed = new Set(['pengumuman', 'artikel', 'departemen', 'program', 'faq-periode', 'tentang', 'galeri', 'statistik', 'anggota', 'global', 'shortlink', 'faq-global', 'global-stats', 'periode', 'akun', 'broadcast']);
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
  quills[id] = new Quill('#' + id, {
    theme: 'snow',
    modules: { toolbar: toolbar || toolbarOptions }
  });
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
  if (name === 'faq-periode' && currentPeriod()) loadFAQs(currentPeriod());
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

async function loadShortlinks() {
  const tb = document.getElementById('shortlink-tbody');
  if (!tb) return;
  let rows = [];
  try {
    rows = await api('GET', '/api/cms/shortlinks');
  } catch (ex) {
    tb.innerHTML = `<tr><td colspan="4" class="p-6">${errHtml(toUiMessage(ex))}</td></tr>`;
    return;
  }
  if (!rows.length) {
    tb.innerHTML = '<tr><td colspan="4" class="p-6 text-center text-slate-400">Belum ada short link.</td></tr>';
    return;
  }
  tb.innerHTML = rows.map((row) => `
    <tr class="border-b border-slate-100 hover:bg-slate-50">
      <td class="p-4 align-top font-medium text-slate-700">${escHtml(row.label || '-')}</td>
      <td class="p-4 align-top">
        <a href="${escHtml(shortlinkURL(row.code))}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline break-all">${escHtml(shortlinkURL(row.code))}</a>
      </td>
      <td class="p-4 align-top text-slate-600 break-all">${escHtml(row.target_url || '')}</td>
      <td class="p-4 align-top text-right whitespace-nowrap">
        <button onclick="copyShortlink('${(shortlinkURL(row.code)).replace(/'/g, "&#39;")}')" class="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1 rounded mr-1">Copy</button>
        <button onclick="deleteShortlink('${row.id || ''}')" class="text-xs bg-red-50 hover:bg-red-100 text-red-700 px-2 py-1 rounded">Hapus</button>
      </td>
    </tr>
  `).join('');
}

async function createShortlink(targetURL, label, code) {
  const body = {
    target_url: targetURL,
    label: label || '',
    code: code || ''
  };
  const created = await api('POST', '/api/cms/shortlinks', body);
  await loadShortlinks();
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
    await loadShortlinks();
  } catch (ex) {
    uiAlert(ex);
  }
}

async function clearShortlinks() {
  if (!await uiConfirm('Bersihkan seluruh riwayat short link?', 'Konfirmasi')) return;
  try {
    await api('DELETE', '/api/cms/shortlinks?all=1');
    await loadShortlinks();
  } catch (ex) {
    uiAlert(ex);
  }
}

document.getElementById('formShortlink')?.addEventListener('submit', async e => {
  e.preventDefault();
  const longURL = (document.getElementById('shortlink-long-url')?.value || '').trim();
  const code = (document.getElementById('shortlink-code')?.value || '').trim();
  const label = (document.getElementById('shortlink-label')?.value || '').trim();
  if (!longURL) {
    uiAlert('URL tujuan wajib diisi.');
    return;
  }
  try {
    const shortURL = await createShortlink(longURL, label, code);
    uiAlert('Short link berhasil dibuat:<br><a class="text-blue-600 underline break-all" href="' + escHtml(shortURL) + '" target="_blank" rel="noopener noreferrer">' + escHtml(shortURL) + '</a>', 'Sukses');
    document.getElementById('formShortlink').reset();
  } catch (ex) {
    uiAlert(ex);
  }
});

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
  if (!modal || !titleEl || !msgEl || !btnOk || !btnCancel) {
    return Promise.resolve(showCancel ? true : undefined);
  }

  titleEl.textContent = title;
  msgEl.textContent = toUiMessage(message);
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
async function loadPengumuman() {
  const el = document.getElementById('list-pengumuman');
  try {
    const items = await api('GET', `/api/cms/announcements?period=${PERIOD}`);
    if (!items || !items.length) { el.innerHTML = emptyHtml('Belum ada pengumuman.'); return; }
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
  } catch(e) { el.innerHTML = errHtml(e.message); }
}

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
    loadPengumuman();
  } catch(ex) { uiAlert('Error: ' + ex.message); }
}

async function deletePengumuman(id) {
  if (!await uiConfirm('Hapus pengumuman ini?', 'Konfirmasi Hapus', true)) return;
  await api('DELETE', `/api/cms/announcements/${id}`);
  loadPengumuman();
}

// ── ARTIKEL ──────────────────────────────────────────────────────────────────
async function loadArtikel() {
  const el = document.getElementById('list-artikel');
  try {
    const items = await api('GET', `/api/cms/articles?period=${PERIOD}`);
    if (!items || !items.length) { el.innerHTML = emptyHtml('Belum ada artikel.'); return; }
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
  } catch(e) { el.innerHTML = errHtml(e.message); }
}

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
    loadArtikel();
  } catch(ex) { uiAlert('Error: ' + ex.message); }
}

async function deleteArtikel(id) {
  if (!await uiConfirm('Hapus artikel ini?', 'Konfirmasi Hapus', true)) return;
  await api('DELETE', `/api/cms/articles/${id}`);
  loadArtikel();
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

document.getElementById('formTentang')?.addEventListener('submit', async e => {
  e.preventDefault();
  const msg = document.getElementById('tentang-msg');
  try {
    await api('PUT', '/api/cms/period-about', {
      period_label: PERIOD,
      sejarah: quillGetHTML('editor-sejarah'),
      tagline_title: document.getElementById('tentang-tagline-title').value,
      tagline_subtitle: document.getElementById('tentang-tagline-subtitle').value,
      tagline_description: document.getElementById('tentang-tagline-desc').value,
      visi: quillGetHTML('editor-visi'),
      misi: quillGetHTML('editor-misi'),
      cover_image_url: pickerGetUrl('picker-cover'),
      hierarchy_image_url: pickerGetUrl('picker-struktur'),
      logo_kabinet_url: pickerGetUrl('picker-logo-kabinet'),
      gallery: state.periodGallery
    });
    state.periodAbout = {
      ...(state.periodAbout || {}),
      period_label: PERIOD,
      sejarah: quillGetHTML('editor-sejarah'),
      tagline_title: document.getElementById('tentang-tagline-title').value,
      tagline_subtitle: document.getElementById('tentang-tagline-subtitle').value,
      tagline_description: document.getElementById('tentang-tagline-desc').value,
      visi: quillGetHTML('editor-visi'),
      misi: quillGetHTML('editor-misi'),
      cover_image_url: pickerGetUrl('picker-cover'),
      hierarchy_image_url: pickerGetUrl('picker-struktur'),
      logo_kabinet_url: pickerGetUrl('picker-logo-kabinet')
    };
    renderTentangPreview();
    msg.classList.remove('hidden');
    setTimeout(() => msg.classList.add('hidden'), 3000);
  } catch(ex) { uiAlert('Error: ' + ex.message); }
});

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
  try {
    const [depts, members] = await Promise.all([
      api('GET', `/api/cms/departments?period=${PERIOD}`),
      api('GET', `/api/cms/members?period=${PERIOD}`)
    ]);
    deptCache = depts || [];
    memberCache = members || [];

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

document.getElementById('formKementerian')?.addEventListener('submit', async e => {
  e.preventDefault();
  const id = document.getElementById('dept-id').value;
  const parentId = document.getElementById('dept-parent').value;
  const body = {
    name: document.getElementById('dept-name').value,
    description: document.getElementById('dept-desc').value,
    icon_url: pickerGetUrl('picker-dept-icon'),
    period_label: PERIOD,
    parent_id: parentId || null
  };
  if (!id) body.sort_order = deptCache.length;
  try {
    if (id) await api('PUT', `/api/cms/departments/${id}`, body);
    else await api('POST', '/api/cms/departments', body);
    closeModal('modalKementerian');
    resetDeptForm();
    await loadKementerian();
  } catch (ex) { uiAlert('Error: ' + ex.message); }
});

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

document.getElementById('formProgram')?.addEventListener('submit', async e => {
  e.preventDefault();
  const id = document.getElementById('program-id').value;
  const payload = {
    period_label: PERIOD,
    department: document.getElementById('program-department').value,
    title: document.getElementById('program-title').value,
    description: document.getElementById('program-desc').value,
    image_url: pickerGetUrl('picker-program-image'),
    order: id ? (programCache.find(x => x.id === id)?.order || 0) : programCache.length
  };

  if (!payload.department || !payload.title) {
    uiAlert('Kementerian dan judul program wajib diisi.');
    return;
  }

  try {
    if (id) await api('PUT', `/api/cms/programs/${id}`, payload);
    else await api('POST', '/api/cms/programs', payload);
    closeModal('modalProgram');
    await loadPrograms();
  } catch (ex) {
    uiAlert('Error: ' + ex.message);
  }
});

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

async function loadAnggota() {
  const el = document.getElementById('list-anggota');
  try {
    const items = await api('GET', `/api/cms/members?period=${PERIOD}`);
    memberCache = items || [];
    if (!items || !items.length) { el.innerHTML = emptyHtml('Belum ada anggota.'); return; }
    el.innerHTML = `<div class="overflow-x-auto bg-white rounded-lg border border-slate-200"><table class="w-full text-sm">
      <thead><tr class="border-b border-slate-200 text-left text-slate-600 text-xs uppercase tracking-wider bg-slate-50">
        <th class="px-4 py-3 bg-slate-50 font-semibold">Foto</th>
        <th class="px-4 py-3 bg-slate-50 font-semibold">Nama</th>
        <th class="px-4 py-3 bg-slate-50 font-semibold">Profil</th>
        <th class="px-4 py-3 bg-slate-50 font-semibold">Status Aktif</th>
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
  } catch (e) { el.innerHTML = errHtml(e.message); }
}

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
    await loadAnggota();
    await loadKementerian();
  } catch (ex) { uiAlert('Error: ' + ex.message); }
}

async function deleteAnggota(id) {
  if (!await uiConfirm('Hapus anggota ini?', 'Konfirmasi Hapus', true)) return;
  await api('DELETE', `/api/cms/members/${id}`);
  await loadAnggota();
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
          ${!p.is_active ? `<button onclick="activatePeriode('${p.label}')" class="bg-green-50 hover:bg-green-100 text-green-700 text-xs px-3 py-1.5 rounded-lg font-medium transition">Jadikan Aktif</button>` : ''}
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
async function loadAkun() {
  const el = document.getElementById('list-akun');
  try {
    const items = await api('GET', '/api/cms/accounts');
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
  } catch(e) { el.innerHTML = errHtml(e.message); }
}

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
  loadAkun();
}

document.getElementById('formAkun')?.addEventListener('submit', async e => {
  e.preventDefault();
  const id = document.getElementById('akun-id').value;
  const body = {
    username: document.getElementById('akun-username').value,
    password: document.getElementById('akun-password').value,
    role: document.getElementById('akun-role').value,
    assigned_period: document.getElementById('akun-assigned-period').value
  };
  try {
    if (id) await api('PUT', `/api/cms/accounts/${id}`, body);
    else await api('POST', '/api/cms/accounts', body);
    closeModal('modalAkun');
    loadAkun();
  } catch(ex) { uiAlert('Error: ' + ex.message); }
});

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

document.getElementById('formGlobal')?.addEventListener('submit', async e => {
  e.preventDefault();
  const msg = document.getElementById('global-msg');
  try {
    const cur = await api('GET', '/api/cms/global-setting').catch(() => ({}));
    await api('PUT', '/api/cms/global-setting', {
      org_name: document.getElementById('global-orgname').value,
      logo_url: pickerGetUrl('picker-logo'),
      logo_university_url: pickerGetUrl('picker-logo-university'),
      logo_yayasan_url: pickerGetUrl('picker-logo-yayasan'),
      header_title: document.getElementById('global-header-title').value,
      header_subtitle: document.getElementById('global-header-subtitle').value,
      hero_badge_text: document.getElementById('global-hero-badge').value,
      hero_title_main: document.getElementById('global-hero-title-main').value,
      hero_title_accent: document.getElementById('global-hero-title-accent').value,
      footer_title: document.getElementById('global-footer-title').value,
      footer_text: document.getElementById('global-footer-text').value,
      footer_copy_text: document.getElementById('global-footer-copy').value,
      about_html: quillGetHTML('editor-global-about'),
      social_media: cur.social_media || {}
    });
    state.globalSetting = {
      ...cur,
      org_name: document.getElementById('global-orgname').value,
      logo_url: pickerGetUrl('picker-logo'),
      logo_university_url: pickerGetUrl('picker-logo-university'),
      logo_yayasan_url: pickerGetUrl('picker-logo-yayasan'),
      header_title: document.getElementById('global-header-title').value,
      header_subtitle: document.getElementById('global-header-subtitle').value,
      hero_badge_text: document.getElementById('global-hero-badge').value,
      hero_title_main: document.getElementById('global-hero-title-main').value,
      hero_title_accent: document.getElementById('global-hero-title-accent').value,
      footer_title: document.getElementById('global-footer-title').value,
      footer_text: document.getElementById('global-footer-text').value,
      footer_copy_text: document.getElementById('global-footer-copy').value,
      about_html: quillGetHTML('editor-global-about'),
      social_media: cur.social_media || {}
    };
    renderGlobalPreview();
    msg.classList.remove('hidden');
    setTimeout(() => msg.classList.add('hidden'), 3000);
  } catch(ex) { uiAlert('Error: ' + ex.message); }
});

document.getElementById('formSocmed')?.addEventListener('submit', async e => {
  e.preventDefault();
  const msg = document.getElementById('socmed-msg');
  try {
    const cur = await api('GET', '/api/cms/global-setting').catch(() => ({}));
    await api('PUT', '/api/cms/global-setting', {
      org_name: cur.org_name || '',
      logo_url: cur.logo_url || '',
      header_title: cur.header_title || '',
      header_subtitle: cur.header_subtitle || '',
      hero_badge_text: cur.hero_badge_text || '',
      hero_title_main: cur.hero_title_main || '',
      hero_title_accent: cur.hero_title_accent || '',
      footer_title: cur.footer_title || '',
      footer_text: cur.footer_text || '',
      footer_copy_text: cur.footer_copy_text || '',
      about_html: cur.about_html || '',
      social_media: {
        instagram: document.getElementById('sm-instagram').value,
        twitter: document.getElementById('sm-twitter').value,
        facebook: document.getElementById('sm-facebook').value,
        youtube: document.getElementById('sm-youtube').value,
        linkedin: document.getElementById('sm-linkedin').value,
        tiktok: document.getElementById('sm-tiktok').value
      }
    });
    state.globalSetting = {
      ...cur,
      social_media: {
        instagram: document.getElementById('sm-instagram').value,
        twitter: document.getElementById('sm-twitter').value,
        facebook: document.getElementById('sm-facebook').value,
        youtube: document.getElementById('sm-youtube').value,
        linkedin: document.getElementById('sm-linkedin').value,
        tiktok: document.getElementById('sm-tiktok').value
      }
    };
    renderGlobalPreview();
    msg.classList.remove('hidden');
    setTimeout(() => msg.classList.add('hidden'), 3000);
  } catch(ex) { uiAlert('Error: ' + ex.message); }
});

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
  const isGlobal = (pLabel === 'GLOBAL');
  const tb = document.getElementById(isGlobal ? 'faq-global-tbody' : 'faq-periode-tbody');
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
async function loadFAQs(pLabel) {
  const isGlobal = (pLabel === 'GLOBAL');
  const tb = document.getElementById(isGlobal ? 'faq-global-tbody' : 'faq-periode-tbody');
  try {
    const items = await api('GET', '/api/cms/faqs?period=' + encodeURIComponent(pLabel));
    state.faqs = items || [];
    tb.innerHTML = (items||[]).map(f => `
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
  } catch(e) { tb.innerHTML = `<tr><td colspan="3">${errHtml(e.message)}</td></tr>`; }
}
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
  loadFAQs(pLabel);
}
document.getElementById('formFAQ')?.addEventListener('submit', async e => {
  e.preventDefault();
  const data = {
    id: document.getElementById('faq-id').value,
    period_label: document.getElementById('faq-period').value,
    question: document.getElementById('faq-question').value,
    answer: document.getElementById('faq-answer').value,
    order: 0
  };
  try {
      await api(data.id ? 'PUT' : 'POST', data.id ? '/api/cms/faqs/' + data.id : '/api/cms/faqs', data);
     closeModal('modalFAQ');
     loadFAQs(data.period_label);
  } catch(ex) { uiAlert(ex); }
});

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
document.getElementById('formStatistik')?.addEventListener('submit', async e => {
  e.preventDefault();
  const periodLabel = document.getElementById('stat-period').value || currentPeriod();
  const chartType = document.getElementById('stat-chart-type').value;
  let normalizedValue = document.getElementById('stat-value').value;
  if (periodLabel !== '_TEMPLATE_') {
    try {
      normalizedValue = collectStatInputValue(chartType);
    } catch (ex) {
      uiAlert(ex.message || String(ex));
      return;
    }
  }
  if (periodLabel !== '_TEMPLATE_' && !String(normalizedValue || '').trim()) {
    uiAlert('Value statistik periode wajib diisi.');
    return;
  }
  document.getElementById('stat-value').value = normalizedValue;
  const data = {
    id: document.getElementById('stat-id').value,
    template_id: document.getElementById('stat-template-id').value,
    period_label: periodLabel,
    label: document.getElementById('stat-label').value,
    value: normalizedValue,
    desc: document.getElementById('stat-desc').value,
    chart_type: chartType,
    fillable: document.getElementById('stat-fillable').checked,
    visible: document.getElementById('stat-visible').checked,
    order: 0
  };
  try {
     await api(data.id ? 'PUT' : 'POST', '/api/cms/stats', data);
     closeModal('modalStatistik');
     if(periodLabel === '_TEMPLATE_') {
        loadGlobalStatsTab();
     } else {
        loadStatistik();
     }
  } catch(ex) { uiAlert(ex); }
});



// ── BROADCAST ──────────────────────────────────────────────────────────────
let bcWs = null;
let qrRefreshTimer = null;

// Global broadcast contact state
let bcContactRows = [];
let bcColumnHeaders = ['full_name', 'phone', 'department', 'position', 'program_studi', 'angkatan'];
let bcColumnLabels = ['Nama', 'No. HP', 'Kementerian', 'Jabatan', 'Program Studi', 'Angkatan'];

function initBroadcast() {
  loadWAStatus();
  loadBCHistory();
  connectBCWebSocket();
  populatePeriodFilter();
  loadBCContacts();
}

function showBCSub(name) {
  document.querySelectorAll('.bc-sub-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.bc-sub-tab').forEach(el => { el.className = el.className.replace('bg-blue-600 text-white', 'bg-slate-200 text-slate-700'); });
  document.getElementById('bc-sub-' + name)?.classList.remove('hidden');
  const tab = document.getElementById('bc-tab-' + name);
  if (tab) { tab.className = tab.className.replace('bg-slate-200 text-slate-700', 'bg-blue-600 text-white'); }
}

async function loadWAStatus() {
  try {
    const data = await api('GET', '/api/broadcast/status');
    const dot = document.getElementById('wa-status-dot');
    const txt = document.getElementById('wa-status-text');
    const qrContainer = document.getElementById('wa-qr-container');
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
    document.getElementById('wa-status-dot').className = 'w-3 h-3 rounded-full bg-slate-400';
    document.getElementById('wa-status-text').textContent = 'Service tidak tersedia';
  }
}

async function loadWAQR() {
  try {
    const resp = await fetch('/api/broadcast/qr');
    if (resp.ok && resp.headers.get('content-type')?.startsWith('image/')) {
      const blob = await resp.blob();
      document.getElementById('wa-qr-img').src = URL.createObjectURL(blob);
      document.getElementById('wa-qr-container')?.classList.remove('hidden');
    }
  } catch(e) {}
}

function populatePeriodFilter() {
  const sel = document.getElementById('bc-contact-filter');
  if (!sel) return;
  const current = window.PERIOD || '';
  // Fetch periods from API
  api('GET', '/api/periods').then(periods => {
    if (!periods || !Array.isArray(periods)) return;
    sel.innerHTML = '<option value="ALL">Semua Periode</option>';
    periods.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.label || p.Label;
      opt.textContent = p.display_name || p.DisplayName || p.label || p.Label;
      if ((p.label || p.Label) === current) opt.selected = true;
      sel.appendChild(opt);
    });
  }).catch(() => {});
}

async function loadBCContacts() {
  try {
    const period = document.getElementById('bc-contact-filter')?.value || window.PERIOD || 'ALL';
    const contacts = await api('GET', '/api/broadcast/anggota-contacts?period=' + encodeURIComponent(period));
    if (!contacts || !Array.isArray(contacts)) {
      bcContactRows = [];
      renderBCContactsTable();
      return;
    }
    // Map API response to our row format
    bcContactRows = contacts.map(c => ({
      full_name: c.full_name || c.FullName || '',
      nickname: c.nickname || c.Nickname || '',
      phone: c.phone || c.Phone || '',
      department: c.department || c.Department || '',
      position: c.position || c.Position || '',
      program_studi: c.program_studi || c.ProgramStudi || '',
      fakultas: c.fakultas || c.Fakultas || '',
      angkatan: c.angkatan || c.Angkatan || '',
      _selected: false
    }));
    renderBCContactsTable();
  } catch(e) {
    bcContactRows = [];
    renderBCContactsTable();
  }
}

function renderBCContactsTable() {
  const tbody = document.getElementById('bc-contacts-tbody');
  const countEl = document.getElementById('bc-contact-count');
  if (!tbody) return;

  // Update selected count
  const selectedCount = bcContactRows.filter(r => r._selected).length;
  const selCountEl = document.getElementById('bc-selected-count');
  if (selCountEl) selCountEl.textContent = selectedCount;
  if (countEl) countEl.textContent = bcContactRows.length + ' kontak' + (selectedCount > 0 ? ' (' + selectedCount + ' dipilih)' : '');

  // Update variable list
  updateBCVarList();

  // Update preview row selector
  updateBCPreviewRows();

  if (bcContactRows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-slate-400 py-8 text-sm">Tidak ada kontak dengan nomor HP. Tambahkan nomor HP pada data anggota atau tambah baris manual.</td></tr>';
    return;
  }

  tbody.innerHTML = bcContactRows.map((row, ri) => {
    const cells = bcColumnHeaders.map((col, ci) => {
      const val = row[col] || '';
      return '<td class="px-2 py-1 border-r border-slate-100 last:border-r-0" contenteditable="true" data-row="' + ri + '" data-col="' + ci + '" onblur="onBCCellEdit(this, ' + ri + ', \'' + col + '\')" onkeydown="onBCellKey(event, this)">' + escHtml(val) + '</td>';
    }).join('');
    return '<tr class="border-t border-slate-100 hover:bg-blue-50/50">' +
      '<td class="px-2 py-1 text-center w-8"><input type="checkbox" ' + (row._selected ? 'checked' : '') + ' onchange="bcContactRows[' + ri + ']._selected=this.checked;renderBCContactsTable()" class="rounded"></td>' +
      cells +
      '<td class="px-2 py-1 text-center w-10"><button onclick="deleteBCRow(' + ri + ')" class="text-red-400 hover:text-red-600 text-xs p-1" title="Hapus">&times;</button></td>' +
      '</tr>';
  }).join('');

  // Update thead
  renderBCHeaders();
}

function renderBCHeaders() {
  const thead = document.querySelector('#bc-contacts-table thead tr');
  if (!thead) return;
  let html = '<th class="px-3 py-2 w-8 text-center"><input type="checkbox" onchange="toggleAllBCRows(this.checked)" class="rounded" title="Pilih semua"></th>';
  bcColumnHeaders.forEach((col, ci) => {
    const label = bcColumnLabels[ci] || col;
    html += '<th class="px-3 py-2 min-w-[120px] cursor-pointer hover:text-blue-600 select-none" ondblclick="renameBCColumn(' + ci + ')" title="Double-click untuk rename variabel">' + escHtml(label) + '</th>';
  });
  html += '<th class="px-3 py-2 w-10"></th>';
  thead.innerHTML = html;
}

function onBCCellEdit(el, rowIdx, colKey) {
  if (rowIdx >= 0 && rowIdx < bcContactRows.length) {
    bcContactRows[rowIdx][colKey] = el.textContent.trim();
  }
}

function onBCellKey(event, el) {
  if (event.key === 'Enter') { event.preventDefault(); el.blur(); }
  if (event.key === 'Tab') { event.preventDefault(); el.blur(); }
}

function toggleAllBCRows(checked) {
  bcContactRows.forEach(r => r._selected = checked);
  renderBCContactsTable();
}

function addBCRow() {
  const newRow = {};
  bcColumnHeaders.forEach(h => newRow[h] = '');
  newRow._selected = false;
  bcContactRows.push(newRow);
  renderBCContactsTable();
}

function deleteBCRow(idx) {
  bcContactRows.splice(idx, 1);
  renderBCContactsTable();
}

async function renameBCColumn(colIdx) {
  const col = bcColumnHeaders[colIdx];
  const currentLabel = bcColumnLabels[colIdx] || col;
  const newLabel = prompt('Nama variabel untuk kolom "' + currentLabel + '":', col);
  if (newLabel === null || !newLabel.trim()) return;
  const newKey = newLabel.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
  // Update key in all rows
  bcContactRows.forEach(row => {
    row[newKey] = row[col] || '';
    delete row[col];
  });
  bcColumnHeaders[colIdx] = newKey;
  bcColumnLabels[colIdx] = newLabel.trim();
  renderBCContactsTable();
}

function importBCFromCSV() {
  const csv = prompt('Paste data CSV/tab-separated.\nBaris pertama = header kolom.\nData dipisahkan tab atau koma.');
  if (!csv || !csv.trim()) return;

  const lines = csv.trim().split('\n').filter(l => l.trim());
  if (lines.length < 2) { uiAlert('Minimal 2 baris (header + data)'); return; }

  // Detect separator
  const sep = lines[0].includes('\t') ? '\t' : ',';
  const headers = lines[0].split(sep).map(h => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'));
  const labels = lines[0].split(sep).map(h => h.trim());

  // Merge new columns
  headers.forEach((h, i) => {
    if (!bcColumnHeaders.includes(h)) {
      bcColumnHeaders.push(h);
      bcColumnLabels.push(labels[i] || h);
    }
  });

  // Add rows
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep).map(c => c.trim());
    const row = { _selected: false };
    bcColumnHeaders.forEach(h => row[h] = '');
    headers.forEach((h, ci) => { row[h] = cols[ci] || ''; });
    if (Object.values(row).some(v => typeof v === 'string' && v)) {
      bcContactRows.push(row);
    }
  }
  renderBCContactsTable();
}

function updateBCVarList() {
  const el = document.getElementById('bc-var-list');
  if (!el) return;
  if (bcColumnHeaders.length === 0) {
    el.innerHTML = '<p class="text-slate-400 italic">Muat kontak dulu...</p>';
    return;
  }
  el.innerHTML = bcColumnHeaders.map((h, i) => {
    const label = bcColumnLabels[i] || h;
    return '<div class="py-0.5 cursor-pointer hover:text-blue-600" onclick="insertBCVar(\'' + escHtml(h) + '\')" title="Klik untuk insert">{{' + escHtml(h) + '}}</div><div class="text-slate-400 text-[10px]">' + escHtml(label) + '</div>';
  }).join('<hr class="border-slate-100 my-0.5">');
}

function insertBCVar(varName) {
  const ta = document.getElementById('bc-template');
  if (ta) {
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const text = ta.value;
    ta.value = text.substring(0, start) + '{{' + varName + '}}' + text.substring(end);
    ta.focus();
    ta.selectionStart = ta.selectionEnd = start + varName.length + 4;
  }
}

function updateBCPreviewRows() {
  const sel = document.getElementById('bc-preview-row');
  if (!sel) return;
  sel.innerHTML = '';
  bcContactRows.forEach((row, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = (row.full_name || row.phone || 'Baris ' + (i + 1));
    sel.appendChild(opt);
  });
}

function renderBCTemplateJS(template, vars) {
  // Handle {{if col == "val"}}...{{else}}...{{endif}}
  const re = /\{\{if\s+(\w+)\s*==\s*"([^"]*?)"\}\}(.*?)\{\{else\}\}(.*?)\{\{endif\}\}/gs;
  template = template.replace(re, (match, col, compareVal, trueBody, falseBody) => {
    const actual = vars[col] || '';
    return actual === compareVal ? trueBody : falseBody;
  });
  // Replace {{var}}
  Object.keys(vars).forEach(k => {
    template = template.replaceAll('{{' + k + '}}', vars[k] || '');
  });
  return template;
}

function previewBCTemplate() {
  const template = document.getElementById('bc-template')?.value;
  const rowIdx = parseInt(document.getElementById('bc-preview-row')?.value);
  const box = document.getElementById('bc-preview-box');
  if (!template || isNaN(rowIdx) || !bcContactRows[rowIdx]) {
    if (box) box.classList.add('hidden');
    return;
  }
  const vars = {};
  bcColumnHeaders.forEach(h => vars[h] = bcContactRows[rowIdx][h] || '');
  const rendered = renderBCTemplateJS(template, vars);
  if (box) {
    box.textContent = rendered;
    box.classList.remove('hidden');
  }
}

async function sendBCTest() {
  const template = document.getElementById('bc-template')?.value?.trim();
  const phone = document.getElementById('bc-test-phone')?.value?.trim();
  if (!template) { await uiAlert('Template pesan kosong'); return; }
  if (!phone) { await uiAlert('Nomor tujuan test kosong'); return; }
  if (!await uiConfirm('Kirim test ke ' + phone + '?', 'Test Broadcast', true)) return;
  try {
    const msg = renderBCTemplateJS(template, { full_name: 'Test', phone: phone });
    await api('POST', '/api/broadcast/send', { message: msg, phones: [phone], delay_ms: 0 });
    await uiAlert('Test terkirim!');
  } catch(e) {
    await uiAlert('Gagal: ' + e.message);
  }
}

async function sendBroadcast() {
  const template = document.getElementById('bc-template')?.value?.trim();
  if (!template) { await uiAlert('Template pesan kosong'); return; }
  const selected = bcContactRows.filter(r => r._selected);
  if (selected.length === 0) { await uiAlert('Pilih minimal 1 kontak (centang baris)'); return; }

  const phones = selected.map(r => r.phone).filter(p => p);
  if (phones.length === 0) { await uiAlert('Tidak ada nomor HP pada kontak terpilih'); return; }

  const delayMs = (parseInt(document.getElementById('bc-delay')?.value) || 3) * 1000;

  if (!await uiConfirm('Kirim broadcast ke ' + phones.length + ' kontak dengan delay ' + (delayMs / 1000) + ' detik?', 'Konfirmasi Broadcast', true)) return;

  // Render each message per row
  const phonesFinal = [];
  const messages = [];
  selected.forEach(row => {
    if (!row.phone) return;
    const vars = {};
    bcColumnHeaders.forEach(h => vars[h] = row[h] || '');
    messages.push(renderBCTemplateJS(template, vars));
    phonesFinal.push(row.phone);
  });

  const btn = document.getElementById('bc-send-btn');
  const progress = document.getElementById('bc-progress');
  btn.disabled = true;
  btn.classList.add('opacity-50');
  progress.classList.remove('hidden');

  try {
    await api('POST', '/api/broadcast/send', {
      message: template,
      phones: phonesFinal,
      messages: messages,
      delay_ms: delayMs
    });
  } catch(e) {
    await uiAlert('Gagal mengirim: ' + e.message);
    btn.disabled = false;
    btn.classList.remove('opacity-50');
    progress.classList.add('hidden');
  }
}

async function disconnectWA() {
  if (!await uiConfirm('Putuskan sesi WhatsApp? QR code perlu discan ulang setelah disconnect.', 'Disconnect WhatsApp', true)) return;
  try {
    await api('POST', '/api/broadcast/disconnect');
    await uiAlert('Sesi WhatsApp berhasil diputus');
    loadWAStatus();
  } catch(e) {
    await uiAlert('Gagal disconnect: ' + e.message);
  }
}

async function loadBCHistory() {
  try {
    const logs = await api('GET', '/api/broadcast/logs');
    const el = document.getElementById('bc-history-list');
    if (!logs || logs.length === 0) {
      el.innerHTML = '<p class=text-sm text-slate-400>Belum ada riwayat broadcast.</p>';
      return;
    }
    el.innerHTML = '<div class="overflow-x-auto bg-white rounded-lg border border-slate-200"><table class="w-full text-sm"><thead><tr class="bg-slate-50 text-left text-xs text-slate-500 uppercase"><th class="px-3 py-2">Waktu</th><th class="px-3 py-2">Pesan</th><th class="px-3 py-2">Status</th><th class="px-3 py-2">Dikirim</th><th class="px-3 py-2">Gagal</th><th class="px-3 py-2 w-20"></th></tr></thead><tbody>' + logs.map(l => {
      const statusBadge = l.status === 'done' ? '<span class="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">Selesai</span>'
        : l.status === 'failed' ? '<span class="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">Gagal</span>'
        : l.status === 'partial' ? '<span class="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full">Sebagian</span>'
        : '<span class="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">Mengirim</span>';
      const date = new Date(l.started_at).toLocaleString('id-ID', {day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
      return '<tr class="border-t border-slate-100 hover:bg-slate-50 cursor-pointer" onclick="showBCDetail(\'' + l.id + '\')"><td class="px-3 py-2 text-xs">' + date + '</td><td class="px-3 py-2 max-w-[200px] truncate">' + escHtml(l.message.substring(0, 80)) + '</td><td class="px-3 py-2">' + statusBadge + '</td><td class="px-3 py-2">' + (l.sent_count || 0) + '</td><td class="px-3 py-2">' + (l.failed_count || 0) + '</td><td class="px-3 py-2 text-xs text-blue-600">Detail</td></tr>';
    }).join('') + '</tbody></table></div>';
  } catch(e) {
    document.getElementById('bc-history-list').innerHTML = errHtml(e);
  }
}

async function showBCDetail(id) {
  try {
    const data = await api('GET', '/api/broadcast/logs/' + id);
    const el = document.getElementById('bc-history-detail');
    el.classList.remove('hidden');
    const l = data.log;
    const r = data.recipients || [];
    el.innerHTML = '<div class="border border-slate-200 rounded-xl p-4 bg-white"><div class="flex items-center justify-between mb-3"><h4 class="font-bold text-sm">Detail Broadcast</h4><button onclick="document.getElementById(\'bc-history-detail\').classList.add(\'hidden\')" class="text-slate-400 hover:text-slate-600">Tutup</button></div><div class="text-sm text-slate-600 mb-3">' + escHtml(l.message) + '</div><p class="text-xs text-slate-400 mb-3">Oleh: ' + escHtml(l.sent_by || '') + ' | Total: ' + (l.total_receivers || 0) + ' | Dikirim: ' + (l.sent_count || 0) + ' | Gagal: ' + (l.failed_count || 0) + '</p>' + (r.length > 0 ? '<div class="overflow-x-auto"><table class="w-full text-xs"><thead><tr class="bg-slate-50 text-left text-slate-500"><th class="px-2 py-1">Nomor</th><th class="px-2 py-1">Status</th><th class="px-2 py-1">Error</th></tr></thead><tbody>' + r.map(rc => '<tr class="border-t border-slate-100"><td class="px-2 py-1 font-mono">' + escHtml(rc.phone) + '</td><td class="px-2 py-1">' + (rc.status === 'sent' ? '<span class="text-green-600">Terkirim</span>' : '<span class="text-red-600">Gagal</span>') + '</td><td class="px-2 py-1 text-red-500">' + escHtml(rc.error || '-') + '</td></tr>').join('') + '</tbody></table></div>' : '<p class="text-xs text-slate-400">Tidak ada detail penerima.</p>') + '</div>';
  } catch(e) {
    await uiAlert('Gagal memuat detail: ' + e.message);
  }
}

function connectBCWebSocket() {
  try {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    bcWs = new WebSocket(protocol + '//' + location.host + '/api/broadcast/ws');
    bcWs.onmessage = (evt) => {
      try { handleBCEvent(JSON.parse(evt.data)); } catch(e) {}
    };
    bcWs.onclose = () => { setTimeout(connectBCWebSocket, 10000); };
    bcWs.onerror = () => { bcWs?.close(); };
  } catch(e) {}
}

function handleBCEvent(data) {
  if (data.type === 'broadcast_progress') {
    const bar = document.getElementById('bc-progress-bar');
    const text = document.getElementById('bc-progress-text');
    if (bar) bar.style.width = (data.percentage || 0).toFixed(0) + '%';
    if (text) text.textContent = (data.sent || 0) + '/' + (data.total || 0) + ' dikirim, ' + (data.failed || 0) + ' gagal';
  }
  if (data.type === 'broadcast_completed') {
    document.getElementById('bc-progress')?.classList.add('hidden');
    const btn = document.getElementById('bc-send-btn');
    if (btn) { btn.disabled = false; btn.classList.remove('opacity-50'); }
    loadBCHistory();
    loadWAStatus();
    const msg = data.status === 'done' ? 'Broadcast selesai! ' + (data.sent || 0) + ' pesan terkirim.'
      : data.status === 'failed' ? 'Broadcast gagal. ' + (data.failed || 0) + ' dari ' + (data.total || 0) + ' gagal.'
      : 'Broadcast sebagian: ' + (data.sent || 0) + ' terkirim, ' + (data.failed || 0) + ' gagal.';
    uiAlert(msg, 'Hasil Broadcast');
  }
}
