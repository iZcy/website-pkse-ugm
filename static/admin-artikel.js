// ── ARTIKEL ──────────────────────────────────────────────────────────────────
async function loadArtikel() {
  const el = document.getElementById('list-artikel');
  try {
    const resp = await api('GET', `/api/cms/articles?period=${currentPeriod()}`);
    const items = resp.items || resp || [];
    if (!items.length) { el.innerHTML = emptyHtml('Belum ada artikel.'); return; }
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
    period_label: currentPeriod()
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

document.addEventListener('DOMContentLoaded', function() {
  loadArtikel();
});
