// ── GALERI ────────────────────────────────────────────────────────────────────
async function loadGaleri() {
  if (!state.periodAbout) {
    await loadTentang();
  }
  renderTentangGalleryEditor(state.periodGallery || []);
}

document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('btn-save-gallery')?.addEventListener('click', async () => {
    const msg = document.getElementById('galeri-msg');
    const current = await api('GET', `/api/cms/period-about?period=${currentPeriod()}`).catch(() => ({ period_label: currentPeriod() }));
    const gallery = collectTentangGallery();
    try {
      await api('PUT', '/api/cms/period-about', {
        ...current,
        period_label: currentPeriod(),
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

  if (!state.periodAbout) {
    loadTentang().then(() => renderTentangGalleryEditor(state.periodGallery || []));
  } else {
    renderTentangGalleryEditor(state.periodGallery || []);
  }
});
