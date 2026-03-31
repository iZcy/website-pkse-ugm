// ── TENTANG PERIODE ──────────────────────────────────────────────────────────
async function loadTentang() {
  initQuill('editor-visi');
  initQuill('editor-misi');
  ['editor-visi', 'editor-misi'].forEach((id) => {
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
    const pa = await api('GET', `/api/cms/period-about?period=${currentPeriod()}`);
    state.periodAbout = pa || {};
    quillSetHTML('editor-visi', pa.visi || '');
    quillSetHTML('editor-misi', pa.misi || '');
    var _el;
    if ((_el = document.getElementById('tentang-tagline-title'))) _el.value = pa.tagline_title || '';
    if ((_el = document.getElementById('tentang-tagline-subtitle'))) _el.value = pa.tagline_subtitle || '';
    if ((_el = document.getElementById('tentang-tagline-desc'))) _el.value = pa.tagline_description || '';
    if (pa.cover_image_url) pickerSetUrl('picker-cover', pa.cover_image_url);
    else pickerClear('picker-cover');
    if (pa.hierarchy_image_url) pickerSetUrl('picker-struktur', pa.hierarchy_image_url);
    else pickerClear('picker-struktur');
    if (pa.logo_kabinet_url) pickerSetUrl('picker-logo-kabinet', pa.logo_kabinet_url);
    else pickerClear('picker-logo-kabinet');
    state.periodGallery = Array.isArray(pa.gallery) ? pa.gallery : [];
    renderTentangPreview();
  } catch(e) {
    state.periodAbout = { period_label: currentPeriod() };
    state.periodGallery = [];
    renderTentangPreview();
  }
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

document.addEventListener('DOMContentLoaded', function() {
  // Gallery button handlers
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
  });

  // Tentang-tagline input listener
  document.addEventListener('input', (e) => {
    const t = e.target;
    if (!t) return;
    if (['tentang-tagline-title', 'tentang-tagline-subtitle', 'tentang-tagline-desc'].includes(t.id)) {
      renderTentangPreview();
      return;
    }
  });

  // Form submit
  document.getElementById('formTentang')?.addEventListener('submit', async e => {
    e.preventDefault();
    const msg = document.getElementById('tentang-msg');
    try {
      await api('PUT', '/api/cms/period-about', {
        period_label: currentPeriod(),
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
        period_label: currentPeriod(),
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

  loadTentang();
});
