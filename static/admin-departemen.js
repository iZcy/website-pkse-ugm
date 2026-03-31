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
    const [deptsResp, membersResp] = await Promise.all([
      api('GET', `/api/cms/departments?period=${currentPeriod()}`),
      api('GET', `/api/cms/members?period=${currentPeriod()}`)
    ]);
    const depts = deptsResp.items || deptsResp || [];
    const members = membersResp.items || membersResp || [];
    deptCache = depts;
    memberCache = Array.isArray(members) ? members : [];

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

document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('formKementerian')?.addEventListener('submit', async e => {
    e.preventDefault();
    const id = document.getElementById('dept-id').value;
    const parentId = document.getElementById('dept-parent').value;
    const body = {
      name: document.getElementById('dept-name').value,
      description: document.getElementById('dept-desc').value,
      icon_url: pickerGetUrl('picker-dept-icon'),
      period_label: currentPeriod(),
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

  loadKementerian();
});
