// ── PENGUMUMAN ───────────────────────────────────────────────────────────────
async function loadPengumuman() {
  const el = document.getElementById('list-pengumuman');
  try {
    const resp = await api('GET', `/api/cms/announcements?period=${currentPeriod()}`);
    const items = resp.items || resp || [];
    if (!items.length) { el.innerHTML = emptyHtml('Belum ada pengumuman.'); return; }
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
    period_label: currentPeriod()
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

document.addEventListener('DOMContentLoaded', function() {
  loadPengumuman();
});
