// -- GLOBAL SETTING --
// ── GLOBAL SETTING ───────────────────────────────────────────────────────────
async function loadGlobal() {
  initQuill('editor-global-about');
  if (quills['editor-global-about'] && !quills['editor-global-about'].__previewBound) {
    quills['editor-global-about'].on('text-change', () => renderGlobalPreview());
    quills['editor-global-about'].__previewBound = true;
  }
  createImagePicker('picker-logo');
  createImagePicker('picker-logo-university');
  createImagePicker('picker-logo-yayasan');
  try {
    const g = await api('GET', '/api/cms/global-setting');
    state.globalSetting = g || {};
    document.getElementById('global-orgname').value = g.org_name || '';
    document.getElementById('global-header-title').value = g.header_title || '';
    document.getElementById('global-header-subtitle').value = g.header_subtitle || '';
    document.getElementById('global-hero-badge').value = g.hero_badge_text || '';
    document.getElementById('global-hero-title-main').value = g.hero_title_main || '';
    document.getElementById('global-hero-title-accent').value = g.hero_title_accent || '';
    document.getElementById('global-footer-title').value = g.footer_title || '';
    document.getElementById('global-footer-copy').value = g.footer_copy_text || '';
    document.getElementById('global-footer-text').value = g.footer_text || '';
    quillSetHTML('editor-global-about', g.about_html || '');
    if (g.logo_url) pickerSetUrl('picker-logo', g.logo_url);
    if (g.logo_university_url) pickerSetUrl('picker-logo-university', g.logo_university_url);
    if (g.logo_yayasan_url) pickerSetUrl('picker-logo-yayasan', g.logo_yayasan_url);
    const sm = g.social_media || {};
    document.getElementById('sm-instagram').value = sm.instagram || '';
    document.getElementById('sm-twitter').value = sm.twitter || '';
    document.getElementById('sm-facebook').value = sm.facebook || '';
    document.getElementById('sm-youtube').value = sm.youtube || '';
    document.getElementById('sm-linkedin').value = sm.linkedin || '';
    document.getElementById('sm-tiktok').value = sm.tiktok || '';
    document.getElementById('sm-email').value = sm.email || '';
    renderGlobalPreview();
  } catch(e) {
    state.globalSetting = {};
    renderGlobalPreview();
  }
}

document.getElementById('formGlobal')?.addEventListener('submit', async e => {
  e.preventDefault();
  const msg = document.getElementById('global-msg');
  try {
    const cur = await api('GET', '/api/cms/global-setting').catch(() => ({}));
    await api('PUT', '/api/cms/global-setting', {
      org_name: document.getElementById('global-orgname').value,
      logo_url: pickerGetUrl('picker-logo'),
      logo_university_url: pickerGetUrl('picker-logo-university'),
      logo_yayasan_url: pickerGetUrl('picker-logo-yayasan'),
      header_title: document.getElementById('global-header-title').value,
      header_subtitle: document.getElementById('global-header-subtitle').value,
      hero_badge_text: document.getElementById('global-hero-badge').value,
      hero_title_main: document.getElementById('global-hero-title-main').value,
      hero_title_accent: document.getElementById('global-hero-title-accent').value,
      footer_title: document.getElementById('global-footer-title').value,
      footer_text: document.getElementById('global-footer-text').value,
      footer_copy_text: document.getElementById('global-footer-copy').value,
      about_html: quillGetHTML('editor-global-about'),
      social_media: cur.social_media || {}
    });
    state.globalSetting = {
      ...cur,
      org_name: document.getElementById('global-orgname').value,
      logo_url: pickerGetUrl('picker-logo'),
      logo_university_url: pickerGetUrl('picker-logo-university'),
      logo_yayasan_url: pickerGetUrl('picker-logo-yayasan'),
      header_title: document.getElementById('global-header-title').value,
      header_subtitle: document.getElementById('global-header-subtitle').value,
      hero_badge_text: document.getElementById('global-hero-badge').value,
      hero_title_main: document.getElementById('global-hero-title-main').value,
      hero_title_accent: document.getElementById('global-hero-title-accent').value,
      footer_title: document.getElementById('global-footer-title').value,
      footer_text: document.getElementById('global-footer-text').value,
      footer_copy_text: document.getElementById('global-footer-copy').value,
      about_html: quillGetHTML('editor-global-about'),
      social_media: cur.social_media || {}
    };
    renderGlobalPreview();
    msg.classList.remove('hidden');
    setTimeout(() => msg.classList.add('hidden'), 3000);
  } catch(ex) { uiAlert('Error: ' + ex.message); }
});

document.getElementById('formSocmed')?.addEventListener('submit', async e => {
  e.preventDefault();
  const msg = document.getElementById('socmed-msg');
  try {
    const cur = await api('GET', '/api/cms/global-setting').catch(() => ({}));
    await api('PUT', '/api/cms/global-setting', {
      org_name: cur.org_name || '',
      logo_url: cur.logo_url || '',
      header_title: cur.header_title || '',
      header_subtitle: cur.header_subtitle || '',
      hero_badge_text: cur.hero_badge_text || '',
      hero_title_main: cur.hero_title_main || '',
      hero_title_accent: cur.hero_title_accent || '',
      footer_title: cur.footer_title || '',
      footer_text: cur.footer_text || '',
      footer_copy_text: cur.footer_copy_text || '',
      about_html: cur.about_html || '',
      social_media: {
        instagram: document.getElementById('sm-instagram').value,
        twitter: document.getElementById('sm-twitter').value,
        facebook: document.getElementById('sm-facebook').value,
        youtube: document.getElementById('sm-youtube').value,
        linkedin: document.getElementById('sm-linkedin').value,
        tiktok: document.getElementById('sm-tiktok').value,
        email: document.getElementById('sm-email').value
      }
    });
    state.globalSetting = {
      ...cur,
      social_media: {
        instagram: document.getElementById('sm-instagram').value,
        twitter: document.getElementById('sm-twitter').value,
        facebook: document.getElementById('sm-facebook').value,
        youtube: document.getElementById('sm-youtube').value,
        linkedin: document.getElementById('sm-linkedin').value,
        tiktok: document.getElementById('sm-tiktok').value,
        email: document.getElementById('sm-email').value
      }
    };
    renderGlobalPreview();
    msg.classList.remove('hidden');
    setTimeout(() => msg.classList.add('hidden'), 3000);
  } catch(ex) { uiAlert('Error: ' + ex.message); }
});


function renderGlobalPreview() {
  const wrap = document.getElementById('global-preview');
  if (!wrap) return;
  const orgName = (document.getElementById('global-orgname')?.value || '').trim();
  const headerTitle = (document.getElementById('global-header-title')?.value || '').trim();
  const headerSubtitle = (document.getElementById('global-header-subtitle')?.value || '').trim();
  const heroBadge = (document.getElementById('global-hero-badge')?.value || '').trim();
  const heroMain = (document.getElementById('global-hero-title-main')?.value || '').trim();
  const heroAccent = (document.getElementById('global-hero-title-accent')?.value || '').trim();
  const footerTitle = (document.getElementById('global-footer-title')?.value || '').trim();
  const footerText = (document.getElementById('global-footer-text')?.value || '').trim();
  const footerCopy = (document.getElementById('global-footer-copy')?.value || '').trim();
  const logo = pickerGetUrl('picker-logo') || '';
  const logoUniversity = pickerGetUrl('picker-logo-university') || '';
  const logoYayasan = pickerGetUrl('picker-logo-yayasan') || '';
  const aboutSummary = stripHtml(quillGetHTML('editor-global-about')).slice(0, 140);
  const social = {
    instagram: (document.getElementById('sm-instagram')?.value || '').trim(),
    twitter: (document.getElementById('sm-twitter')?.value || '').trim(),
    facebook: (document.getElementById('sm-facebook')?.value || '').trim(),
    youtube: (document.getElementById('sm-youtube')?.value || '').trim(),
    linkedin: (document.getElementById('sm-linkedin')?.value || '').trim(),
    tiktok: (document.getElementById('sm-tiktok')?.value || '').trim(),
    email: (document.getElementById('sm-email')?.value || '').trim()
  };
  const socialCount = Object.values(social).filter(Boolean).length;
  wrap.innerHTML = `
    <div class="space-y-3">
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-1">
          ${logo ? `<img src="${escHtml(logo)}" alt="logo" class="h-8 w-8 rounded object-contain border border-slate-200">` : '<div class="h-8 w-8 rounded bg-slate-100 border border-slate-200"></div>'}
          ${logoUniversity ? `<img src="${escHtml(logoUniversity)}" alt="university" class="h-8 w-8 rounded object-contain border border-slate-200">` : ''}
          ${logoYayasan ? `<img src="${escHtml(logoYayasan)}" alt="yayasan" class="h-8 w-8 rounded object-contain border border-slate-200">` : ''}
        </div>
        <div>
          <p class="text-sm font-semibold text-slate-800">${escHtml(orgName || '-')}</p>
          <p class="text-xs text-slate-500">${escHtml(headerTitle || '-')} • ${escHtml(headerSubtitle || '-')}</p>
        </div>
      </div>
      <div class="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p class="text-xs text-slate-500">Hero</p>
        <p class="text-xs text-blue-600 font-semibold">${escHtml(heroBadge || '-')}</p>
        <p class="text-sm font-semibold text-slate-800">${escHtml(heroMain || '-')} <span class="text-blue-700">${escHtml(heroAccent || '')}</span></p>
      </div>
      <div class="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p class="text-xs text-slate-500">Footer</p>
        <p class="text-sm font-semibold text-slate-800">${escHtml(footerTitle || '-')}</p>
        <p class="text-xs text-slate-600">${escHtml(footerText || '-')}</p>
        <p class="text-xs text-slate-500">Copyright: ${escHtml(footerCopy || '-')}</p>
      </div>
      <div class="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p class="text-xs text-slate-500">Ringkasan Tentang Global</p>
        <p class="text-xs text-slate-700 mt-1">${escHtml(aboutSummary || '-')}</p>
      </div>
      <p class="text-xs text-slate-500">Tautan media sosial aktif: <span class="font-semibold text-slate-700">${socialCount}</span></p>
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', function() {
  // Global field input listener
  document.addEventListener('input', (e) => {
    var t = e.target;
    if (!t) return;
    if (['global-orgname', 'global-header-title', 'global-header-subtitle', 'global-hero-badge', 'global-hero-title-main', 'global-hero-title-accent', 'global-footer-title', 'global-footer-copy', 'global-footer-text', 'sm-instagram', 'sm-twitter', 'sm-facebook', 'sm-youtube', 'sm-linkedin', 'sm-tiktok', 'sm-email'].includes(t.id)) {
      renderGlobalPreview();
    }
  });

  loadGlobal();
});
