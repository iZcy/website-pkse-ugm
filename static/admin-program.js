// ── PROGRAM ──────────────────────────────────────────────────────────────────

async function loadPrograms() {
  const tb = document.getElementById('program-tbody');
  if (!tb) return;
  try {
    const [programsResp, deptsResp] = await Promise.all([
      api('GET', `/api/cms/programs?period=${currentPeriod()}`),
      api('GET', `/api/cms/departments?period=${currentPeriod()}`)
    ]);
    const programs = programsResp.items || programsResp || [];
    const depts = deptsResp.items || deptsResp || [];
    programCache = programs;
    programDeptCache = depts;

    // Populate department filter dropdown
    const deptSel = document.getElementById('programDeptFilter');
    if (deptSel) {
      deptSel.innerHTML = '<option value="">Semua</option>' + programDeptCache.map(d => `<option value="${escHtml(d.name)}">${escHtml(d.name)}</option>`).join('');
    }

    renderProgramTable();
  } catch (e) {
    tb.innerHTML = `<tr><td colspan="5" class="p-6">${errHtml(e.message)}</td></tr>`;
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
    tb.innerHTML = '<tr><td colspan="5" class="p-6 text-center text-slate-400">Tidak ada program yang cocok.</td></tr>';
    return;
  }

  tb.innerHTML = filtered.map((p, pi) => `
    <tr class="border-b border-slate-100 hover:bg-slate-50">
      <td class="p-4 align-middle text-slate-400 text-center w-10">${pi + 1}</td>
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
      programDeptCache = await api('GET', `/api/cms/departments?period=${currentPeriod()}`);
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

document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('formProgram')?.addEventListener('submit', async e => {
    e.preventDefault();
    const id = document.getElementById('program-id').value;
    const payload = {
      period_label: currentPeriod(),
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

  loadPrograms();
});
