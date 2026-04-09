/**
 * admin-mass-upload.js — Reusable Excel-like mass upload component for PKSE UGM admin.
 * Usage: MassUpload.open(config)
 */
var MassUpload = (function () {
  var _config = null;
  var _rows = [];
  var _history = [];
  var _future = [];
  var _modal = null;
  var _submitted = false;

  // Selection state for drag-select
  var _selRange = null;
  var _selAnchor = null;
  var _selecting = false;
  var _mouseDownPos = null;

  // ── Public API ─────────────────────────────────────────────────────────────

  function open(config) {
    _config = config;
    _rows = [];
    _history = [];
    _future = [];
    _submitted = false;
    _selRange = null;
    _selAnchor = null;
    _selecting = false;
    _mouseDownPos = null;
    _ensureModal();
    // Reset
    var title = document.getElementById('mu-title');
    if (title) title.textContent = 'Mass Upload — ' + (config.title || config.entity);
    // Reset results
    var resultsPanel = document.getElementById('mu-results');
    if (resultsPanel) resultsPanel.classList.add('hidden');
    var submitBtn = document.getElementById('mu-submit-btn');
    if (submitBtn) { submitBtn.disabled = false; submitBtn.classList.remove('opacity-50'); }
    // Start with 3 empty rows
    for (var i = 0; i < 3; i++) _addRow();
    _renderTable();
    openModal('modalMassUpload');
  }

  function close() {
    closeModal('modalMassUpload');
  }

  // ── Modal Creation ─────────────────────────────────────────────────────────

  function _ensureModal() {
    if (document.getElementById('modalMassUpload')) return;
    var div = document.createElement('div');
    div.id = 'modalMassUpload';
    div.className = 'fixed inset-0 bg-black/50 hidden z-[70] flex items-center justify-center p-4';
    div.innerHTML = '<div class="bg-white rounded-2xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto my-4">'
      + '<div class="p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">'
      + '<h3 id="mu-title" class="text-lg font-bold text-slate-800">Mass Upload</h3>'
      + '<button onclick="MassUpload.close()" class="text-slate-400 hover:text-slate-600 transition"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button>'
      + '</div>'
      + '<div class="p-5 space-y-4">'
      // Toolbar
      + '<div class="flex flex-wrap items-center gap-2">'
      + '<button onclick="MassUpload._addRows(1)" class="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium transition">+ Tambah Baris</button>'
      + '<button onclick="MassUpload._addRows(5)" class="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium transition">+ 5 Baris</button>'
      + '<button onclick="MassUpload._deleteSelected()" class="bg-red-50 hover:bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-xs font-medium transition">Hapus Terpilih</button>'
      + '<label class="bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer"><input type="file" accept=".csv,.tsv,.txt" class="hidden" onchange="MassUpload._importCSV(event)">Import CSV</label>'
      + '<div class="border-l border-slate-200 h-6 mx-1"></div>'
      + '<button onclick="MassUpload._undo()" class="text-slate-500 hover:text-slate-700 px-2 py-1.5 text-xs" title="Undo (Ctrl+Z)">&#8617; Undo</button>'
      + '<button onclick="MassUpload._redo()" class="text-slate-500 hover:text-slate-700 px-2 py-1.5 text-xs" title="Redo (Ctrl+Y)">&#8618; Redo</button>'
      + '<span id="mu-row-count" class="ml-auto text-xs text-slate-400"></span>'
      + '</div>'
      // Tip
      + '<p class="text-xs text-slate-400">Tip: Paste data dari Excel/Google Sheets langsung ke tabel (Ctrl+V). Baris header kolom akan otomatis dipetakan.</p>'
      // Table
      + '<div class="overflow-x-auto bg-white rounded-lg border border-slate-200" id="mu-table-wrap">'
      + '<table class="w-full text-sm" id="mu-table">'
      + '<thead><tr id="mu-thead" class="bg-slate-50 text-left text-xs text-slate-500 uppercase tracking-wider"></tr></thead>'
      + '<tbody id="mu-tbody"></tbody>'
      + '</table></div>'
      // Results
      + '<div id="mu-results" class="hidden border border-slate-200 rounded-lg p-4 space-y-2"></div>'
      // Footer
      + '<div class="flex justify-end gap-3 pt-2">'
      + '<button onclick="MassUpload.close()" class="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition">Batal</button>'
      + '<button id="mu-submit-btn" onclick="MassUpload._submit()" class="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition">Upload Data</button>'
      + '</div>'
      + '</div></div>';
    document.body.appendChild(div);
    // Global paste listener
    document.addEventListener('paste', function (e) {
      if (!_config || !document.getElementById('modalMassUpload') || document.getElementById('modalMassUpload').classList.contains('hidden')) return;
      var active = document.activeElement;
      if (active && active.hasAttribute('data-mu-row')) {
        _handlePaste(e, active);
      }
    });
    // Global keyboard listener for undo/redo/copy
    document.addEventListener('keydown', function (e) {
      if (!_config || !document.getElementById('modalMassUpload') || document.getElementById('modalMassUpload').classList.contains('hidden')) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); _undo(); }
      else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); _redo(); }
      else if ((e.ctrlKey || e.metaKey) && e.key === 'c' && _selRange) {
        var active = document.activeElement;
        if (!active || active.tagName !== 'INPUT') { e.preventDefault(); _copySelection(); }
      }
    });
  }

  // ── Row Management ─────────────────────────────────────────────────────────

  function _addRow() {
    var row = { _selected: false, _error: '' };
    (_config.columns || []).forEach(function (col) {
      row[col.key] = col.default !== undefined ? col.default : '';
    });
    _rows.push(row);
  }

  function _addRows(count) {
    _saveHistory();
    for (var i = 0; i < count; i++) _addRow();
    _renderTable();
  }

  function _deleteSelected() {
    var sel = _rows.filter(function (r) { return r._selected; }).length;
    if (sel === 0) return;
    _saveHistory();
    _rows = _rows.filter(function (r) { return !r._selected; });
    _renderTable();
  }

  function _toggleRow(idx) {
    _rows[idx]._selected = !_rows[idx]._selected;
    _renderTable();
  }

  function _toggleAll(checked) {
    _rows.forEach(function (r) { r._selected = checked; });
    _renderTable();
  }

  function _deleteRow(idx) {
    _saveHistory();
    _rows.splice(idx, 1);
    _renderTable();
  }

  // ── History (Undo/Redo) ────────────────────────────────────────────────────

  function _snapshot() {
    return JSON.parse(JSON.stringify(_rows));
  }

  function _saveHistory() {
    _history.push(_snapshot());
    _future = [];
  }

  function _undo() {
    if (_history.length === 0) return;
    _future.push(_snapshot());
    _rows = _history.pop();
    _selRange = null; _selAnchor = null;
    _renderTable();
  }

  function _redo() {
    if (_future.length === 0) return;
    _history.push(_snapshot());
    _rows = _future.pop();
    _selRange = null; _selAnchor = null;
    _renderTable();
  }

  // ── Table Rendering ────────────────────────────────────────────────────────

  function _renderTable() {
    if (!_config) return;
    var cols = _config.columns || [];

    // Header
    var thead = document.getElementById('mu-thead');
    if (thead) {
      var hhtml = '<th class="px-2 py-2 w-8 text-center"><input type="checkbox" onchange="MassUpload._toggleAll(this.checked)" class="rounded" title="Pilih semua"></th>';
      cols.forEach(function (col) {
        var req = col.required ? ' <span class="text-red-400">*</span>' : '';
        hhtml += '<th class="px-3 py-2 min-w-[120px] whitespace-nowrap">' + escHtml(col.label) + req + '</th>';
      });
      hhtml += '<th class="px-2 py-2 w-10"></th>';
      thead.innerHTML = hhtml;
    }

    // Body
    var tbody = document.getElementById('mu-tbody');
    if (tbody) {
      if (_rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="' + (cols.length + 2) + '" class="text-center text-slate-400 py-8 text-sm">Tidak ada data. Klik "Tambah Baris" atau paste dari Excel.</td></tr>';
      } else {
        tbody.innerHTML = _rows.map(function (row, ri) {
          var errorClass = row._error ? ' bg-red-50' : '';
          var cells = cols.map(function (col, ci) {
            var val = row[col.key] || '';
            if (col.type === 'boolean') {
              return '<td class="px-2 py-1 border-r border-slate-100' + errorClass + '"><select data-mu-row="' + ri + '" data-mu-col="' + col.key + '" onchange="MassUpload._onCellChange(' + ri + ',\'' + col.key + '\',this.value)" class="w-full border-0 bg-transparent text-xs py-1 focus:ring-0"><option value=""' + (!val ? ' selected' : '') + '>—</option><option value="true"' + (val === 'true' || val === true ? ' selected' : '') + '>Ya</option><option value="false"' + (val === 'false' || val === false ? ' selected' : '') + '>Tidak</option></select></td>';
            }
            if (col.type === 'select') {
              var opts = (col.options || []).map(function (opt) {
                return '<option value="' + escHtml(opt) + '"' + (val === opt ? ' selected' : '') + '>' + escHtml(opt) + '</option>';
              }).join('');
              return '<td class="px-2 py-1 border-r border-slate-100' + errorClass + '"><select data-mu-row="' + ri + '" data-mu-col="' + col.key + '" onchange="MassUpload._onCellChange(' + ri + ',\'' + col.key + '\',this.value)" class="w-full border-0 bg-transparent text-xs py-1 focus:ring-0">' + opts + '</select></td>';
            }
            var borderErr = (!val && col.required && _submitted) ? ' border-red-300' : '';
            return '<td class="px-1 py-0.5 border-r border-slate-100' + errorClass + '" data-mu-row="' + ri + '" data-mu-col="' + col.key + '" onmousedown="MassUpload._cellMouseDown(event,this)" onmousemove="MassUpload._cellMouseMove(event,this)"><input type="text" value="' + escHtml(String(val)) + '" data-mu-row="' + ri + '" data-mu-col="' + col.key + '" onblur="MassUpload._onCellChange(' + ri + ',\'' + col.key + '\',this.value)" onkeydown="if(event.key===\'Enter\')this.blur()" class="w-full border-0 bg-transparent text-xs px-1 py-1.5 focus:ring-1 focus:ring-blue-400 focus:rounded' + borderErr + '"></td>';
          }).join('');
          return '<tr class="border-t border-slate-100 hover:bg-blue-50/30' + errorClass + '">'
            + '<td class="px-2 py-1 text-center"><input type="checkbox" ' + (row._selected ? 'checked' : '') + ' onchange="MassUpload._toggleRow(' + ri + ')" class="rounded"></td>'
            + cells
            + '<td class="px-2 py-1 text-center"><button onclick="MassUpload._deleteRow(' + ri + ')" class="text-red-400 hover:text-red-600 text-xs" title="Hapus">&times;</button></td>'
            + (row._error ? '</tr><tr class="bg-red-50"><td colspan="' + (cols.length + 2) + '" class="px-3 py-1 text-xs text-red-600">' + escHtml(row._error) + '</td>' : '')
            + '</tr>';
        }).join('');
      }
    }

    // Row count
    var countEl = document.getElementById('mu-row-count');
    if (countEl) {
      var sel = _rows.filter(function (r) { return r._selected; }).length;
      countEl.textContent = _rows.length + ' baris' + (sel > 0 ? ' (' + sel + ' dipilih)' : '');
    }

    // Re-apply selection highlighting after render
    _updateCellStyles();
  }

  function _onCellChange(rowIdx, colKey, value) {
    if (!_rows[rowIdx]) return;
    _saveHistory();
    _rows[rowIdx][colKey] = value;
    _rows[rowIdx]._error = '';
  }

  // ── Paste Handling ─────────────────────────────────────────────────────────

  function _handlePaste(e, targetCell) {
    var text = (e.clipboardData || window.clipboardData).getData('text');
    if (!text) return;

    // Only intercept if it contains tabs or newlines (multi-cell paste)
    if (text.indexOf('\t') === -1 && text.indexOf('\n') === -1) return;

    e.preventDefault();
    e.stopPropagation();
    _saveHistory();

    var startRow = parseInt(targetCell.getAttribute('data-mu-row')) || 0;
    var startColKey = targetCell.getAttribute('data-mu-col') || '';
    var cols = _config.columns || [];
    var startColIdx = cols.findIndex(function (c) { return c.key === startColKey; });
    if (startColIdx < 0) startColIdx = 0;

    var lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();

    // Check if first row looks like headers
    var headerMap = null;
    if (lines.length > 1) {
      var firstCells = lines[0].split('\t');
      var isHeader = firstCells.every(function (cell, ci) {
        if (ci >= cols.length) return true;
        var normalized = cell.trim().toLowerCase();
        return normalized === cols[ci].label.toLowerCase() || normalized === cols[ci].key.toLowerCase();
      });
      if (isHeader) {
        headerMap = {};
        firstCells.forEach(function (cell, ci) {
          var normalized = cell.trim().toLowerCase();
          for (var j = 0; j < cols.length; j++) {
            if (normalized === cols[j].label.toLowerCase() || normalized === cols[j].key.toLowerCase()) {
              headerMap[ci] = cols[j].key;
              break;
            }
          }
        });
        lines.shift();
      }
    }

    // Expand rows if needed
    while (_rows.length < startRow + lines.length) {
      var row = { _selected: false, _error: '' };
      cols.forEach(function (col) { row[col.key] = ''; });
      _rows.push(row);
    }

    // Fill data
    for (var i = 0; i < lines.length; i++) {
      var cells = lines[i].split('\t');
      for (var ci = 0; ci < cells.length; ci++) {
        var colKey;
        if (headerMap && headerMap[ci]) {
          colKey = headerMap[ci];
        } else {
          var targetCol = startColIdx + ci;
          if (targetCol < cols.length) colKey = cols[targetCol].key;
        }
        if (colKey) {
          _rows[startRow + i][colKey] = cells[ci].trim();
        }
      }
    }

    _renderTable();
  }

  // ── CSV Import ─────────────────────────────────────────────────────────────

  function _importCSV(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (ev) {
      var text = ev.target.result;
      _saveHistory();

      // Detect separator
      var sep = text.indexOf('\t') >= 0 ? '\t' : ',';
      var lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
      if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
      if (lines.length === 0) return;

      var cols = _config.columns || [];
      // Parse first row as headers
      var headers = parseCSVLine(lines[0], sep);
      var headerMap = {};
      headers.forEach(function (h, ci) {
        var normalized = h.trim().toLowerCase();
        for (var j = 0; j < cols.length; j++) {
          if (normalized === cols[j].label.toLowerCase() || normalized === cols[j].key.toLowerCase()) {
            headerMap[ci] = cols[j].key;
            break;
          }
        }
      });

      // If no headers matched, use positional mapping
      var anyMatched = Object.keys(headerMap).length > 0;
      if (!anyMatched) {
        cols.forEach(function (col, ci) { headerMap[ci] = col.key; });
        // Don't skip first row - treat it as data
        lines.unshift(null);
      }

      // Parse data rows
      for (var i = 1; i < lines.length; i++) {
        if (!lines[i]) continue;
        var cells = parseCSVLine(lines[i], sep);
        var row = { _selected: false, _error: '' };
        cols.forEach(function (col) { row[col.key] = ''; });
        cells.forEach(function (val, ci) {
          if (headerMap[ci]) row[headerMap[ci]] = val.trim();
        });
        _rows.push(row);
      }

      _renderTable();
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function parseCSVLine(line, sep) {
    var result = [];
    var current = '';
    var inQuotes = false;
    for (var i = 0; i < line.length; i++) {
      var c = line[i];
      if (inQuotes) {
        if (c === '"' && line[i + 1] === '"') { current += '"'; i++; }
        else if (c === '"') { inQuotes = false; }
        else { current += c; }
      } else {
        if (c === '"') { inQuotes = true; }
        else if (c === sep) { result.push(current); current = ''; }
        else { current += c; }
      }
    }
    result.push(current);
    return result;
  }

  // ── Validation & Submit ────────────────────────────────────────────────────

  function _validate() {
    var cols = _config.columns || [];
    var valid = true;
    _rows.forEach(function (row) {
      row._error = '';
      cols.forEach(function (col) {
        if (col.required) {
          var val = String(row[col.key] || '').trim();
          if (!val) {
            row._error = (row._error ? row._error + '; ' : '') + col.label + ' wajib diisi';
            valid = false;
          }
        }
      });
    });
    return valid;
  }

  function _submit() {
    if (_rows.length === 0) { uiAlert('Tidak ada data untuk diupload.'); return; }
    _submitted = true;

    // Filter out completely empty rows
    var cols = _config.columns || [];
    var nonEmpty = _rows.filter(function (row) {
      return cols.some(function (col) { return String(row[col.key] || '').trim() !== ''; });
    });

    if (nonEmpty.length === 0) { uiAlert('Tidak ada data untuk diupload.'); return; }

    // Validate
    _rows = nonEmpty;
    if (!_validate()) {
      _renderTable();
      uiAlert('Ada data yang belum lengkap. Periksa kolom bertanda <span class="text-red-500">*</span>.');
      return;
    }

    var submitBtn = document.getElementById('mu-submit-btn');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.classList.add('opacity-50'); submitBtn.textContent = 'Mengupload...'; }

    // Build items
    var items = _rows.map(function (row) {
      var item = {};
      cols.forEach(function (col) {
        var val = row[col.key];
        if (col.type === 'boolean') {
          val = val === 'true' || val === true;
        }
        item[col.key] = val;
      });
      return item;
    });

    api('POST', '/api/cms/bulk-create', {
      entity: _config.entity,
      items: items
    }).then(function (data) {
      var resultsEl = document.getElementById('mu-results');
      if (!resultsEl) return;

      // Mark errors on rows
      (data.results || []).forEach(function (r) {
        if (r.status === 'error' && _rows[r.row]) {
          _rows[r.row]._error = r.error || 'Gagal';
        }
      });

      var html = '<div class="flex items-center gap-3">'
        + '<span class="text-lg font-bold text-green-600">' + (data.created || 0) + ' berhasil</span>'
        + (data.failed > 0 ? '<span class="text-lg font-bold text-red-600">' + data.failed + ' gagal</span>' : '')
        + '<span class="text-xs text-slate-400">dari ' + (data.total || 0) + ' baris</span>'
        + '</div>';

      if (data.failed > 0) {
        html += '<div class="max-h-32 overflow-y-auto space-y-1 mt-2">';
        (data.results || []).forEach(function (r) {
          if (r.status === 'error') {
            html += '<div class="text-xs text-red-600">Baris ' + (r.row + 1) + ': ' + escHtml(r.error || 'Gagal') + '</div>';
          }
        });
        html += '</div>';
      }

      resultsEl.innerHTML = html;
      resultsEl.classList.remove('hidden');
      if (data.failed > 0) {
        resultsEl.classList.add('border-red-200', 'bg-red-50');
      } else {
        resultsEl.classList.add('border-green-200', 'bg-green-50');
      }

      _renderTable();

      if (submitBtn) {
        submitBtn.textContent = 'Upload Data';
        if (data.failed === 0) {
          submitBtn.textContent = 'Selesai ✓';
          if (_config.onSuccess) _config.onSuccess();
        } else {
          submitBtn.disabled = false;
          submitBtn.classList.remove('opacity-50');
        }
      }
    }).catch(function (err) {
      uiAlert('Gagal mengupload: ' + (err.message || err));
      if (submitBtn) { submitBtn.disabled = false; submitBtn.classList.remove('opacity-50'); submitBtn.textContent = 'Upload Data'; }
    });
  }

  // ── Drag Selection ──────────────────────────────────────────────────────────

  function _normRange(r) {
    var r1 = Math.min(r.startRow, r.endRow), r2 = Math.max(r.startRow, r.endRow);
    var c1 = Math.min(r.startCol, r.endCol), c2 = Math.max(r.startCol, r.endCol);
    return {r1:r1, c1:c1, r2:r2, c2:c2};
  }

  function _isCellSelected(ri, ci) {
    if (!_selRange) return false;
    var n = _normRange(_selRange);
    return ri >= n.r1 && ri <= n.r2 && ci >= n.c1 && ci <= n.c2;
  }

  function _setSelection(sr, sc, er, ec) {
    _selRange = {startRow:sr, startCol:sc, endRow:er, endCol:ec};
    _updateCellStyles();
  }

  function _clearSelection() {
    _selRange = null;
    _selAnchor = null;
    _updateCellStyles();
  }

  function _updateCellStyles() {
    var cells = document.querySelectorAll('#mu-tbody td[data-mu-row][data-mu-col]');
    cells.forEach(function(td) {
      var ri = parseInt(td.getAttribute('data-mu-row'));
      var colKey = td.getAttribute('data-mu-col');
      var cols = _config ? _config.columns || [] : [];
      var ci = -1;
      for (var i = 0; i < cols.length; i++) { if (cols[i].key === colKey) { ci = i; break; } }
      if (_isCellSelected(ri, ci)) td.classList.add('bg-blue-200');
      else td.classList.remove('bg-blue-200');
    });
  }

  function _cellMouseDown(e, cell) {
    if (!cell.hasAttribute('data-mu-row') || !cell.hasAttribute('data-mu-col')) return;
    // Clear previous selection unless shift-clicking
    if (_selRange && !e.shiftKey) { _selRange = null; _selAnchor = null; _updateCellStyles(); }
    var ri = parseInt(cell.getAttribute('data-mu-row'));
    var colKey = cell.getAttribute('data-mu-col');
    var cols = _config ? _config.columns || [] : [];
    var ci = -1;
    for (var i = 0; i < cols.length; i++) { if (cols[i].key === colKey) { ci = i; break; } }
    if (ci < 0) return;
    if (e.shiftKey && _selAnchor) {
      _setSelection(_selAnchor.row, _selAnchor.col, ri, ci);
      e.preventDefault();
    } else {
      _mouseDownPos = {x: e.clientX, y: e.clientY, ri: ri, ci: ci};
      // Focus the input inside the cell for single clicks
      var input = cell.querySelector('input');
      if (input) { input.focus(); input.select(); }
    }
  }

  function _cellMouseMove(e, cell) {
    if (!_mouseDownPos || !(e.buttons & 1)) return;
    var dx = e.clientX - _mouseDownPos.x, dy = e.clientY - _mouseDownPos.y;
    if (!_selecting && (dx*dx + dy*dy) < 25) return;
    if (!_selecting) {
      _selecting = true;
      _selAnchor = {row: _mouseDownPos.ri, col: _mouseDownPos.ci};
      document.addEventListener('mouseup', _cellMouseUpHandler);
      document.addEventListener('selectstart', _preventSelect);
    }
    if (!cell.hasAttribute('data-mu-row') || !cell.hasAttribute('data-mu-col')) return;
    var ri = parseInt(cell.getAttribute('data-mu-row'));
    var colKey = cell.getAttribute('data-mu-col');
    var cols = _config ? _config.columns || [] : [];
    var ci = -1;
    for (var i = 0; i < cols.length; i++) { if (cols[i].key === colKey) { ci = i; break; } }
    if (ci < 0) return;
    _setSelection(_selAnchor.row, _selAnchor.col, ri, ci);
  }

  function _cellMouseUpHandler() {
    _mouseDownPos = null;
    _selecting = false;
    _selAnchor = null;
    _updateCellStyles();
    document.removeEventListener('mouseup', _cellMouseUpHandler);
    document.removeEventListener('selectstart', _preventSelect);
  }

  function _preventSelect(e) { e.preventDefault(); }

  function _copySelection() {
    if (!_selRange) return;
    var n = _normRange(_selRange);
    var cols = _config ? _config.columns || [] : [];
    var lines = [];
    for (var ri = n.r1; ri <= n.r2; ri++) {
      if (ri >= _rows.length) break;
      var vals = [];
      for (var ci = n.c1; ci <= n.c2; ci++) {
        if (ci >= cols.length) break;
        vals.push(String(_rows[ri][cols[ci].key] || ''));
      }
      lines.push(vals.join('\t'));
    }
    navigator.clipboard.writeText(lines.join('\n')).catch(function(){});
  }

  // Public methods
  return {
    open: open,
    close: close,
    _addRows: _addRows,
    _deleteSelected: _deleteSelected,
    _deleteRow: _deleteRow,
    _toggleRow: _toggleRow,
    _toggleAll: _toggleAll,
    _undo: _undo,
    _redo: _redo,
    _onCellChange: _onCellChange,
    _importCSV: _importCSV,
    _submit: _submit,
    _cellMouseDown: _cellMouseDown,
    _cellMouseMove: _cellMouseMove
  };
})();
