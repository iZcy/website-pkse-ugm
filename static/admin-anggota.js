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

async function loadAnggota(page) {
  page = page || 1;
  const el = document.getElementById('list-anggota');
  if (!el) return;
  try {
    const resp = await api('GET', `/api/cms/members?period=${currentPeriod()}&page=${page}&per_page=50`);
    const items = resp.items || resp || [];
    const respPage = resp.page || page;
    const respPages = resp.pages || 1;
    const respTotal = resp.total || items.length;
    memberCache = Array.isArray(items) ? items : [];
    if (!items.length) { el.innerHTML = emptyHtml('Belum ada anggota.'); return; }
    const noStart = (respPage - 1) * 50;
    el.innerHTML = `<div class="overflow-x-auto bg-white rounded-lg border border-slate-200"><table class="w-full text-sm">
      <thead><tr class="border-b border-slate-200 text-left text-slate-600 text-xs uppercase tracking-wider bg-slate-50">
        <th class="px-4 py-3 bg-slate-50 font-semibold w-10">No.</th>
        <th class="px-4 py-3 bg-slate-50 font-semibold">Foto</th>
        <th class="px-4 py-3 bg-slate-50 font-semibold">Nama</th>
        <th class="px-4 py-3 bg-slate-50 font-semibold">Profil</th>
        <th class="px-4 py-3 bg-slate-50 font-semibold">Status Aktif</th>
        <th class="px-4 py-3 bg-slate-50 font-semibold">No. HP</th>
        <th class="px-4 py-3 bg-slate-50 font-semibold">Penempatan</th>
        <th class="px-4 py-3 bg-slate-50 font-semibold">Aksi</th>
      </tr></thead>
      <tbody class="divide-y divide-slate-100">
        ${items.map((m, mi) => `
        <tr class="bg-white hover:bg-slate-50">
          <td class="px-4 py-3 border-t border-slate-100 text-slate-400 text-center w-10">${noStart + mi + 1}</td>
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
            <div class="text-xs text-slate-400">${escHtml(m.fakultas || '-')} &bull; ${escHtml(m.angkatan || '-')}</div>
          </td>
          <td class="px-4 py-3 text-slate-600 border-t border-slate-100">
            ${m.active_periods && m.active_periods[PERIOD] ? `<span class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Aktif (${escHtml(m.active_periods[PERIOD])})</span>` : '<span class="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Tidak aktif</span>'}
          </td>
          <td class="px-4 py-3 text-slate-600 border-t border-slate-100 text-xs font-mono">
            ${m.phone ? escHtml(m.phone) : '<span class="text-slate-300">-</span>'}
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
    </table></div>${pagHTML('anggota', respPage, respPages)}`;
  } catch (e) { el.innerHTML = errHtml(e.message); }
}

window.anggotaGoPage = function(p) { loadAnggota(p); };

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
  document.getElementById('anggota-position').value = '';
  document.getElementById('modalAnggotaTitle').textContent = 'Tambah Anggota';
  await fillAnggotaDeptOptions();
  renderAnggotaActivationEditor({});
  createImagePicker('picker-anggota-photo');
  createImagePicker('picker-anggota-cover');
  openModal('modalAnggota');
}

async function fillAnggotaDeptOptions(selected) {
  const sel = document.getElementById('anggota-department');
  if (!sel) return;
  let depts = deptCache || [];
  if (!depts.length) {
    try {
      const resp = await api('GET', `/api/cms/departments?period=${currentPeriod()}`);
      depts = resp.items || resp || [];
    } catch (_) {}
  }
  sel.innerHTML = '<option value="">Belum ditempatkan</option>' + depts.map(d => `<option value="${escHtml(d.name)}" ${d.name === selected ? 'selected' : ''}>${escHtml(d.name)}</option>`).join('');
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
  document.getElementById('anggota-position').value = m.position || '';
  document.getElementById('modalAnggotaTitle').textContent = 'Edit Anggota';
  await fillAnggotaDeptOptions(m.department || '');
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
    department: document.getElementById('anggota-department').value,
    position: document.getElementById('anggota-position').value,
    active_periods: activation.periods,
    photo_url: pickerGetUrl('picker-anggota-photo'),
    cover_url: pickerGetUrl('picker-anggota-cover'),
    period_label: currentPeriod()
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

async function openAnggotaMassUpload() {
  try {
    const deptsResp = await api('GET', `/api/cms/departments?period=${currentPeriod()}`);
    const depts = (deptsResp.items || deptsResp || []).map(d => d.name);
    const deptCol = anggotaMassUploadConfig.columns.find(c => c.key === 'department');
    if (deptCol) {
      deptCol.type = 'select';
      deptCol.options = [''].concat(depts);
    }
  } catch (_) {}
  MassUpload.open(anggotaMassUploadConfig);
}

document.addEventListener('DOMContentLoaded', function() {
  loadAnggota();
});
