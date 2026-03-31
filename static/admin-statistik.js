// ── STATISTIK (Period-specific) ──────────────────────────────────────────────────────────

async function loadStatistik() {
  const cur = currentPeriod();
  if(!cur) return;
  const tb = document.getElementById('statistik-tbody');
  try {
    // Load template statistik with Fillable=true
    const templatesResp = await api('GET', '/api/cms/stats?period=_TEMPLATE_');
    const templates = templatesResp.items || templatesResp || [];
    const fillableTemplates = templates.filter(t => t.fillable);

    // Load period statistik values
    const periodStatsResp = await api('GET', '/api/cms/stats?period=' + cur);
    const periodStats = periodStatsResp.items || periodStatsResp || [];
    state.stats = periodStats;

    // Create map of period stats by template_id
    const statsMap = {};
    state.stats.forEach(s => {
      const templateId = s.template_id || s.id;
      statsMap[templateId] = s;
    });

    tb.innerHTML = fillableTemplates.map(template => {
      const stat = statsMap[template.id];
      const value = stat ? stat.value : '';
      return `
      <tr class="border-b border-slate-100 hover:bg-slate-50 transition" data-id="${template.id}">
        <td class="p-4 align-middle w-10 cursor-move stat-drag text-slate-400 hover:text-slate-600"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"/></svg></td>
        <td class="p-4 align-middle font-medium">${escHtml(template.label||'')}</td>
        <td class="p-4 align-middle">
          <p class="font-semibold text-slate-700">${escHtml(statValueDisplay(value, template.chart_type || 'bar'))}</p>
          <p class="text-xs text-slate-500 mt-1">Mode: ${escHtml(statChartMode(template.chart_type || 'bar'))}</p>
        </td>
        <td class="p-4 align-middle min-w-[120px]">
          <div class="rounded-md border border-slate-200 bg-slate-50 p-1.5">${chartPreviewSVG(template.chart_type || 'bar')}</div>
        </td>
        <td class="p-4 align-middle">${escHtml(template.desc||'')}</td>
        <td class="p-4 align-middle text-right">
          <button onclick="editStatPeriod('${template.id}')" class="text-blue-600 p-1 bg-blue-50 border rounded mr-1">Isi Nilai</button>
        </td>
      </tr>
    `}).join('');

    if(!fillableTemplates.length) {
      tb.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-slate-500">Belum ada template statistik yang dapat diisi. Buat template di Template Statistik terlebih dahulu.</td></tr>`;
    }
  } catch(e) { tb.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-red-500">${escHtml(e.message || e)}</td></tr>`; }
}

function statValueDisplay(value, chartType) {
  if (!value) return '-';
  try {
    const mode = statChartMode(chartType);
    if (mode === 'simple') return value;
    try {
      const data = typeof value === 'string' ? JSON.parse(value) : value;
      if (Array.isArray(data)) {
        const count = data.length;
        return count === 1 ? `${data[0].label || data[0].x}: ${data[0].value ?? data[0].y}` : `${count} data points`;
      }
      return String(value).substring(0, 50);
    } catch(ex) {
      return String(value).substring(0, 50);
    }
  } catch(ex) {
    return String(value).substring(0, 50);
  }
}

function editStatPeriod(templateId) {
  const cur = currentPeriod();
  if(!cur) { uiAlert('Pilih periode dulu.'); return; }

  // Find template
  const template = state.global_stats && state.global_stats.find(x => x.id === templateId);
  if(!template) { uiAlert('Template tidak ditemukan.'); return; }

  // Find existing period stat
  const existing = state.stats && state.stats.find(x => (x.template_id || x.id) === templateId);

  document.getElementById('formStatistik').reset();
  document.getElementById('modalStatistikTitle').textContent = 'Isi Nilai: ' + escHtml(template.label||'');
  document.getElementById('stat-id').value = existing ? existing.id : '';
  document.getElementById('stat-template-id').value = templateId;
  document.getElementById('stat-period').value = cur;
  document.getElementById('stat-label').value = template.label||'';
  document.getElementById('stat-value').value = existing ? (existing.value || '') : '';
  document.getElementById('stat-desc').value = template.desc||'';

  // Hide label, desc, type, flags - only show value input
  document.getElementById('stat-value-wrap')?.classList.remove('hidden');
  document.getElementById('stat-preview-wrap')?.classList.remove('hidden');
  document.getElementById('stat-flags-wrap')?.classList.add('hidden');

  // Disable label/desc/type inputs
  document.getElementById('stat-label').disabled = true;
  document.getElementById('stat-desc').disabled = true;
  document.getElementById('stat-chart-type').disabled = true;
  document.getElementById('stat-fillable').disabled = true;
  document.getElementById('stat-visible').disabled = true;
  document.getElementById('stat-value').disabled = false;

  // Setup value input UI
  renderChartChoices(template.chart_type || 'bar', true);
  renderStatValueInput(template.chart_type || 'bar', existing ? (existing.value || '') : '');
  renderStatPreview(template.chart_type || 'bar', existing ? (existing.value || '') : '');

  openModal('modalStatistik');
}

function editStat(id) {
  const s = state.stats.find(x => x.id === id);
  if(!s) return;
  document.getElementById('modalStatistikTitle').textContent = 'Edit Nilai Statistik Periode';
  document.getElementById('stat-id').value = s.id;
  document.getElementById('stat-template-id').value = s.template_id || s.id;
  document.getElementById('stat-period').value = s.period_label;
  document.getElementById('stat-label').value = s.label||'';
  document.getElementById('stat-value').value = s.value||'';
  document.getElementById('stat-desc').value = s.desc||'';
  renderChartChoices(s.chart_type || 'bar');
  document.getElementById('stat-fillable').checked = !!s.fillable;
  document.getElementById('stat-visible').checked = s.visible !== false;
  document.getElementById('stat-value-wrap')?.classList.remove('hidden');
  document.getElementById('stat-preview-wrap')?.classList.remove('hidden');
  document.getElementById('stat-flags-wrap')?.classList.add('hidden');
  document.getElementById('stat-value').disabled = false;
  document.getElementById('stat-label').disabled = true;
  document.getElementById('stat-desc').disabled = true;
  document.getElementById('stat-chart-type').disabled = true;
  document.getElementById('stat-fillable').disabled = true;
  document.getElementById('stat-visible').disabled = true;
  renderStatValueInput(s.chart_type || 'bar', s.value || '');
  renderStatPreview(s.chart_type || 'bar', s.value || '');
  openModal('modalStatistik');
}

document.getElementById('formStatistik')?.addEventListener('submit', async e => {
  e.preventDefault();
  const periodLabel = document.getElementById('stat-period').value || currentPeriod();
  const chartType = document.getElementById('stat-chart-type').value;
  let normalizedValue = document.getElementById('stat-value').value;
  if (periodLabel !== '_TEMPLATE_') {
    try {
      normalizedValue = collectStatInputValue(chartType);
    } catch (ex) {
      uiAlert(ex.message || String(ex));
      return;
    }
  }
  if (periodLabel !== '_TEMPLATE_' && !String(normalizedValue || '').trim()) {
    uiAlert('Value statistik periode wajib diisi.');
    return;
  }
  document.getElementById('stat-value').value = normalizedValue;
  const data = {
    id: document.getElementById('stat-id').value,
    template_id: document.getElementById('stat-template-id').value,
    period_label: periodLabel,
    label: document.getElementById('stat-label').value,
    value: normalizedValue,
    desc: document.getElementById('stat-desc').value,
    chart_type: chartType,
    fillable: document.getElementById('stat-fillable').checked,
    visible: document.getElementById('stat-visible').checked,
    order: 0
  };
  try {
     await api(data.id ? 'PUT' : 'POST', '/api/cms/stats', data);
     closeModal('modalStatistik');
     if(periodLabel === '_TEMPLATE_') {
        loadGlobalStatsTab();
     } else {
        loadStatistik();
     }
  } catch(ex) { uiAlert(ex); }
});

document.addEventListener('DOMContentLoaded', function() {
  // Only load global stats if the element exists (on global-stats page)
  if (document.getElementById('global-stats-tbody')) {
    loadGlobalStatsTab();
  }
  // Load period stats if the element exists (on statistik page)
  if (document.getElementById('statistik-tbody')) {
    loadStatistik();
  }
});
