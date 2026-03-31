// ── STATISTIK ──────────────────────────────────────────────────────────

async function syncStats() {
    const cur = currentPeriod();
    if(!cur || cur === '_TEMPLATE_') return uiAlert("Pilih periode valid!");
  if(!await uiConfirm("Tarik template statistik global ke periode ini?", 'Konfirmasi Sinkronisasi')) return;
    try {
        await api('POST', '/api/cms/sync-stats', { period_label: cur });
        uiAlert("Berhasil menarik template.");
        loadStatistik();
    } catch(e) { uiAlert(e); }
}
function initStatsSortable(tbodyId) {
  const tb = document.getElementById(tbodyId);
  if (!tb) return;
  if (tb._sortable) tb._sortable.destroy();
  tb._sortable = Sortable.create(tb, {
    animation: 180,
    handle: '.stat-drag',
    onEnd: async () => {
      const rows = tb.querySelectorAll('tr[data-id]');
      for (let i = 0; i < rows.length; i++) {
        const id = rows[i].getAttribute('data-id');
        const source = [...(state.global_stats || []), ...(state.stats || [])].find(x => x.id === id);
        if (!source) continue;
        const payload = {
          ...source,
          order: i,
          template_id: source.template_id || source.id,
          chart_type: source.chart_type || 'bar',
          fillable: !!source.fillable,
          visible: source.visible !== false
        };
        await api('PUT', '/api/cms/stats/' + id, payload);
      }
      if (tbodyId === 'global-stats-tbody') loadGlobalStatsTab();
      else loadStatistik();
    }
  });
}

async function toggleTemplateFlag(id, key, checked) {
  const s = (state.global_stats || []).find(x => x.id === id);
  if (!s) return;
  const payload = {
    ...s,
    template_id: s.template_id || s.id,
    chart_type: s.chart_type || 'bar',
    fillable: key === 'fillable' ? checked : !!s.fillable,
    visible: key === 'visible' ? checked : s.visible !== false,
    period_label: '_TEMPLATE_'
  };
  await api('PUT', '/api/cms/stats/' + id, payload);
  loadGlobalStatsTab();
}

async function loadGlobalStatsTab() {
    const tb = document.getElementById('global-stats-tbody');
    if (!tb) return;
    try {
        const resp = await api('GET', '/api/cms/stats?period=_TEMPLATE_');
        const items = resp.items || resp || [];
        state.global_stats = items;
        tb.innerHTML = items.map(s => `
          <tr class="border-b border-slate-100 hover:bg-slate-50 transition" data-id="${s.id}">
            <td class="p-4 align-middle w-10 cursor-move stat-drag text-slate-400 hover:text-slate-600"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"/></svg></td>
            <td class="p-4 align-middle font-medium">${escHtml(s.label||'')}</td>
            <td class="p-4 align-middle text-slate-500">${escHtml(s.desc||'')}</td>
            <td class="p-4 align-middle text-xs">${escHtml((s.chart_type||'bar').toUpperCase())}</td>
            <td class="p-4 align-middle"><input type="checkbox" ${s.fillable ? 'checked' : ''} onchange="toggleTemplateFlag('${s.id}','fillable',this.checked)"></td>
            <td class="p-4 align-middle"><input type="checkbox" ${s.visible === false ? '' : 'checked'} onchange="toggleTemplateFlag('${s.id}','visible',this.checked)"></td>
            <td class="p-4 align-middle text-right">
              <button onclick="editGlobalStat('${s.id}')" class="text-blue-600 p-1 bg-blue-50 border rounded mr-1">Edit</button>
              <button onclick="deleteGlobalStat('${s.id}')" class="text-red-600 p-1 bg-red-50 border rounded">Hapus</button>
            </td>
          </tr>
        `).join('');
        if(!items.length) tb.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-slate-500">Belum ada template. Tambahkan metrik.</td></tr>`;
        initStatsSortable('global-stats-tbody');
    } catch(e) {
        tb.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-red-500">${e}</td></tr>`;
    }
}

function openStatModalGlobal() {
  document.getElementById('formStatistik').reset();
  document.getElementById('modalStatistikTitle').textContent = 'Tambah Template Statistik';
  document.getElementById('stat-id').value = '';
  document.getElementById('stat-template-id').value = '';
  document.getElementById('stat-period').value = '_TEMPLATE_';
  document.getElementById('stat-value').value = '';
  document.getElementById('stat-value-wrap').classList.add('hidden');
  document.getElementById('stat-preview-wrap').classList.add('hidden');
  document.getElementById('stat-flags-wrap').classList.add('hidden');
  document.getElementById('stat-value').disabled = true;
  document.getElementById('stat-label').disabled = false;
  document.getElementById('stat-desc').disabled = false;
  document.getElementById('stat-chart-type').disabled = false;
  renderChartChoices('bar');
  document.getElementById('stat-fillable').checked = false;
  document.getElementById('stat-visible').checked = true;
  document.getElementById('stat-fillable').disabled = true;
  document.getElementById('stat-visible').disabled = true;
  openModal('modalStatistik');
}

function editGlobalStat(id) {
  const s = state.global_stats.find(x => x.id === id);
  if(!s) return;
  document.getElementById('modalStatistikTitle').textContent = 'Edit Template Statistik';
  document.getElementById('stat-id').value = s.id;
  document.getElementById('stat-template-id').value = s.template_id || s.id;
  document.getElementById('stat-period').value = s.period_label;
  document.getElementById('stat-label').value = s.label||'';
  document.getElementById('stat-value').value = s.value||'';
  document.getElementById('stat-desc').value = s.desc||'';
  renderChartChoices(s.chart_type || 'bar');
  document.getElementById('stat-fillable').checked = !!s.fillable;
  document.getElementById('stat-visible').checked = s.visible !== false;
  document.getElementById('stat-value-wrap').classList.add('hidden');
  document.getElementById('stat-preview-wrap').classList.add('hidden');
  document.getElementById('stat-flags-wrap').classList.remove('hidden');
  document.getElementById('stat-value').disabled = true;
  document.getElementById('stat-label').disabled = false;
  document.getElementById('stat-desc').disabled = false;
  document.getElementById('stat-chart-type').disabled = false;
  document.getElementById('stat-fillable').disabled = false;
  document.getElementById('stat-visible').disabled = false;
  openModal('modalStatistik');
}

async function deleteGlobalStat(id) {
  if(!await uiConfirm('Hapus template ini?', 'Konfirmasi Hapus', true)) return;
  try {
    await api('DELETE', '/api/cms/stats/' + id);
    loadGlobalStatsTab();
  } catch(e) { uiAlert(e); }
}


// ── Stat series click handlers (from global listener) ───────────────────────
document.addEventListener('click', e => {
  var addSeriesBtn = e.target.closest('#btn-add-series');
  if (addSeriesBtn) {
    var chartType = document.getElementById('stat-chart-type')?.value || 'bar';
    var mode = statChartMode(chartType) === 'xy' ? 'xy' : 'series';
    var list = document.getElementById('stat-series-list');
    if (list) {
      var nextIdx = list.querySelectorAll('.stat-row').length;
      list.insertAdjacentHTML('beforeend', statRowInputTemplate(mode, nextIdx, {}));
      renderStatPreview(chartType, collectStatInputValue(chartType));
    }
    return;
  }
  var removeSeriesBtn = e.target.closest('[data-remove-series]');
  if (removeSeriesBtn) {
    var row = removeSeriesBtn.closest('.stat-row');
    if (row) row.remove();
    var chartType = document.getElementById('stat-chart-type')?.value || 'bar';
    try {
      renderStatPreview(chartType, collectStatInputValue(chartType));
    } catch (_) {
      renderStatPreview(chartType, '');
    }
    return;
  }
  var btn = e.target.closest('.chart-choice');
  if (!btn) return;
  var value = btn.getAttribute('data-chart-value') || 'bar';
  renderChartChoices(value);
});



// ── Stat input listener (from global listener) ───────────────────────────────
document.addEventListener('input', (e) => {
  var t = e.target;
  if (!t) return;

  if (t.id === 'stat-simple-value' || t.matches('#stat-series-list input')) {
    var chartType = document.getElementById('stat-chart-type')?.value || 'bar';
    try {
      var value = collectStatInputValue(chartType);
      document.getElementById('stat-value').value = value;
      renderStatPreview(chartType, value);
    } catch (_) {
      renderStatPreview(chartType, '');
    }
    return;
  }
});


document.addEventListener('DOMContentLoaded', function() {
  if (document.getElementById('global-stats-tbody')) {
    loadGlobalStatsTab();
  }
});
