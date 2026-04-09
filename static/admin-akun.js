// ── MANAJEMEN AKUN ───────────────────────────────────────────────────────────
async function loadAkun() {
  const el = document.getElementById('list-akun');
  try {
    const resp = await api('GET', '/api/cms/accounts');
    const items = resp.items || resp || [];
    if (!items.length) { el.innerHTML = emptyHtml('Belum ada akun.'); return; }
    el.innerHTML = `<div class="overflow-x-auto bg-white rounded-lg border border-slate-200"><table class="w-full text-sm">
      <thead><tr class="border-b border-slate-200 text-left text-slate-600 text-xs uppercase tracking-wider bg-slate-50">
        <th class="px-4 py-3 bg-slate-50 font-semibold w-10">No.</th>
        <th class="px-4 py-3 bg-slate-50 font-semibold">Username</th>
        <th class="px-4 py-3 bg-slate-50 font-semibold">Role</th>
        <th class="px-4 py-3 bg-slate-50 font-semibold">Periode</th>
        <th class="px-4 py-3 bg-slate-50 font-semibold">Aksi</th>
      </tr></thead>
      <tbody class="divide-y divide-slate-100">
        ${items.map((u, i) => `
        <tr class="bg-white hover:bg-slate-50">
          <td class="px-4 py-3 text-slate-400 border-t border-slate-100 text-center">${i + 1}</td>
          <td class="px-4 py-3 font-medium text-slate-800 border-t border-slate-100">${escHtml(u.username)}</td>
          <td class="px-4 py-3 border-t border-slate-100"><span class="px-2 py-0.5 rounded-full text-xs font-medium ${u.role === 'superadmin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}">${escHtml(u.role)}</span></td>
          <td class="px-4 py-3 text-slate-500 border-t border-slate-100">${escHtml(u.assigned_period || '—')}</td>
          <td class="px-4 py-3 border-t border-slate-100">
            <div class="flex gap-1">
              <button onclick='editAkun(${JSON.stringify(u).replace(/'/g, "&#39;")})' class="text-blue-600 hover:text-blue-800 p-1" title="Edit">
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
  document.getElementById('akun-assigned-period').value = '';
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
  await api('DELETE', '/api/cms/accounts/' + id);
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
    if (id) await api('PUT', '/api/cms/accounts/' + id, body);
    else await api('POST', '/api/cms/accounts', body);
    closeModal('modalAkun');
    loadAkun();
  } catch(ex) { uiAlert('Error: ' + ex.message); }
});

function toggleAssignedPeriod() {
  const role = document.getElementById('akun-role').value;
  const wrap = document.getElementById('akun-period-wrap');
  if (wrap) wrap.style.display = role === 'admin' ? '' : 'none';
}

document.addEventListener('DOMContentLoaded', function() {
  loadAkun();
});
