// ── FAQ GLOBAL & PERIODE ──────────────────────────────────────────────────

function initFAQSorable(pLabel) {
  const tb = document.getElementById('faq-global-tbody');
  if(!tb) return;
  
  if (tb._sortable) tb._sortable.destroy();
  tb._sortable = Sortable.create(tb, {
    animation: 180,
    handle: '.faq-drag',
    onEnd: async () => {
      const rows = tb.querySelectorAll('.faq-row');
      const updates = [];
      rows.forEach((row, index) => {
        const id = row.getAttribute('data-id');
        const f = state.faqs.find(x => x.id === id);
        if(f && f.order !== index) {
            f.order = index;
            updates.push( api('PUT', '/api/cms/faqs/' + id, f) );
        }
      });
      if(updates.length > 0) {
        try {
            await Promise.all(updates);
        } catch(e) {
            uiAlert('Gagal mengurutkan FAQ: ' + e.message);
        }
      }
    }
  });
}
async function loadFAQs(pLabel) {
  const tb = document.getElementById('faq-global-tbody');
  try {
    const resp = await api('GET', '/api/cms/faqs?period=' + encodeURIComponent(pLabel));
    const items = resp.items || resp || [];
    state.faqs = items;
    tb.innerHTML = items.map(f => `
      <tr class="border-b border-slate-100 hover:bg-slate-50 transition faq-row" data-id="${f.id}">
        <td class="p-4 align-middle w-10 cursor-move faq-drag text-slate-400 hover:text-slate-600"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"/></svg></td>
        <td class="p-4 align-middle font-medium">${escHtml((f.question||'').substring(0,30))}...</td>
        <td class="p-4 align-middle">${escHtml((f.answer||'').substring(0,30))}...</td>
                <td class="p-4 align-middle text-right">
          <button onclick="editFAQ('${f.id}','${pLabel}')" class="text-blue-600 p-1 bg-blue-50 border rounded mr-1">Edit</button>
          <button onclick="deleteFAQ('${f.id}','${pLabel}')" class="text-red-600 p-1 bg-red-50 border rounded">Hapus</button>
        </td>
      </tr>
    `).join('');
    initFAQSorable(pLabel);
  } catch(e) { tb.innerHTML = `<tr><td colspan="3">${errHtml(e.message)}</td></tr>`; }
}
function openFAQModal(pLabel) {
  document.getElementById('formFAQ').reset();
  document.getElementById('faq-id').value = '';
  document.getElementById('faq-period').value = pLabel;
  openModal('modalFAQ');
}
function editFAQ(id, pLabel) {
  const f = state.faqs.find(x => x.id === id);
  if(!f) return;
  document.getElementById('faq-id').value = f.id;
  document.getElementById('faq-period').value = f.period_label;
  document.getElementById('faq-question').value = f.question||'';
  document.getElementById('faq-answer').value = f.answer||'';
  openModal('modalFAQ');
}
async function deleteFAQ(id, pLabel) {
  if(!await uiConfirm('Hapus FAQ ini?', 'Konfirmasi Hapus', true)) return;
  await api('DELETE', '/api/cms/faqs/' + id);
  loadFAQs(pLabel);
}
document.getElementById('formFAQ')?.addEventListener('submit', async e => {
  e.preventDefault();
  const data = {
    id: document.getElementById('faq-id').value,
    period_label: document.getElementById('faq-period').value,
    question: document.getElementById('faq-question').value,
    answer: document.getElementById('faq-answer').value,
    order: 0
  };
  try {
      await api(data.id ? 'PUT' : 'POST', data.id ? '/api/cms/faqs/' + data.id : '/api/cms/faqs', data);
     closeModal('modalFAQ');
     loadFAQs(data.period_label);
  } catch(ex) { uiAlert(ex); }
});

document.addEventListener('DOMContentLoaded', function() {
  loadFAQs('GLOBAL');
});
