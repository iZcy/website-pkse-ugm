import { useState, useEffect, useCallback, useRef } from 'react'
import { usePeriod } from '../components/AdminLayout'
import { apiGet, apiPost } from '../lib/api'
import { Send, TestTube, Loader2, ChevronRight } from 'lucide-react'

const PHONE_KEYS = ['phone','no_hp','no__hp','nomor_hp','nomor','no hp']

function renderTemplate(template: string, vars: Record<string,string>): string {
  let result = template
  // {{set var="value"}}
  const localVars: Record<string,string> = {}
  result = result.replace(/\{\{set\s+(\w+)\s*=\s*"([^"]*)"\}\}/g, (_, k, v) => { localVars[k] = v; return '' })
  // {{if cond}}...{{else}}...{{endif}}
  result = result.replace(/\{\{if\s+(\w+)\s*(==|!=|>=|<=|>|<|contains|!contains|startswith|!startswith|endswith|!endswith|matches|!matches|empty|notempty)\s*"?([^"}]*)"?\}\}([\s\S]*?)\{\{endif\}\}/g,
    (_, col, op, val, body) => {
      const v = (vars[col] || localVars[col] || '').trim()
      const cmp = val.trim()
      let match = false
      switch(op) {
        case '==': match = v === cmp; break
        case '!=': match = v !== cmp; break
        case 'contains': match = v.includes(cmp); break
        case '!contains': match = !v.includes(cmp); break
        case 'startswith': match = v.startsWith(cmp); break
        case 'endswith': match = v.endsWith(cmp); break
        case '>': case '>=': case '<': case '<=':
          const nv = parseFloat(v), nc = parseFloat(cmp)
          if (op === '>') match = nv > nc
          else if (op === '>=') match = nv >= nc
          else if (op === '<') match = nv < nc
          else match = nv <= nc
          break
        case 'empty': match = !v; break
        case 'notempty': match = !!v; break
      }
      const elseIdx = body.indexOf('{{else}}')
      return match ? (elseIdx > -1 ? body.substring(0, elseIdx) : body) : (elseIdx > -1 ? body.substring(elseIdx + 8) : '')
    })
  return result
    .replace(/\{\{(\w+)(?:\|(\w+)(?::"([^"]*)")?)?\}\}/g, (_, col, filter, arg) => {
      let v = localVars[col] || vars[col] || ''
      switch(filter) {
        case 'uppercase': v = v.toUpperCase(); break
        case 'lowercase': v = v.toLowerCase(); break
        case 'capitalize': v = v.charAt(0).toUpperCase() + v.slice(1); break
        case 'titlecase': v = v.replace(/\w\S*/g, w => w.charAt(0).toUpperCase()+w.slice(1).toLowerCase()); break
        case 'trim': v = v.trim(); break
        case 'length': v = String(v.length); break
        case 'default': v = v || arg || ''; break
        case 'slice': if (arg) { const [s,e] = arg.split(',').map(Number); v = v.slice(s,e) }; break
        case 'replace': if (arg) { const [f,r] = arg.split(','); v = v.split(f).join(r) }; break
        case 'repeat': v = v.repeat(Number(arg)||1); break
      }
      return v
    })
    .replace(/\{\{(\w+)\s*([+\-])\s*(\d+)\}\}/g, (_, col, op, n) => {
      const v = parseFloat(localVars[col] || vars[col] || '0') || 0
      return String(op === '+' ? v + Number(n) : v - Number(n))
    })
}

export default function BroadcastPage() {
  const { period } = usePeriod()
  const [step, setStep] = useState(1)
  const [columns, setColumns] = useState<string[]>(['full_name','department','phone'])
  const [colLabels, setColLabels] = useState<string[]>(['Nama','Dept','Telp'])
  const [rows, setRows] = useState<Record<string,string>[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [template, setTemplate] = useState('Halo {{full_name}},\n\n')
  const [delayMs, setDelayMs] = useState(3000)
  const [sending, setSending] = useState(false)
  const [sentCount, setSentCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [status, setStatus] = useState('')
  const [waConnected, setWaConnected] = useState(false)
  const [qrCode, setQrCode] = useState('')
  const [liveLog, setLiveLog] = useState<{phone:string;status:string;error?:string}[]>([])
  const [showHelp, setShowHelp] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [testPhone, setTestPhone] = useState('')
  const [undoStack, setUndoStack] = useState<Record<string,string>[][]>([])
  const [redoStack, setRedoStack] = useState<Record<string,string>[][]>([])
  const wsRef = useRef<WebSocket|null>(null)
  // const previewTimer = useRef<any>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const loadContacts = useCallback(async () => {
    try {
      const data = await apiGet(`/api/broadcast/anggota-contacts?period=${period}`)
      const contacts = data.contacts || data || []
      if (contacts.length > 0) {
        const keys = Object.keys(contacts[0]).filter(k => !['id','_id'].includes(k))
        if (keys.length > 0) { setColumns(keys); setColLabels(keys) }
        setRows(contacts.map((c:any) => ({...c, _selected: 'false'})))
      } else {
        setRows([{ full_name: '', department: '', phone: '', _selected: 'false' }])
      }
    } catch { setRows([{ full_name: '', department: '', phone: '', _selected: 'false' }]) }
    setLoading(false)
  }, [period])
  useEffect(() => { loadContacts() }, [loadContacts])

  useEffect(() => {
    apiGet('/api/broadcast/status').then(d => { if (d.connected) setWaConnected(true); else loadQR() }).catch(() => {})
    connectWS()
    return () => { wsRef.current?.close() }
  }, [])

  function connectWS() {
    wsRef.current?.close()
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${proto}//${location.host}/api/broadcast/ws`)
    ws.onmessage = e => {
      try { const d = JSON.parse(e.data); setLiveLog(prev => [...prev.slice(-50), d]); if (d.status === 'sent') setSentCount(s => s + 1) } catch {}
    }
    ws.onclose = () => setTimeout(connectWS, 3000)
    wsRef.current = ws
  }

  async function loadQR() {
    try {
      const r = await fetch('/api/broadcast/qr', { credentials: 'same-origin' })
      if (r.ok) { const blob = await r.blob(); setQrCode(URL.createObjectURL(blob)) }
    } catch {}
  }

  function pushUndo() {
    setUndoStack(prev => [...prev, JSON.parse(JSON.stringify(rows))])
    setRedoStack([])
  }
  function undo() { if (undoStack.length === 0) return; const prev = undoStack[undoStack.length - 1]; setRedoStack(r => [...r, JSON.parse(JSON.stringify(rows))]); setRows(prev); setUndoStack(s => s.slice(0, -1)) }
  function redo() { if (redoStack.length === 0) return; const next = redoStack[redoStack.length - 1]; pushUndo(); setRows(next); setRedoStack(s => s.slice(0, -1)) }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
      else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo() }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [undoStack, redoStack, rows])

  function toggleRow(idx: number) {
    const n = new Set(selected); n.has(idx) ? n.delete(idx) : n.add(idx); setSelected(n)
  }
  function toggleAll(checked: boolean) {
    if (checked) setSelected(new Set(rows.map((_, i) => i)))
    else setSelected(new Set())
  }

  function updateCell(ri: number, col: string, val: string) {
    pushUndo()
    setRows(prev => prev.map((r, i) => i === ri ? { ...r, [col]: val } : r))
  }
  function addColumn() {
    pushUndo()
    const name = prompt('Nama kolom:')
    if (!name) return
    setColumns([...columns, name])
    setColLabels([...colLabels, name])
  }
  function deleteColumn(ci: number) {
    if (!confirm(`Hapus kolom "${colLabels[ci]}"?`)) return
    pushUndo()
    setColumns(prev => prev.filter((_, i) => i !== ci))
    setColLabels(prev => prev.filter((_, i) => i !== ci))
  }
  function addRow() {
    pushUndo()
    const newRow: Record<string,string> = { _selected: 'false' }
    columns.forEach(c => { newRow[c] = '' })
    setRows([...rows, newRow])
  }
  function deleteRow(ri: number) {
    pushUndo()
    setRows(prev => prev.filter((_, i) => i !== ri))
    setSelected(prev => { const n = new Set(prev); n.delete(ri); return n })
  }

  function insertVar(name: string) {
    const ta = textareaRef.current
    if (!ta) return
    const s = ta.selectionStart, e = ta.selectionEnd
    const insert = `{{${name}}}`
    setTemplate(t => t.substring(0, s) + insert + t.substring(e))
    setTimeout(() => { ta.selectionStart = ta.selectionEnd = s + insert.length; ta.focus() }, 0)
  }

  function updatePreview() {
  }
  function loadHistory() {}
  function copyLLMContext() {
    const sample = rows[0] || {}
    const cols = columns.map((h, i) => `  - ${h} (label: "${colLabels[i] || h}") = ${sample[h] || '(kosong)'}`).join('\n')
    const ctx = `# Template Broadcast PKSE UGM\n\n## Data Columns\n${cols}\n\n## Template Rules\n` +
      `- Variable: {{col}}\n- Filters: |uppercase, |lowercase, |capitalize, |titlecase, |trim, |length, |default:"fallback", |slice:"0,6", |replace:"a,b", |repeat:N\n` +
      `- Math: {{col + N}}, {{col - N}}\n- Set: {{set var="value"}} then {{var}}\n` +
      `- Conditionals: {{if col == "x"}}...{{else}}...{{endif}}\n  Operators: == != > >= < <= contains startswith endswith matches empty notempty\n` +
      `## Task\nGenerate WhatsApp broadcast message template. Output only template.`
    navigator.clipboard.writeText(ctx).then(() => { setStatus('Context disalin!'); setTimeout(() => setStatus(''), 2000) })
  }

  async function sendTest() {
    const phone = testPhone.replace(/\D/g, '')
    if (!phone || phone.length < 8) return alert('Nomor HP tidak valid')
    if (!template.trim()) return alert('Template kosong')
    try {
      await apiPost('/api/broadcast/send', { message: template, phones: [phone], messages: [template], delay_ms: 0 })
      setStatus('Test terkirim!'); setTimeout(() => setStatus(''), 2000)
    } catch(e: any) { alert('Gagal: ' + e.message) }
  }

  async function sendBroadcast() {
    const selRows = rows.filter((_, i) => selected.has(i))
    if (selRows.length === 0) return alert('Pilih minimal 1 kontak')
    if (!template.trim()) return alert('Template kosong')
    if (!confirm(`Kirim ke ${selRows.length} kontak?`)) return

    const phoneKey = columns.find(c => PHONE_KEYS.includes(c))
    if (!phoneKey) return alert('Kolom nomor HP tidak ditemukan')

    setSending(true); setSentCount(0); setTotalCount(selRows.length); setLiveLog([])
    const phones: string[] = []; const messages: string[] = []
    selRows.forEach(row => {
      const ph = (row[phoneKey] || '').replace(/\D/g, '')
      if (ph.length >= 8) { phones.push(ph); const vars: Record<string,string> = {}; columns.forEach(c => { vars[c] = row[c] || '' }); messages.push(renderTemplate(template, vars)) }
    })
    try {
      await apiPost('/api/broadcast/send', { message: template, phones, messages, delay_ms: delayMs })
    } catch(e: any) { alert('Gagal: ' + e.message) }
    setSending(false)
  }

  if (loading) return <div className="text-slate-400 text-center py-8">Memuat...</div>

  return (
    <div className="flex flex-col h-full" onKeyDown={e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
      else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo() }
    }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-2xl font-bold text-slate-800">WhatsApp Broadcast</h2>
        <div className="flex items-center gap-4">
          <span className={`flex items-center gap-1.5 text-sm ${waConnected ? 'text-green-600' : 'text-red-500'}`}>
            <span className={`w-2.5 h-2.5 rounded-full ${waConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            {waConnected ? 'WhatsApp terhubung' : 'WhatsApp tidak terhubung'}
          </span>
          {!waConnected && <button onClick={loadQR} className="text-xs text-blue-600 hover:underline">QR</button>}
          <button onClick={() => { loadHistory() }} className="text-xs text-slate-500 hover:text-blue-600">Riwayat</button>
          {status && <span className="text-sm text-green-600">{status}</span>}
        </div>
      </div>

      {qrCode && !waConnected && (
        <div className="mb-3 bg-white rounded-xl border p-4 flex gap-4 items-center">
          <img src={qrCode} className="w-32 h-32 border rounded-lg" alt="" />
          <div className="text-sm text-slate-600">Scan QR Code di WhatsApp → Perangkat Tertaut</div>
        </div>
      )}

      {/* Step indicator */}
      <div className="flex gap-1 mb-3 text-sm">
        {['1. Pilih Kontak','2. Tulis Pesan','3. Test & Kirim'].map((l, i) => (
          <button key={i} onClick={() => setStep(i+1)} className={`px-4 py-1.5 rounded-t-lg ${step === i+1 ? 'bg-white text-blue-700 border-t border-l border-r border-slate-200 font-medium' : 'text-slate-500'}`}>{l}</button>
        ))}
      </div>

      {/* STEP 1: Contacts table */}
      {step === 1 && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex gap-2 mb-2 flex-wrap">
            <span className="text-xs text-slate-500 self-center">{rows.length} kontak ({selected.size} dipilih)</span>
            <div className="flex-1" />
            <button onClick={addRow} className="text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded">+ Baris</button>
            <button onClick={addColumn} className="text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded">+ Kolom</button>
            <button onClick={copyLLMContext} className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded hover:bg-purple-100">Copy AI Context</button>
          </div>
          <div className="bg-white rounded-xl border overflow-auto flex-1">
            <table className="w-full text-xs" id="bc-contacts-table">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="px-2 py-2 w-8"><input type="checkbox" checked={selected.size === rows.length && rows.length > 0} onChange={e => toggleAll(e.target.checked)} /></th>
                  {columns.map((c, ci) => (
                    <th key={c} className="px-2 py-2 text-left font-medium text-slate-600 min-w-[100px] group whitespace-nowrap">
                      {colLabels[ci] || c}
                      <button onClick={() => deleteColumn(ci)} className="ml-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 text-xs">&times;</button>
                    </th>
                  ))}
                  <th className="px-2 py-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={ri} className={`border-t border-slate-100 ${selected.has(ri) ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}>
                    <td className="px-2 py-1 text-center"><input type="checkbox" checked={selected.has(ri)} onChange={() => toggleRow(ri)} /></td>
                    {columns.map(col => (
                      <td key={col} className="px-2 py-1 border-r border-slate-50 last:border-r-0"
                        contentEditable suppressContentEditableWarning
                        onBlur={e => updateCell(ri, col, e.currentTarget.textContent || '')}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLElement).blur() } }}
                      >{row[col] || ''}</td>
                    ))}
                    <td className="px-2 py-1 text-center"><button onClick={() => deleteRow(ri)} className="text-red-400 hover:text-red-600 text-xs">&times;</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end mt-3">
            <button onClick={() => setStep(2)} disabled={selected.size === 0} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50 flex items-center gap-1">
              Lanjut <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Compose */}
      {step === 2 && (
        <div className="flex gap-4 flex-1 min-h-0">
          <div className="flex-1 flex flex-col">
            <div className="flex gap-2 mb-2 flex-wrap" id="bc-var-chips">
              {columns.map((c, i) => (
                <button key={c} onClick={() => insertVar(c)} className="bc-var-chip text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full hover:bg-blue-100 border border-blue-200">
                  {`{{${c}}}`} <span className="text-blue-400 font-normal">{colLabels[i] || c}</span>
                </button>
              ))}
            </div>
            <textarea ref={textareaRef} value={template} onChange={e => { setTemplate(e.target.value); updatePreview() }}
              className="w-full border rounded-lg px-3 py-2 text-sm flex-1 min-h-[200px] resize-none font-sans" id="bc-template" />
            <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
              <span>{template.length} karakter</span>
              <select value={delayMs} onChange={e => setDelayMs(parseInt(e.target.value))} className="border rounded px-2 py-1">
                <option value={1000}>1 detik</option><option value={3000}>3 detik</option><option value={5000}>5 detik</option><option value={10000}>10 detik</option>
              </select>
              <span>delay antar pesan</span>
            </div>
          </div>
          <div className="w-72 flex-shrink-0 space-y-2">
            <button onClick={() => setShowHelp(true)} className="text-xs text-slate-500 hover:text-blue-600 w-full text-left">📖 Bantuan Template</button>
            {showHelp && <HelpModal rows={rows} columns={columns} colLabels={colLabels} onClose={() => setShowHelp(false)} template={template} renderTemplate={renderTemplate} />}
          </div>
          <div className="flex justify-between mt-3 absolute bottom-4 left-4 right-4" style={{display:'none'}}>
            <button onClick={() => setStep(1)} className="px-4 py-2 border rounded-lg text-sm">← Kembali</button>
            <button onClick={() => setStep(3)} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm">Review →</button>
          </div>
        </div>
      )}

      {/* STEP 3: Test & Send */}
      {step === 3 && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border p-4">
            <h3 className="text-sm font-bold text-slate-600 mb-2">Test Kirim</h3>
            <div className="space-y-2">
              <input value={testPhone} onChange={e => setTestPhone(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="08xxx (nomor manual)" />
              <button onClick={sendTest} className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm flex items-center gap-1">
                <TestTube className="w-4 h-4" />Test Kirim
              </button>
            </div>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <h3 className="text-sm font-bold text-slate-600 mb-2">Kirim Broadcast</h3>
            <p className="text-xs text-slate-500 mb-3">{selected.size} kontak terpilih · delay {delayMs/1000}s</p>
            <button onClick={sendBroadcast} disabled={sending} className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm flex items-center gap-2">
              {sending ? <><Loader2 className="w-4 h-4 animate-spin" />{sentCount}/{totalCount}</> : <><Send className="w-4 h-4" />Kirim Broadcast</>}
            </button>
          </div>
          {liveLog.length > 0 && (
            <div className="col-span-2 bg-white rounded-xl border p-3 max-h-40 overflow-y-auto">
              <h4 className="text-xs font-bold text-slate-500 mb-1">Live Log</h4>
              {liveLog.map((e, i) => (
                <div key={i} className={`text-xs py-0.5 ${e.status === 'sent' ? 'text-green-600' : 'text-red-500'}`}>
                  {e.status === 'sent' ? '✓' : '✗'} {e.phone} {e.error ? `— ${e.error}` : ''}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setShowHistory(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6">
            <h3 className="text-lg font-bold mb-4">Riwayat Broadcast</h3>
            {history.length === 0 && <div className="text-slate-400 text-center py-8">Belum ada broadcast</div>}
            {[].map((h: any, i: number) => <div key={i} className="border-b py-2 text-sm">{h.date || h.created_at} — {h.message?.substring(0, 80)}...</div>)}
            <button onClick={() => setShowHistory(false)} className="mt-4 px-4 py-2 border rounded-lg text-sm">Tutup</button>
          </div>
        </div>
      )}
    </div>
  )
}

function HelpModal({ rows, columns, colLabels, onClose, template, renderTemplate }: any) {
  const sample = rows[0] || {}
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-y-auto p-6">
        <div className="flex justify-between mb-4">
          <h3 className="text-lg font-bold">Bantuan Template</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <div className="flex gap-6">
          <div className="flex-1 space-y-3 text-xs">
            <div>
              <h4 className="font-bold text-slate-700 mb-1">Variabel — {'{{var}}'}</h4>
              <div className="bg-slate-50 border rounded p-2 font-mono text-[11px] space-y-0.5">
                {columns.map((c: string, i: number) => (
                  <p key={c}><span className="text-blue-600">{`{{${c}}}`}</span> <span className="text-slate-400">— {colLabels[i] || c} = {sample[c] || '(kosong)'}</span></p>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-bold text-slate-700 mb-1">Filter — {'{{var|filter}}'}</h4>
              <div className="bg-slate-50 border rounded p-2 font-mono text-[11px] space-y-0.5">
                <p><span className="text-purple-600">{'{{var|uppercase}}'}</span> <span className="text-slate-400">kapital semua</span></p>
                <p><span className="text-purple-600">{'{{var|lowercase}}'}</span> <span className="text-slate-400">kecil semua</span></p>
                <p><span className="text-purple-600">{'{{var|capitalize}}'}</span> <span className="text-slate-400">kapital pertama</span></p>
                <p><span className="text-purple-600">{'{{var|titlecase}}'}</span> <span className="text-slate-400">Title Case</span></p>
                <p><span className="text-purple-600">{'{{var|trim}}'}</span> <span className="text-slate-400">hapus spasi</span></p>
                <p><span className="text-purple-600">{'{{var|default:"fb"}}'}</span> <span className="text-slate-400">fallback</span></p>
                <p><span className="text-purple-600">{'{{var|slice:"0,6"}}'}</span> <span className="text-slate-400">potong</span></p>
                <p><span className="text-purple-600">{'{{var|replace:"a,b"}}'}</span> <span className="text-slate-400">ganti</span></p>
                <p><span className="text-purple-600">{'{{var|repeat:3}}'}</span> <span className="text-slate-400">ulang</span></p>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-slate-700 mb-1">Kondisional — {'{{if}}...{{endif}}'}</h4>
              <div className="bg-slate-50 border rounded p-2 font-mono text-[11px]">
                <p><span className="text-amber-600">{'{{if angkatan == "2022"}}'}</span></p>
                <p className="ml-4">Freshman!</p>
                <p><span className="text-amber-600">{'{{else}}'}</span></p>
                <p className="ml-4">Senior!</p>
                <p><span className="text-amber-600">{'{{endif}}'}</span></p>
              </div>
            </div>
          </div>
          <div className="flex-1 space-y-3 text-xs">
            <h4 className="font-bold text-slate-700">Live Preview (kontak pertama)</h4>
            <div className="bg-slate-800 text-green-300 rounded-lg p-3 font-mono text-[11px] whitespace-pre-wrap min-h-[100px]">
              {(() => {
                const vars: Record<string,string> = {}; columns.forEach((c: string) => { vars[c] = sample[c] || '' })
                return renderTemplate(template || 'Halo {{full_name}},\n\n', vars) || '(kosong)'
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
