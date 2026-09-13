import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Upload } from 'lucide-react'
import { usePeriod } from './AdminLayout'
import { apiPost } from '../lib/api'
import type { MassUploadConfig, MassUploadColumn } from '../lib/massUploadConfigs'

// Excel-like mass upload grid. Ported from static/admin-mass-upload.js.
// Posts { entity, items } to POST /api/cms/bulk-create (internal/cms/cms.go BulkCreate).

type Row = { _selected: boolean; _error: string } & Record<string, string | boolean>

interface BulkResult {
  total: number
  created: number
  failed: number
  results?: { row: number; status: string; error?: string }[]
}

interface Props {
  config: MassUploadConfig
  onClose: () => void
  /** Called after the server created at least one row (page should reload its list). */
  onSuccess: () => void
  /** Overrides the period injected as `period_label` (defaults to the admin's current period). */
  periodLabel?: string
  /** Fields merged into every submitted row that the grid itself has no column for. */
  extraFields?: (item: Record<string, unknown>) => Record<string, unknown>
}

type SelRange = { startRow: number; startCol: number; endRow: number; endCol: number }

const TRUE_WORDS = ['true', 'ya', 'yes', 'y', '1', 'publik', 'published']
const FALSE_WORDS = ['false', 'tidak', 'no', 'n', '0', '']

/** Normalise a free-text (pasted/imported) boolean. Returns null if unrecognised. */
function parseBool(v: unknown): boolean | null {
  if (v === true || v === false) return v
  const s = String(v ?? '').trim().toLowerCase()
  if (TRUE_WORDS.includes(s)) return true
  if (FALSE_WORDS.includes(s)) return false
  return null
}

function cellStr(v: unknown): string {
  if (v === true) return 'true'
  if (v === false) return 'false'
  return v == null ? '' : String(v)
}

function emptyRow(cols: MassUploadColumn[]): Row {
  const row: Row = { _selected: false, _error: '' }
  cols.forEach(c => { row[c.key] = c.default !== undefined ? c.default : '' })
  return row
}

function snapshot(rows: Row[]): Row[] {
  return JSON.parse(JSON.stringify(rows))
}

// Same quoting rules as the old parseCSVLine: "" inside quotes is a literal quote.
export function parseCSVLine(line: string, sep: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') { current += '"'; i++ }
      else if (c === '"') inQuotes = false
      else current += c
    } else {
      if (c === '"') inQuotes = true
      else if (c === sep) { result.push(current); current = '' }
      else current += c
    }
  }
  result.push(current)
  return result
}

function splitLines(text: string): string[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop()
  return lines
}

function matchHeader(cell: string, cols: MassUploadColumn[]): string | null {
  const n = cell.trim().toLowerCase()
  for (const c of cols) {
    if (n === c.label.toLowerCase() || n === c.key.toLowerCase()) return c.key
  }
  return null
}

function normRange(r: SelRange) {
  return {
    r1: Math.min(r.startRow, r.endRow), r2: Math.max(r.startRow, r.endRow),
    c1: Math.min(r.startCol, r.endCol), c2: Math.max(r.startCol, r.endCol),
  }
}

export default function MassUpload({ config, onClose, onSuccess, periodLabel, extraFields }: Props) {
  const { period } = usePeriod()
  const cols = config.columns
  const [rows, setRows] = useState<Row[]>(() => [emptyRow(cols), emptyRow(cols), emptyRow(cols)])
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [result, setResult] = useState<BulkResult | null>(null)
  const [selRange, setSelRange] = useState<SelRange | null>(null)
  const [dragging, setDragging] = useState(false)

  const rowsRef = useRef(rows)
  rowsRef.current = rows
  const history = useRef<Row[][]>([])
  const future = useRef<Row[][]>([])
  const selAnchor = useRef<{ row: number; col: number } | null>(null)
  const mouseDown = useRef<{ x: number; y: number; ri: number; ci: number } | null>(null)
  const selecting = useRef(false)
  const editStart = useRef<string | null>(null)

  // ── History ────────────────────────────────────────────────────────────
  const saveHistory = useCallback(() => {
    history.current.push(snapshot(rowsRef.current))
    future.current = []
  }, [])

  const undo = useCallback(() => {
    if (history.current.length === 0) return
    future.current.push(snapshot(rowsRef.current))
    setRows(history.current.pop()!)
    setSelRange(null); selAnchor.current = null
  }, [])

  const redo = useCallback(() => {
    if (future.current.length === 0) return
    history.current.push(snapshot(rowsRef.current))
    setRows(future.current.pop()!)
    setSelRange(null); selAnchor.current = null
  }, [])

  // ── Row management ─────────────────────────────────────────────────────
  function addRows(count: number) {
    saveHistory()
    setRows(r => [...r, ...Array.from({ length: count }, () => emptyRow(cols))])
  }
  function deleteSelected() {
    if (!rows.some(r => r._selected)) return
    saveHistory()
    setRows(r => r.filter(x => !x._selected))
  }
  function deleteRow(idx: number) {
    saveHistory()
    setRows(r => r.filter((_, i) => i !== idx))
  }
  function toggleRow(idx: number) {
    setRows(r => r.map((x, i) => i === idx ? { ...x, _selected: !x._selected } : x))
  }
  function toggleAll(checked: boolean) {
    setRows(r => r.map(x => ({ ...x, _selected: checked })))
  }
  function setCell(idx: number, key: string, value: string) {
    setRows(r => r.map((x, i) => i === idx ? { ...x, [key]: value, _error: '' } : x))
  }

  // ── Paste (Excel / Google Sheets, tab-separated) ───────────────────────
  function handlePaste(e: React.ClipboardEvent, startRow: number, startColKey: string) {
    const text = e.clipboardData.getData('text')
    if (!text) return
    // Single-cell paste falls through to the browser default
    if (text.indexOf('\t') === -1 && text.indexOf('\n') === -1) return
    e.preventDefault(); e.stopPropagation()
    // A snapshot was already pushed on focus of this input; keep just that one
    if (editStart.current === null) saveHistory()
    editStart.current = null

    let startColIdx = cols.findIndex(c => c.key === startColKey)
    if (startColIdx < 0) startColIdx = 0
    const lines = splitLines(text)

    // First row looks like headers -> map columns by header, then drop it
    let headerMap: Record<number, string> | null = null
    if (lines.length > 1) {
      const firstCells = lines[0].split('\t')
      const isHeader = firstCells.every((cell, ci) => {
        if (ci >= cols.length) return true
        const n = cell.trim().toLowerCase()
        return n === cols[ci].label.toLowerCase() || n === cols[ci].key.toLowerCase()
      })
      if (isHeader) {
        headerMap = {}
        firstCells.forEach((cell, ci) => { const k = matchHeader(cell, cols); if (k) headerMap![ci] = k })
        lines.shift()
      }
    }

    const next = snapshot(rowsRef.current)
    while (next.length < startRow + lines.length) next.push(emptyRow(cols))
    lines.forEach((line, i) => {
      const cells = line.split('\t')
      cells.forEach((val, ci) => {
        let colKey: string | undefined
        if (headerMap && headerMap[ci]) colKey = headerMap[ci]
        else if (startColIdx + ci < cols.length) colKey = cols[startColIdx + ci].key
        if (colKey) { next[startRow + i][colKey] = val.trim(); next[startRow + i]._error = '' }
      })
    })
    setRows(next)
  }

  // ── CSV import ─────────────────────────────────────────────────────────
  function importCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const text = String(ev.target?.result || '')
      const sep = text.indexOf('\t') >= 0 ? '\t' : ','
      const lines: (string | null)[] = splitLines(text)
      if (lines.length === 0) return
      saveHistory()

      const headers = parseCSVLine(lines[0] as string, sep)
      const headerMap: Record<number, string> = {}
      headers.forEach((h, ci) => { const k = matchHeader(h, cols); if (k) headerMap[ci] = k })

      // No header matched -> positional mapping, first line is data
      if (Object.keys(headerMap).length === 0) {
        cols.forEach((c, ci) => { headerMap[ci] = c.key })
        lines.unshift(null)
      }

      const added: Row[] = []
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i]) continue
        const cells = parseCSVLine(lines[i] as string, sep)
        const row = emptyRow(cols)
        cells.forEach((val, ci) => { if (headerMap[ci]) row[headerMap[ci]] = val.trim() })
        added.push(row)
      }
      setRows(r => [...r, ...added])
    }
    reader.readAsText(file)
  }

  // ── Validation & submit ────────────────────────────────────────────────
  function validate(list: Row[]): boolean {
    let valid = true
    list.forEach(row => {
      row._error = ''
      cols.forEach(col => {
        const val = cellStr(row[col.key]).trim()
        if (col.required && !val) {
          row._error = (row._error ? row._error + '; ' : '') + col.label + ' wajib diisi'
          valid = false
        } else if (col.type === 'boolean' && parseBool(val) === null) {
          row._error = (row._error ? row._error + '; ' : '') + col.label + ' harus Ya/Tidak'
          valid = false
        } else if (col.type === 'select' && val && col.options) {
          // Pasted values are matched case-insensitively and normalised to the option's spelling
          const match = col.options.find(o => o.toLowerCase() === val.toLowerCase())
          if (match !== undefined) row[col.key] = match
          else {
            row._error = (row._error ? row._error + '; ' : '') + col.label + ' harus salah satu dari: ' + col.options.filter(Boolean).join(', ')
            valid = false
          }
        }
      })
    })
    return valid
  }

  async function submit() {
    if (done) { onClose(); return }
    if (rows.length === 0) { alert('Tidak ada data untuk diupload.'); return }
    setSubmitted(true)

    // Drop completely empty rows
    const nonEmpty = snapshot(rows).filter(row => cols.some(c => cellStr(row[c.key]).trim() !== ''))
    if (nonEmpty.length === 0) { alert('Tidak ada data untuk diupload.'); return }

    if (!validate(nonEmpty)) {
      setRows(nonEmpty)
      alert('Ada data yang belum lengkap. Periksa kolom bertanda *.')
      return
    }
    setRows(nonEmpty)

    const pLabel = periodLabel !== undefined ? periodLabel : period
    const items = nonEmpty.map(row => {
      const item: Record<string, unknown> = {}
      cols.forEach(col => {
        const val = row[col.key]
        item[col.key] = col.type === 'boolean' ? parseBool(val) === true : cellStr(val)
      })
      if (config.hasPeriod && !item.period_label) item.period_label = pLabel || ''
      return extraFields ? { ...item, ...extraFields(item) } : item
    })

    setSubmitting(true)
    try {
      const data: BulkResult = await apiPost('/api/cms/bulk-create', { entity: config.entity, items })
      const results = data.results || []
      const marked = snapshot(nonEmpty)
      results.forEach(r => { if (r.status === 'error' && marked[r.row]) marked[r.row]._error = r.error || 'Gagal' })
      setResult(data)
      if (data.created > 0) onSuccess()
      if (data.failed === 0) {
        setRows(marked)
        setDone(true)
      } else {
        // Keep only the failed rows so "Upload Data" retries just those
        setRows(marked.filter((_, i) => results.some(r => r.row === i && r.status === 'error')))
      }
    } catch (e: any) {
      alert('Gagal mengupload: ' + (e?.message || e))
    }
    setSubmitting(false)
  }

  // ── Drag selection / copy ──────────────────────────────────────────────
  function isCellSelected(ri: number, ci: number) {
    if (!selRange) return false
    const n = normRange(selRange)
    return ri >= n.r1 && ri <= n.r2 && ci >= n.c1 && ci <= n.c2
  }

  function cellMouseDown(e: React.MouseEvent, ri: number, ci: number) {
    if (selRange && !e.shiftKey) { setSelRange(null); selAnchor.current = null }
    if (e.shiftKey && selAnchor.current) {
      setSelRange({ startRow: selAnchor.current.row, startCol: selAnchor.current.col, endRow: ri, endCol: ci })
      e.preventDefault()
    } else {
      mouseDown.current = { x: e.clientX, y: e.clientY, ri, ci }
    }
  }

  function cellMouseMove(e: React.MouseEvent, ri: number, ci: number) {
    const md = mouseDown.current
    if (!md || !(e.buttons & 1)) return
    const dx = e.clientX - md.x, dy = e.clientY - md.y
    if (!selecting.current && dx * dx + dy * dy < 25) return
    if (!selecting.current) {
      selecting.current = true
      setDragging(true)
      selAnchor.current = { row: md.ri, col: md.ci }
      const active = document.activeElement as HTMLElement | null
      if (active && active.tagName === 'INPUT') active.blur()
    }
    setSelRange({ startRow: selAnchor.current!.row, startCol: selAnchor.current!.col, endRow: ri, endCol: ci })
  }

  const copySelection = useCallback(() => {
    if (!selRange) return
    const n = normRange(selRange)
    const lines: string[] = []
    for (let ri = n.r1; ri <= n.r2 && ri < rowsRef.current.length; ri++) {
      const vals: string[] = []
      for (let ci = n.c1; ci <= n.c2 && ci < cols.length; ci++) vals.push(cellStr(rowsRef.current[ri][cols[ci].key]))
      lines.push(vals.join('\t'))
    }
    navigator.clipboard.writeText(lines.join('\n')).catch(() => {})
  }, [selRange, cols])

  useEffect(() => {
    const onUp = () => { mouseDown.current = null; selecting.current = false; setDragging(false) }
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey
      if (mod && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
      else if (mod && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo() }
      else if (mod && e.key === 'c' && selRange) {
        const active = document.activeElement
        if (!active || active.tagName !== 'INPUT') { e.preventDefault(); copySelection() }
      } else if (e.key === 'Escape' && !submitting) onClose()
    }
    document.addEventListener('mouseup', onUp)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mouseup', onUp); document.removeEventListener('keydown', onKey) }
  }, [undo, redo, copySelection, selRange, onClose, submitting])

  // ── Render ─────────────────────────────────────────────────────────────
  const selectedCount = rows.filter(r => r._selected).length
  const cellCls = 'w-full border-0 bg-transparent text-xs focus:outline-none'

  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && !submitting && onClose()}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
          <h3 className="text-lg font-bold text-slate-800">Mass Upload — {config.title || config.entity}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition"><X className="w-5 h-5" /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => addRows(1)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium transition">+ Tambah Baris</button>
            <button onClick={() => addRows(5)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium transition">+ 5 Baris</button>
            <button onClick={deleteSelected} className="bg-red-50 hover:bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-xs font-medium transition">Hapus Terpilih</button>
            <label className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer">
              <input type="file" accept=".csv,.tsv,.txt" className="hidden" onChange={importCSV} />
              Import CSV
            </label>
            <div className="border-l border-slate-200 h-6 mx-1" />
            <button onClick={undo} className="text-slate-500 hover:text-slate-700 px-2 py-1.5 text-xs" title="Undo (Ctrl+Z)">&#8617; Undo</button>
            <button onClick={redo} className="text-slate-500 hover:text-slate-700 px-2 py-1.5 text-xs" title="Redo (Ctrl+Y)">&#8618; Redo</button>
            <span className="ml-auto text-xs text-slate-400">{rows.length} baris{selectedCount > 0 ? ` (${selectedCount} dipilih)` : ''}</span>
          </div>

          <p className="text-xs text-slate-400">Tip: Paste data dari Excel/Google Sheets langsung ke tabel (Ctrl+V). Baris header kolom akan otomatis dipetakan.</p>

          <div className={`overflow-x-auto bg-white rounded-lg border border-slate-200 ${dragging ? 'select-none' : ''}`}>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs text-slate-500 uppercase tracking-wider">
                  <th className="px-2 py-2 w-8 text-center"><input type="checkbox" checked={rows.length > 0 && selectedCount === rows.length} onChange={e => toggleAll(e.target.checked)} className="rounded" title="Pilih semua" /></th>
                  {cols.map(col => (
                    <th key={col.key} className="px-3 py-2 min-w-[120px] whitespace-nowrap">{col.label}{col.required && <span className="text-red-400"> *</span>}</th>
                  ))}
                  <th className="px-2 py-2 w-10" />
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan={cols.length + 2} className="text-center text-slate-400 py-8 text-sm">Tidak ada data. Klik "Tambah Baris" atau paste dari Excel.</td></tr>
                )}
                {rows.map((row, ri) => {
                  const errCls = row._error ? ' bg-red-50' : ''
                  return [
                    <tr key={ri} className={`border-t border-slate-100 hover:bg-blue-50/30${errCls}`}>
                      <td className="px-2 py-1 text-center"><input type="checkbox" checked={row._selected} onChange={() => toggleRow(ri)} className="rounded" /></td>
                      {cols.map((col, ci) => {
                        const val = cellStr(row[col.key])
                        const selCls = isCellSelected(ri, ci) ? ' bg-blue-200' : errCls
                        const tdProps = {
                          onMouseDown: (e: React.MouseEvent) => cellMouseDown(e, ri, ci),
                          onMouseMove: (e: React.MouseEvent) => cellMouseMove(e, ri, ci),
                        }
                        if (col.type === 'boolean') {
                          const b = parseBool(val)
                          return (
                            <td key={col.key} className={`px-2 py-1 border-r border-slate-100${selCls}`} {...tdProps}>
                              <select value={b === true ? 'true' : val === '' ? '' : b === false ? 'false' : val} onChange={e => { saveHistory(); setCell(ri, col.key, e.target.value) }} className={`${cellCls} py-1`}>
                                <option value="">—</option>
                                <option value="true">Ya</option>
                                <option value="false">Tidak</option>
                                {b === null && val !== '' && <option value={val}>{val}</option>}
                              </select>
                            </td>
                          )
                        }
                        if (col.type === 'select') {
                          const opts = col.options || []
                          return (
                            <td key={col.key} className={`px-2 py-1 border-r border-slate-100${selCls}`} {...tdProps}>
                              <select value={val} onChange={e => { saveHistory(); setCell(ri, col.key, e.target.value) }} className={`${cellCls} py-1`}>
                                {!opts.includes(val) && <option value={val}>{val || '—'}</option>}
                                {opts.map(o => <option key={o} value={o}>{o || '—'}</option>)}
                              </select>
                            </td>
                          )
                        }
                        const borderErr = !val && col.required && submitted ? ' border border-red-300' : ''
                        return (
                          <td key={col.key} className={`px-1 py-0.5 border-r border-slate-100${selCls}`} {...tdProps}>
                            <input
                              type="text"
                              value={val}
                              onFocus={() => { editStart.current = val; history.current.push(snapshot(rowsRef.current)); future.current = [] }}
                              onBlur={() => { if (editStart.current !== null && editStart.current === cellStr(rowsRef.current[ri]?.[col.key])) history.current.pop(); editStart.current = null }}
                              onChange={e => setCell(ri, col.key, e.target.value)}
                              onPaste={e => handlePaste(e, ri, col.key)}
                              onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                              className={`${cellCls} px-1 py-1.5 focus:ring-1 focus:ring-blue-400 focus:rounded${borderErr}`}
                            />
                          </td>
                        )
                      })}
                      <td className="px-2 py-1 text-center"><button onClick={() => deleteRow(ri)} className="text-red-400 hover:text-red-600 text-xs" title="Hapus">&times;</button></td>
                    </tr>,
                    row._error ? (
                      <tr key={`${ri}-err`} className="bg-red-50"><td colSpan={cols.length + 2} className="px-3 py-1 text-xs text-red-600">{row._error}</td></tr>
                    ) : null,
                  ]
                })}
              </tbody>
            </table>
          </div>

          {result && (
            <div className={`border rounded-lg p-4 space-y-2 ${result.failed > 0 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-green-600">{result.created || 0} berhasil</span>
                {result.failed > 0 && <span className="text-lg font-bold text-red-600">{result.failed} gagal</span>}
                <span className="text-xs text-slate-400">dari {result.total || 0} baris</span>
              </div>
              {result.failed > 0 && (
                <div className="max-h-32 overflow-y-auto space-y-1 mt-2">
                  {(result.results || []).filter(r => r.status === 'error').map(r => (
                    <div key={r.row} className="text-xs text-red-600">Baris {r.row + 1}: {r.error || 'Gagal'}</div>
                  ))}
                  <div className="text-xs text-slate-500 pt-1">Baris yang berhasil sudah dihapus dari tabel; perbaiki baris yang gagal lalu upload lagi.</div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-5 pt-3 border-t border-slate-200 flex-shrink-0">
          <button onClick={onClose} disabled={submitting} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition">Batal</button>
          <button onClick={submit} disabled={submitting} className={`bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition ${submitting ? 'opacity-50' : ''}`}>
            {submitting ? 'Mengupload...' : done ? 'Selesai ✓' : 'Upload Data'}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Green "Mass Upload" button, placed next to "Tambah" in page headers. */
export function MassUploadButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition">
      <Upload className="w-4 h-4" /> Mass Upload
    </button>
  )
}
