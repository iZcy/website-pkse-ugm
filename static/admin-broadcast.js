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
    let period = document.getElementById('bc-contact-filter')?.value || window.PERIOD || '';
    const contacts = await api('GET', '/api/broadcast/anggota-contacts?period=' + encodeURIComponent(period));
    if (!contacts || !Array.isArray(contacts)) {
      bcContactRows = [];
      renderBCContactsTable();
      return;
    }
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
  if (!tbody) return;
  if (!bcContactRows.length) {
    tbody.innerHTML = '<tr><td colspan="10" class="p-4 text-center text-slate-400">Tidak ada kontak.</td></tr>';
    return;
  }
  tbody.innerHTML = bcContactRows.map((row, idx) => `
    <tr class="border-b border-slate-100 hover:bg-slate-50">
      <td class="p-2"><input type="checkbox" onchange="toggleBCRow(${idx}, this.checked)" ${row._selected ? 'checked' : ''}></td>
      ${bcColumnHeaders.map(h => `<td class="p-2 text-sm">${escHtml(row[h] || '')}</td>`).join('')}
      <td class="p-2"><button onclick="deleteBCRow(${idx})" class="text-red-500 hover:text-red-700 text-xs">Hapus</button></td>
    </tr>
  `).join('');
  updateBCVarList();
}

function renderBCHeaders() {
  const thead = document.getElementById('bc-contacts-thead');
  if (!thead) return;
  thead.innerHTML = `<tr class="bg-slate-50">
    <th class="p-2"><input type="checkbox" onchange="toggleAllBCRows(this.checked)"></th>
    ${bcColumnLabels.map(l => `<th class="p-2 text-left text-xs font-medium text-slate-600">${l}</th>`).join('')}
    <th class="p-2"></th>
  </tr>`;
}

function toggleBCRow(idx, checked) {
  if (bcContactRows[idx]) bcContactRows[idx]._selected = checked;
}

function onBCCellEdit(el, rowIdx, colKey) {
  if (bcContactRows[rowIdx]) bcContactRows[rowIdx][colKey] = el.value;
}

function onBCellKey(event, el) {
  if (event.key === 'Enter') { event.preventDefault(); el.blur(); }
}

function toggleAllBCRows(checked) {
  bcContactRows.forEach(r => r._selected = checked);
  renderBCContactsTable();
}

function addBCRow() {
  bcContactRows.push({ full_name: '', nickname: '', phone: '', department: '', position: '', program_studi: '', fakultas: '', angkatan: '', _selected: false });
  renderBCContactsTable();
}

function deleteBCRow(idx) {
  bcContactRows.splice(idx, 1);
  renderBCContactsTable();
}

async function renameBCColumn(colIdx) {
  const newName = prompt('Nama kolom baru:', bcColumnLabels[colIdx]);
  if (newName && newName.trim()) {
    bcColumnLabels[colIdx] = newName.trim();
    renderBCHeaders();
    renderBCContactsTable();
  }
}

function importBCFromCSV() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.csv';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 2) { uiAlert('CSV kosong atau tidak ada data.'); return; }
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(',');
      const row = { _selected: false };
      headers.forEach((h, idx) => {
        if (bcColumnHeaders.includes(h)) row[h] = (vals[idx] || '').trim();
      });
      bcContactRows.push(row);
    }
    renderBCContactsTable();
  };
  input.click();
}

function updateBCVarList() {
  const list = document.getElementById('bc-var-list');
  if (!list) return;
  const vars = ['nama', 'nickname', 'phone', 'department', 'position', 'program_studi', 'fakultas', 'angkatan'];
  list.innerHTML = vars.map(v => `<span class="inline-block bg-slate-100 px-2 py-1 rounded text-xs cursor-pointer hover:bg-slate-200" onclick="insertBCVar('${v}')">{{${v}}}</span>`).join(' ');
}

function insertBCVar(varName) {
  const ta = document.getElementById('bc-message');
  if (!ta) return;
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  ta.value = ta.value.substring(0, start) + '{{' + varName + '}}' + ta.value.substring(end);
  ta.focus();
  ta.selectionStart = ta.selectionEnd = start + varName.length + 4;
  previewBCTemplate();
}

function updateBCPreviewRows() {
  const preview = document.getElementById('bc-preview');
  if (!preview) return;
  const selected = bcContactRows.filter(r => r._selected);
  if (!selected.length) { preview.innerHTML = '<p class="text-slate-400 text-sm">Pilih kontak untuk preview.</p>'; return; }
  const template = document.getElementById('bc-message')?.value || '';
  preview.innerHTML = selected.slice(0, 3).map(r => {
    let msg = template;
    Object.keys(r).forEach(k => { if (k !== '_selected') msg = msg.replace(new RegExp('{{' + k + '}}', 'g'), r[k] || ''); });
    return `<div class="p-2 bg-slate-50 rounded mb-2 text-sm"><p class="text-xs text-slate-500 mb-1">Ke: ${r.full_name || r.phone || '-'}</p>${escHtml(msg)}</div>`;
  }).join('') + (selected.length > 3 ? `<p class="text-xs text-slate-400">+${selected.length - 3} lainnya...</p>` : '');
}

function renderBCTemplateJS(template, vars) {
  let msg = template;
  Object.keys(vars).forEach(k => { msg = msg.replace(new RegExp('{{' + k + '}}', 'g'), vars[k] || ''); });
  return msg;
}

function previewBCTemplate() {
  updateBCPreviewRows();
}

async function sendBCTest() {
  const phone = document.getElementById('bc-test-phone')?.value;
  if (!phone) { uiAlert('Masukkan nomor HP untuk test.'); return; }
  const template = document.getElementById('bc-message')?.value || '';
  const msg = renderBCTemplateJS(template, { nama: 'Test', nickname: 'Test', phone: phone, department: '-', position: '-', program_studi: '-', fakultas: '-', angkatan: '-' });
  try {
    await api('POST', '/api/broadcast/send', { phone, message: msg });
    uiAlert('Pesan test terkirim!');
  } catch(e) {
    uiAlert('Gagal mengirim: ' + e.message);
  }
}

async function sendBroadcast() {
  const selected = bcContactRows.filter(r => r._selected);
  if (!selected.length) { uiAlert('Pilih minimal satu kontak.'); return; }
  const template = document.getElementById('bc-message')?.value || '';
  if (!template.trim()) { uiAlert('Tulis pesan terlebih dahulu.'); return; }
  if (!await uiConfirm(`Kirim pesan ke ${selected.length} kontak?`, 'Konfirmasi Broadcast')) return;
  let sent = 0, failed = 0;
  for (const r of selected) {
    const msg = renderBCTemplateJS(template, r);
    try {
      await api('POST', '/api/broadcast/send', { phone: r.phone, message: msg });
      sent++;
    } catch(e) {
      failed++;
    }
  }
  uiAlert(`Broadcast selesai.\nTerkirim: ${sent}\nGagal: ${failed}`, 'Hasil Broadcast');
}

async function disconnectWA() {
  if (!await uiConfirm('Putuskan koneksi WhatsApp?', 'Konfirmasi')) return;
  try {
    await api('POST', '/api/broadcast/disconnect', {});
    loadWAStatus();
  } catch(e) {
    uiAlert('Gagal: ' + e.message);
  }
}

async function loadBCHistory() {
  const tbody = document.getElementById('bc-history-tbody');
  if (!tbody) return;
  try {
    const logs = await api('GET', '/api/broadcast/logs');
    if (!logs || !logs.length) { tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-slate-400">Belum ada riwayat.</td></tr>'; return; }
    tbody.innerHTML = logs.map(l => `
      <tr class="border-b border-slate-100 hover:bg-slate-50 cursor-pointer" onclick="showBCDetail('${l.id}')">
        <td class="p-3 text-sm">${new Date(l.created_at).toLocaleString('id-ID')}</td>
        <td class="p-3 text-sm">${escHtml(l.status || '-')}</td>
        <td class="p-3 text-sm">${l.total || 0}</td>
        <td class="p-3 text-sm">${escHtml((l.message || '').substring(0, 50))}...</td>
      </tr>
    `).join('');
  } catch(e) {
    tbody.innerHTML = `<tr><td colspan="4" class="p-4">${errHtml(e.message)}</td></tr>`;
  }
}

async function showBCDetail(id) {
  try {
    const log = await api('GET', '/api/broadcast/logs/' + id);
    document.getElementById('bc-detail-content').innerHTML = `<pre class="text-xs bg-slate-50 p-4 rounded overflow-auto max-h-96">${JSON.stringify(log, null, 2)}</pre>`;
    openModal('modalBcDetail');
  } catch(e) {
    uiAlert('Gagal memuat detail: ' + e.message);
  }
}

function connectBCWebSocket() {
  const wsUrl = (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host + '/api/broadcast/ws';
  try {
    bcWs = new WebSocket(wsUrl);
    bcWs.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        handleBCEvent(data);
      } catch(_) {}
    };
    bcWs.onclose = () => { setTimeout(connectBCWebSocket, 5000); };
    bcWs.onerror = () => { bcWs.close(); };
  } catch(e) {}
}

function handleBCEvent(data) {
  if (data.type === 'status') loadWAStatus();
  if (data.type === 'qr') loadWAQR();
}

document.addEventListener('DOMContentLoaded', function() {
  initBroadcast();
  renderBCHeaders();
});
