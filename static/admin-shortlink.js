// ── Shortlink ───────────────────────────────────────────────────────────────
function shortlinkURL(code) {
  return `${window.location.origin}/l/${encodeURIComponent(code || '')}`;
}

async function loadShortlinks() {
  const tb = document.getElementById('shortlink-tbody');
  if (!tb) return;
  let rows = [];
  try {
    const resp = await api('GET', '/api/cms/shortlinks');
    rows = resp.items || resp || [];
  } catch (ex) {
    tb.innerHTML = `<tr><td colspan="5" class="p-6">${errHtml(toUiMessage(ex))}</td></tr>`;
    return;
  }
  if (!rows.length) {
    tb.innerHTML = '<tr><td colspan="5" class="p-6 text-center text-slate-400">Belum ada short link.</td></tr>';
    return;
  }
  tb.innerHTML = rows.map((row, si) => `
    <tr class="border-b border-slate-100 hover:bg-slate-50">
      <td class="p-4 align-middle text-slate-400 text-center w-10">${si + 1}</td>
      <td class="p-4 align-top font-medium text-slate-700">${escHtml(row.label || '-')}</td>
      <td class="p-4 align-top">
        <a href="${escHtml(shortlinkURL(row.code))}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline break-all">${escHtml(shortlinkURL(row.code))}</a>
      </td>
      <td class="p-4 align-top text-slate-600 break-all">${escHtml(row.target_url || '')}</td>
      <td class="p-4 align-top text-right whitespace-nowrap">
        <button onclick="copyShortlink('${(shortlinkURL(row.code)).replace(/'/g, "&#39;")}')" class="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1 rounded mr-1">Copy</button>
        <button onclick="deleteShortlink('${row.id || ''}')" class="text-xs bg-red-50 hover:bg-red-100 text-red-700 px-2 py-1 rounded">Hapus</button>
      </td>
    </tr>
  `).join('');
}

async function createShortlink(targetURL, label, code) {
  const body = {
    target_url: targetURL,
    label: label || '',
    code: code || ''
  };
  const created = await api('POST', '/api/cms/shortlinks', body);
  await loadShortlinks();
  return shortlinkURL(created.code || '');
}

async function copyShortlink(url) {
  try {
    await navigator.clipboard.writeText(url);
    uiAlert('Short link berhasil disalin.');
  } catch (_) {
    uiAlert('Gagal menyalin short link.');
  }
}

async function deleteShortlink(id) {
  if (!id) return;
  if (!await uiConfirm('Hapus short link ini?', 'Konfirmasi')) return;
  try {
    await api('DELETE', '/api/cms/shortlinks/' + id);
    await loadShortlinks();
  } catch (ex) {
    uiAlert(ex);
  }
}

async function clearShortlinks() {
  if (!await uiConfirm('Bersihkan seluruh riwayat short link?', 'Konfirmasi')) return;
  try {
    await api('DELETE', '/api/cms/shortlinks?all=1');
    await loadShortlinks();
  } catch (ex) {
    uiAlert(ex);
  }
}

document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('formShortlink')?.addEventListener('submit', async e => {
    e.preventDefault();
    const longURL = (document.getElementById('shortlink-long-url')?.value || '').trim();
    const code = (document.getElementById('shortlink-code')?.value || '').trim();
    const label = (document.getElementById('shortlink-label')?.value || '').trim();
    if (!longURL) {
      uiAlert('URL tujuan wajib diisi.');
      return;
    }
    try {
      const shortURL = await createShortlink(longURL, label, code);
      uiAlert('Short link berhasil dibuat:<br><a class="text-blue-600 underline break-all" href="' + escHtml(shortURL) + '" target="_blank" rel="noopener noreferrer">' + escHtml(shortURL) + '</a>', 'Sukses');
      document.getElementById('formShortlink').reset();
    } catch (ex) {
      uiAlert(ex);
    }
  });

  loadShortlinks();
});
