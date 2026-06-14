import { useState, useEffect, useCallback, useRef } from 'react'
import { usePeriod } from '../components/AdminLayout'
import { apiGet, apiPost } from '../lib/api'
import { Wifi, WifiOff, RefreshCw, Copy, Send, Plus, TestTube, Loader2, ChevronLeft, ChevronRight, CheckCircle, Clock, Upload, X } from 'lucide-react'

const PHONE_KEYS = ['phone','no_hp','no__hp','nomor_hp','nomor','no hp']
const FACETS = ['uppercase','lowercase','capitalize','titlecase','trim','length','default:"..."','slice:"start,end"','replace:"find,replace"','repeat:N']
const DEFAULT_COLS = ['full_name','phone','department','position','program_studi','angkatan']
const DEFAULT_LABELS = ['Nama','No. HP','Kementerian','Jabatan','Program Studi','Angkatan']

const qrInterval = { id: 0 as any }

export default function BroadcastPage() {
  const { period } = usePeriod()
  const [tab, setTab] = useState<'connection'|'broadcast'|'log'>('broadcast')
  const [step, setStep] = useState(1)
  const [waConnected, setWaConnected] = useState(false)
  const [qrCode, setQrCode] = useState('')
  const [rows, setRows] = useState<Record<string,string>[]>([])
  const [cols, setCols] = useState<string[]>([])
  const [colLabels, setColLabels] = useState<string[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [message, setMessage] = useState('')
  const [delay, setDelay] = useState(3000)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(0)
  const [totalSend, setTotalSend] = useState(0)
  const [liveLog, setLiveLog] = useState<{phone:string,status:string,error?:string}[]>([])
  const [testPhone, setTestPhone] = useState('')
  const [testContact, setTestContact] = useState('')
  const [history, setHistory] = useState<any[]>([])
  const [historyDetail, setHistoryDetail] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [contactFilter, setContactFilter] = useState('')
  const [preview, setPreview] = useState('')
  const wsRef = useRef<WebSocket|null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const csvRef = useRef<HTMLInputElement>(null)

  const findPhoneKey = useCallback(() => {
    for(const k of PHONE_KEYS) if(cols.includes(k)) return k
    return cols[0] || ''
  }, [cols])

  const renderTemplate = useCallback((tmpl:string,vars:Record<string,string>):string => {
    let r = tmpl; const lv: Record<string,string> = {}
    r = r.replace(/\{\{set\s+(\w+)\s*=\s*"([^"]*)"\}\}/g, (_,k,v) => { lv[k] = v; return '' })
    r = r.replace(/\{\{if\s+(\w+)\s*(==|!=|>=|<=|>|<|contains|!contains|startswith|!startswith|endswith|!endswith|matches|!matches|empty|notempty)\s*"?([^"}]*)"?\}\}([\s\S]*?)\{\{endif\}\}/g, (_,col,op,val,body) => {
      const v = String(vars[col] || lv[col] || '').trim(); const cmp = String(val).trim(); let m = false
      switch(op){
        case '==': m = v === cmp; break; case '!=': m = v !== cmp; break
        case 'contains': m = v.includes(cmp); break; case '!contains': m = !v.includes(cmp); break
        case 'startswith': m = v.startsWith(cmp); break; case 'endswith': m = v.endsWith(cmp); break
        case '>': case '>=': case '<': case '<=': {
          const nv = parseFloat(v), nc = parseFloat(cmp)
          if(op === '>') m = nv > nc; else if(op === '>=') m = nv >= nc; else if(op === '<') m = nv < nc; else m = nv <= nc; break
        }
        case 'empty': m = !v; break; case 'notempty': m = !!v; break
      }
      const ei = body.indexOf('{{else}}')
      return m ? (ei > -1 ? body.slice(0, ei) : body) : (ei > -1 ? body.slice(ei + 8) : '')
    })
    return r.replace(/\{\{(\w+)(?:\|(\w+)(?::"([^"]*)")?)?\}\}/g, (_,col,f,arg) => {
      let v = String(lv[col] || vars[col] || '')
      switch(f){
        case 'uppercase': v = v.toUpperCase(); break; case 'lowercase': v = v.toLowerCase(); break
        case 'capitalize': v = v.charAt(0).toUpperCase() + v.slice(1); break
        case 'titlecase': v = v.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()); break
        case 'trim': v = v.trim(); break; case 'length': v = String(v.length); break
        case 'default': v = v || arg || ''; break
        case 'slice': if(arg){ const [s,e] = arg.split(',').map(Number); v = v.slice(s, e) }; break
        case 'replace': if(arg){ const [f,r] = arg.split(','); v = v.split(f).join(r) }; break
        case 'repeat': v = v.repeat(Number(arg) || 1); break
      }
      return v
    }).replace(/\{\{(\w+)\s*([+\-])\s*(\d+)\}\}/g, (_,col,op,n) => {
      const v = parseFloat(String(lv[col] || vars[col] || '0')) || 0
      return String(op === '+' ? v + Number(n) : v - Number(n))
    })
  }, [])

  const loadQR = useCallback(async () => {
    try {
      const r = await fetch('/api/broadcast/qr', { credentials: 'same-origin' })
      if(r.ok) { const b = await r.blob(); setQrCode(URL.createObjectURL(b)) }
    } catch {}
  }, [])

  const load = useCallback(async () => {
    try {
      const filter = contactFilter === 'ALL' ? '' : contactFilter
      const q = filter ? `?period=${encodeURIComponent(filter)}` : (period ? `?period=${encodeURIComponent(period)}` : '')
      const [status, contacts] = await Promise.all([
        apiGet('/api/broadcast/status').catch(() => ({ connected: false })),
        apiGet(`/api/broadcast/anggota-contacts${q}`).catch(() => ({ contacts: [] })),
      ])
      setWaConnected(status.connected || false)
      if(!status.connected) { loadQR() }
      else { setQrCode('') }
      const list = contacts.contacts || contacts || []
      if(Array.isArray(list) && list.length > 0) {
        const first: any = list[0]
        const ks = ['full_name','nickname','phone','department','position','program_studi','fakultas','angkatan']
          .filter(k => first && (k in first || first[k] !== undefined))
        setCols(ks.length ? ks : DEFAULT_COLS)
        setColLabels(ks.length ? ks : DEFAULT_LABELS)
        setRows(list.map((c: any) => {
          const row: Record<string,string> = {}
          ;(ks.length ? ks : DEFAULT_COLS).forEach(k => { row[k] = String(c[k] || '') })
          return row
        }))
      } else { setRows([]) }
    } catch {}
    setLoading(false)
  }, [period, contactFilter, loadQR])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if(waConnected && qrInterval.id) { clearInterval(qrInterval.id); qrInterval.id = 0 }
    else if(!waConnected) { qrInterval.id = setInterval(loadQR, 15000) }
    return () => { if(qrInterval.id) clearInterval(qrInterval.id) }
  }, [waConnected, loadQR])

  useEffect(() => {
    let reconnectTimer: any
    function connect() {
      const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/broadcast/ws`)
      ws.onmessage = e => {
        try { const d = JSON.parse(e.data); setLiveLog(p => [...p.slice(-50), d]); if(d.status === 'sent') setSent(s => s + 1) } catch {}
      }
      ws.onclose = () => { reconnectTimer = setTimeout(connect, 5000) }
      ws.onerror = () => { ws.close() }
      wsRef.current = ws
    }
    connect()
    return () => { clearTimeout(reconnectTimer); wsRef.current?.close() }
  }, [])

  useEffect(() => { updatePreview() }, [message, selected, rows])

  function updatePreview() {
    if(!message) { setPreview(''); return }
    const sel = rows.filter((_,i) => selected.has(i))
    if(!sel.length) { setPreview(''); return }
    const vars = cols.reduce((a,c) => ({ ...a, [c]: String(sel[0][c] || '') }), {} as Record<string,string>)
    setPreview(renderTemplate(message, vars))
  }

  async function disconnectWA() {
    if(!confirm('Putuskan koneksi WhatsApp?')) return
    try { await apiPost('/api/broadcast/disconnect', {}); setWaConnected(false); setQrCode(''); loadQR() }
    catch(e: any) { alert('Gagal: ' + e.message) }
  }

  function toggleRow(i: number) { const n = new Set(selected); n.has(i) ? n.delete(i) : n.add(i); setSelected(n) }
  function toggleAll() { selected.size >= rows.length ? setSelected(new Set()) : setSelected(new Set(rows.map((_,i) => i))) }
  function updateCell(ri: number, col: string, val: string) { const u = [...rows]; u[ri] = { ...u[ri], [col]: val }; setRows(u) }
  function addRow() { setRows([...rows, cols.reduce((a,c) => ({ ...a, [c]: '' }), {} as Record<string,string>)]) }
  function deleteRow(ri: number) { setRows(rows.filter((_,i) => i !== ri)) }
  function addCol() { const n = prompt('Nama kolom:'); if(!n) return; setCols([...cols, n]); setColLabels([...colLabels, n]) }
  function deleteCol(ci: number) { if(!confirm(`Hapus "${colLabels[ci]}"?`)) return; setCols(cols.filter((_,i) => i !== ci)); setColLabels(colLabels.filter((_,i) => i !== ci)) }
  function renameCol(ci: number) { const n = prompt('Nama kolom baru:', colLabels[ci]); if(n && n.trim()) { const l = [...colLabels]; l[ci] = n.trim(); setColLabels(l) } }

  function importCSV() {
    const input = csvRef.current || document.createElement('input')
    input.type = 'file'; input.accept = '.csv'
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0]; if(!file) return
      const text = await file.text()
      const lines = text.split('\n').filter((l: string) => l.trim())
      if(lines.length < 2) { alert('CSV kosong'); return }
      const headers = lines[0].split(',').map((h: string) => h.trim().toLowerCase())
      const allCols = new Set(cols)
      headers.forEach((h: string) => allCols.add(h))
      const newCols = Array.from(allCols)
      setCols(newCols)
      setColLabels(newCols)
      const newRows = [...rows]
      for(let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(',').map((v: string) => v.trim())
        const row: Record<string,string> = {}
        headers.forEach((h: string, idx: number) => { row[h] = vals[idx] || '' })
        newRows.push(row)
      }
      setRows(newRows)
    }
    input.click()
  }

  function insertVar(v: string) {
    const el = textareaRef.current; if(!el) return
    const s = el.selectionStart
    el.value = el.value.slice(0, s) + `{{${v}}}` + el.value.slice(el.selectionEnd)
    el.focus(); el.selectionStart = el.selectionEnd = s + v.length + 4
    setMessage(el.value)
  }

  function insertFilter(f: string) {
    const el = textareaRef.current; if(!el) return
    const s = el.selectionStart
    el.value = el.value.slice(0, s) + `|${f}` + el.value.slice(el.selectionEnd)
    el.focus(); setMessage(el.value)
  }

  function copyLLM() {
    const s = rows[0] || {}
    const c = cols.map((h,i) => `  - ${h} (label: "${colLabels[i]||h}") = ${s[h]||'(kosong)'}`).join('\n')
    const ctx = `# Template Broadcast PKSE UGM\n\n## Data Columns (first contact)\n${c}\n\n## Template Rules\n- Variable: {{column_name}}\n- Filters: {{col|uppercase}}, {{col|lowercase}}, {{col|capitalize}}, {{col|titlecase}}, {{col|trim}}, {{col|length}}, {{col|default:"fallback"}}, {{col|slice:"start,end"}}, {{col|replace:"find,replace"}}, {{col|repeat:N}}\n- Math: {{col + N}}, {{col - N}}\n- Set: {{set var="value"}} then {{var}}\n- If: {{if col == "val"}}...{{else}}...{{endif}}\n\n## Task\nGenerate WhatsApp broadcast message using the syntax above. Only output template text.`
    navigator.clipboard.writeText(ctx).then(() => alert('Context disalin!'))
  }

  async function sendTest() {
    if(!message) return alert('Pesan kosong')
    const p = testContact ? rows[parseInt(testContact)]?.[findPhoneKey()]?.replace(/\D/g, '') : testPhone.replace(/\D/g, '')
    if(!p || p.length < 8) return alert('Nomor tidak valid')
    const v = testContact ? rows[parseInt(testContact)] : {}
    const m = renderTemplate(message, cols.reduce((a,c) => ({ ...a, [c]: String(v[c] || '') }), {} as Record<string,string>))
    await apiPost('/api/broadcast/send', { message: m, phones: [p], messages: [m], delay_ms: 0 })
    alert(`Test terkirim ke ${p}`)
  }

  async function sendBroadcast() {
    const sel = rows.filter((_,i) => selected.has(i)); if(!sel.length) return alert('Pilih kontak')
    if(!message) return alert('Pesan kosong')
    if(!confirm(`Kirim ke ${sel.length} kontak?`)) return
    setSending(true); setTotalSend(sel.length); setSent(0); setLiveLog([])
    const pk = findPhoneKey()
    try {
      await apiPost('/api/broadcast/send', {
        message,
        phones: sel.map(r => String(r[pk] || '').replace(/\D/g, '')).filter(p => p.length >= 8),
        messages: sel.map(r => renderTemplate(message, cols.reduce((a,c) => ({ ...a, [c]: String(r[c] || '') }), {} as Record<string,string>))),
        delay_ms: delay, period_label: period
      })
      setStep(4)
    } catch(e: any) { alert('Gagal: ' + e.message) }
    setSending(false)
  }

  async function loadHistory() { try { const d = await apiGet('/api/broadcast/logs'); setHistory(d || []) } catch {} }
  async function loadHistoryDetail(id: string) { try { const d = await apiGet(`/api/broadcast/logs/${id}`); setHistoryDetail(d) } catch(e: any) { alert('Gagal: ' + e.message) } }

  if(loading) return <div className="text-slate-400 text-center py-8">Memuat...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-slate-800">WhatsApp Broadcast</h2>
        <div className="flex items-center gap-3">
          <span className={`flex items-center gap-1.5 text-sm ${waConnected ? 'text-green-600' : 'text-red-500'}`}>
            {waConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            {waConnected ? 'Terhubung' : 'Tidak terhubung'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 bg-slate-200 p-1 rounded-xl w-fit mb-4">
        {[{k:'connection',l:'Koneksi'},{k:'broadcast',l:'Broadcast'},{k:'log',l:'Log'}].map(t => (
          <button key={t.k} onClick={() => { setTab(t.k as any); if(t.k === 'log') loadHistory() }} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${tab === t.k ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{t.l}</button>
        ))}
      </div>

      {tab === 'connection' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className={`w-3.5 h-3.5 rounded-full ${waConnected ? 'bg-green-500' : 'bg-slate-300'}`} />
            <span className="text-sm text-slate-600 font-medium">{waConnected ? 'WhatsApp terhubung' : 'WhatsApp tidak terhubung'}</span>
            <button onClick={load} className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg border ml-2">Refresh</button>
            {waConnected && <button onClick={disconnectWA} className="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg border border-red-200 ml-auto">Disconnect</button>}
          </div>
          {!waConnected && qrCode && (
            <div className="border border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center bg-slate-50">
              <p className="text-sm text-slate-600 mb-3 font-medium">Scan QR code dengan WhatsApp</p>
              <img src={qrCode} className="w-56 h-56 border-2 border-white shadow-lg rounded-xl bg-white p-2" alt="QR" />
              <p className="text-xs text-slate-400 mt-3">Buka WhatsApp &gt; Perangkat tertaut &gt; Tautkan perangkat</p>
              <button onClick={loadQR} className="mt-3 text-xs bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg font-medium flex items-center gap-1"><RefreshCw className="w-3 h-3" />Refresh QR</button>
            </div>
          )}
        </div>
      )}

      {tab === 'broadcast' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 relative">
          {sending && <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-30 rounded-xl flex items-center justify-center"><div className="text-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" /><p className="text-sm text-slate-600">Mengirim... {sent}/{totalSend}</p></div></div>}

          <div className="flex items-center gap-2 mb-6">
            {['Pilih Kontak','Tulis Pesan','Test & Kirim'].map((l, i) => (
              <button key={i} onClick={() => setStep(i + 1)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium ${step === i + 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>{i + 1}. {l}</button>
            ))}
          </div>

          {step === 1 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-slate-400">{selected.size} dari {rows.length} dipilih</span>
                <select value={contactFilter || period} onChange={e => setContactFilter(e.target.value)} className="text-xs border rounded px-2 py-1">
                  <option value="">Semua Periode</option>
                  <option value={period}>{period} (saat ini)</option>
                </select>
                <div className="flex-1" />
                <button onClick={importCSV} className="text-xs bg-green-50 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-100 flex items-center gap-1"><Upload className="w-3 h-3" />Import CSV</button>
                <button onClick={copyLLM} className="text-xs bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg hover:bg-purple-100 flex items-center gap-1"><Copy className="w-3 h-3" />AI Context</button>
              </div>
              <div className="overflow-auto bg-white rounded-lg border border-slate-200" style={{ maxHeight: '55vh' }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="px-3 py-2 w-8"><input type="checkbox" checked={selected.size >= rows.length && rows.length > 0} onChange={toggleAll} /></th>
                      {cols.map((c, i) => (
                        <th key={c} className="px-3 py-2 text-left font-medium text-slate-600 text-xs min-w-[120px] whitespace-nowrap group cursor-pointer" onDoubleClick={() => renameCol(i)} title="Double-click untuk rename">
                          {colLabels[i] || c}
                          <button onClick={() => deleteCol(i)} className="ml-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 text-xs">&times;</button>
                        </th>
                      ))}
                      <th className="px-2 py-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, ri) => (
                      <tr key={ri} className={`border-t border-slate-100 ${selected.has(ri) ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}>
                        <td className="px-3 py-2.5 text-center"><input type="checkbox" checked={selected.has(ri)} onChange={() => toggleRow(ri)} /></td>
                        {cols.map(c => (
                          <td key={c} className="px-3 py-2.5 border-r border-slate-50 last:border-r-0" contentEditable suppressContentEditableWarning onBlur={e => updateCell(ri, c, e.currentTarget.textContent || '')} onKeyDown={e => { if(e.key === 'Enter') { e.preventDefault(); (e.target as HTMLElement).blur() } }}>{r[c] || ''}</td>
                        ))}
                        <td className="px-2 text-center"><button onClick={() => deleteRow(ri)} className="text-red-400 hover:text-red-600 text-xs"><X className="w-3 h-3" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-2 mt-2">
                <button onClick={addRow} className="text-xs bg-slate-100 px-2 py-1 rounded hover:bg-slate-200"><Plus className="w-3 h-3 inline mr-1" />Baris</button>
                <button onClick={addCol} className="text-xs bg-slate-100 px-2 py-1 rounded hover:bg-slate-200"><Plus className="w-3 h-3 inline mr-1" />Kolom</button>
              </div>
              <div className="flex justify-end mt-4"><button onClick={() => setStep(2)} disabled={selected.size === 0} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm flex items-center gap-1 disabled:opacity-50">Lanjut <ChevronRight className="w-4 h-4" /></button></div>
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="flex gap-4">
                <div className="flex-1 space-y-3">
                  <textarea ref={textareaRef} value={message} onChange={e => { setMessage(e.target.value); updatePreview() }} className="w-full border rounded-lg px-3 py-2 text-sm h-52 resize-none font-sans" placeholder="Tulis template pesan..." />
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>{message.length} karakter</span>
                    <select value={delay} onChange={e => setDelay(parseInt(e.target.value))} className="border rounded px-2 py-1"><option value={1000}>1s</option><option value={3000}>3s</option><option value={5000}>5s</option><option value={10000}>10s</option></select>
                    <span>delay</span>
                  </div>
                  {preview && (
                    <div className="border rounded-lg p-3 bg-slate-50">
                      <h4 className="text-xs font-bold text-slate-500 mb-2">Preview</h4>
                      <div className="text-sm whitespace-pre-wrap bg-white border rounded p-3">{preview}</div>
                    </div>
                  )}
                </div>
                <div className="w-64 space-y-2 flex-shrink-0">
                  <div className="bg-white rounded-lg border p-2">
                    <h4 className="text-xs font-bold text-slate-500 mb-2">Variable Kolom</h4>
                    {cols.map(c => <button key={c} onClick={() => insertVar(c)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 whitespace-nowrap mr-1 mb-1">{`{{${c}}}`}</button>)}
                  </div>
                  <div className="bg-white rounded-lg border p-2">
                    <h4 className="text-xs font-bold text-slate-500 mb-2">Filter (add |filter)</h4>
                    {FACETS.map(f => <button key={f} onClick={() => insertFilter(f)} className="block text-xs text-purple-600 hover:bg-purple-50 w-full text-left px-2 py-0.5 rounded font-mono">|{f}</button>)}
                  </div>
                </div>
              </div>
              <div className="flex justify-between mt-4">
                <button onClick={() => setStep(1)} className="px-4 py-2 border rounded-lg text-sm"><ChevronLeft className="w-4 h-4 inline" />Kembali</button>
                <button onClick={() => setStep(3)} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm">Review <ChevronRight className="w-4 h-4 inline" /></button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="border rounded-lg p-4">
                  <h4 className="text-sm font-bold text-slate-600 mb-2">Test Kirim</h4>
                  <select value={testContact} onChange={e => setTestContact(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm mb-2"><option value="">-- pilih kontak --</option>{rows.filter((_,i) => selected.has(i)).map((r, i) => <option key={i} value={i}>{r.full_name || r.nickname || `Baris ${i + 1}`}</option>)}</select>
                  {!testContact && <input value={testPhone} onChange={e => setTestPhone(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" placeholder="08xxx" />}
                  <button onClick={sendTest} className="mt-2 px-4 py-1.5 bg-amber-600 text-white rounded-lg text-xs flex items-center gap-1"><TestTube className="w-3 h-3" />Kirim Test</button>
                </div>
                <div className="border rounded-lg p-4">
                  <h4 className="text-sm font-bold text-slate-600 mb-2">Kirim Broadcast</h4>
                  <p className="text-sm text-slate-500 mb-2">{selected.size} kontak terpilih · delay {delay / 1000}s</p>
                  <button onClick={sendBroadcast} disabled={sending} className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm flex items-center gap-2"><Send className="w-4 h-4" />Kirim Broadcast</button>
                </div>
              </div>
              <div className="border rounded-lg p-3 max-h-48 overflow-y-auto">
                <h4 className="text-xs font-bold text-slate-500 mb-2">Live Progress</h4>
                {liveLog.length === 0 && <p className="text-xs text-slate-400">Belum ada aktivitas</p>}
                {liveLog.map((l, i) => (
                  <div key={i} className={`flex items-center gap-2 text-xs py-1 px-2 rounded ${l.status === 'sent' ? 'bg-green-50' : 'bg-red-50'}`}>
                    <span className="text-slate-400 w-6 text-right">{i + 1}</span>
                    {l.status === 'sent' ? <CheckCircle className="w-3 h-3 text-green-500" /> : <Clock className="w-3 h-3 text-red-500" />}
                    <span className="text-slate-700 font-mono">{l.phone}</span>
                    {l.error && <span className="text-red-400 truncate"> — {l.error}</span>}
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-4">
                <button onClick={() => setStep(2)} className="px-4 py-2 border rounded-lg text-sm"><ChevronLeft className="w-4 h-4 inline" />Edit</button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-green-800">Broadcast Terkirim!</h3>
              <p className="text-sm text-green-600 mt-1">{totalSend} pesan diproses</p>
              <button onClick={() => { setStep(1); setSelected(new Set()); setMessage(''); setSent(0) }} className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg text-sm">Broadcast Baru</button>
            </div>
          )}
        </div>
      )}

      {tab === 'log' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-bold text-slate-700 mb-4">Riwayat Broadcast</h3>
          {history.length === 0 && <p className="text-sm text-slate-400 text-center py-8">Belum ada riwayat</p>}
          {history.map((h: any, i: number) => (
            <div key={i} className="border-b py-3 text-sm cursor-pointer hover:bg-slate-50 px-2 rounded transition" onClick={() => loadHistoryDetail(h.id)}>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">{new Date(h.created_at).toLocaleString('id-ID')}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${h.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{h.status || '-'}</span>
              </div>
              <div className="flex items-center gap-4 mt-1">
                <span className="text-xs text-slate-400">{h.total || 0} kontak</span>
                <span className="text-xs text-slate-500 truncate">{(h.message || '').substring(0, 60)}{(h.message || '').length > 60 ? '...' : ''}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {historyDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setHistoryDetail(null)}>
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800">Detail Broadcast</h3>
              <button onClick={() => setHistoryDetail(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <pre className="text-xs bg-slate-50 p-4 rounded overflow-auto max-h-96">{JSON.stringify(historyDetail, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  )
}
