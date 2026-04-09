// ── MANAJEMEN PERIODE ────────────────────────────────────────────────────────

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

async function loadPeriode() {
  const el = document.getElementById('list-periode');
  try {
    const resp = await api('GET', '/api/cms/periods');
    const items = resp.items || resp || [];
    state.periods = items;
    if (!items.length) { el.innerHTML = emptyHtml('Belum ada periode.'); return; }
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
          ${!p.is_active ? (p.has_data ? `<button disabled title="Periode ini memiliki data terkait" class="text-red-300 bg-red-50 px-3 py-1.5 rounded-lg text-xs font-medium cursor-not-allowed">Hapus</button>` : `<button onclick="deletePeriode('${p.label}')" class="text-red-600 bg-red-50 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-100">Hapus</button>`) : ''}
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
  if (!await uiConfirm(`Hapus periode "${label}"? Periode hanya bisa dihapus jika tidak memiliki data (anggota, pengumuman, dll).`, 'Konfirmasi Hapus')) return;
  try {
    await api('DELETE', `/api/cms/periods/${label}`);
    loadPeriode();
  } catch(ex) { uiAlert('Error: ' + ex.message); }
}

document.addEventListener('DOMContentLoaded', function() {
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

  loadPeriode();
});
