import { useState, useEffect, useCallback, useRef } from 'react'
import { usePeriod } from '../components/AdminLayout'
import { apiGet, apiPost } from '../lib/api'
import { Send, Users, CheckCircle, Loader2, RefreshCw, Copy, Plus, Trash2, History, TestTube, ChevronRight, ChevronLeft } from 'lucide-react'

const FILTERS = ['uppercase','lowercase','capitalize','titlecase','trim','length','default:"..."','slice:"start,end"','replace:"find,replace"','repeat:N']
const TEMPLATE_DOCS = [
  'Variable: {{column_name}}',
  'Filters: {{col|uppercase}}, {{col|lowercase}}, {{col|capitalize}}, {{col|titlecase}}, {{col|trim}}, {{col|length}}',
  'Default: {{col|default:"fallback"}}, Slice: {{col|slice:"0,10"}}',
  'Math: {{col + N}}, {{col - N}}',
  'Set: {{set var="value"}} then use {{var}}',
  'If: {{if col == "val"}}...{{else}}...{{endif}}',
  'If: {{if col != "val"}}..., {{if col contains "x"}}...',
  'If: {{if col empty}}...{{endif}}, {{if col notempty}}...{{endif}}',
  'If: {{if col startswith "x"}}..., {{if col endswith "x"}}..., {{if col matches "regex"}}...',
  'If comparison: {{if col > "val"}}..., {{if col >= "val"}}..., {{if col < "val"}}...',
]

export default function BroadcastPage() {
  const { period } = usePeriod()
  const [step, setStep] = useState(1)
  const [contacts, setContacts] = useState<any[]>([])
  const [columns, setColumns] = useState<string[]>(['full_name','department','phone'])
  const [colLabels, setColLabels] = useState<string[]>(['Nama','Dept','Telp'])
  const [contactRows, setContactRows] = useState<Record<string,string>[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [message, setMessage] = useState('Halo {{full_name}},\n\n')
  const [delayMs, setDelayMs] = useState(3000)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(0)
  const [totalSend, setTotalSend] = useState(0)
  const [status, setStatus] = useState('')
  const [waConnected, setWaConnected] = useState(false)
  const [qrCode, setQrCode] = useState('')
  const [liveLog, setLiveLog] = useState<{phone:string;status:string;error?:string}[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<any[]>([])
  const [testPhone, setTestPhone] = useState('')
  const [showLLM, setShowLLM] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)

  const loadContacts = useCallback(async () => {
    try {
      const data = await apiGet(`/api/broadcast/anggota-contacts?period=${period}`)
      setContacts(data.contacts || data || [])
      const keys = Object.keys((data.contacts || data || [])[0] || {}).filter(k => !['id','_id'].includes(k))
      if (keys.length > 0) { setColumns(keys); setColLabels(keys) }
      setContactRows((data.contacts || data || []).map((c:any) => ({...c})))
    } catch { setContacts([]) }
    setLoading(false)
  }, [period])
  useEffect(() => { loadContacts() }, [loadContacts])

  useEffect(() => {
    apiGet('/api/broadcast/status').then(d => { if (d.connected) setWaConnected(true); else loadQR() }).catch(() => {})
    connectWS()
    return () => { wsRef.current?.close() }
  }, [])

  function connectWS() {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${proto}//${location.host}/api/broadcast/ws`)
    ws.onmessage = e => {
      try { const d = JSON.parse(e.data); setLiveLog(prev => [...prev.slice(-20), d]); if (d.status === 'sent') setSent(s => s + 1) } catch {}
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

  function toggleAll() {
    if (selected.size >= contactRows.length) setSelected(new Set())
    else setSelected(new Set(contactRows.map((_, i) => i)))
  }
  function toggle(idx: number) {
    const n = new Set(selected); n.has(idx) ? n.delete(idx) : n.add(idx); setSelected(n)
  }

  async function sendTest() {
    if (!testPhone || !message) return alert('Isi nomor dan pesan')
    setStatus('Mengirim test...')
    await apiPost('/api/broadcast/send', { message, phones: [testPhone], messages: [message], delay_ms: 0 }).catch(e => alert(e.message))
    setStatus('Test terkirim!'); setTimeout(() => setStatus(''), 3000)
  }

  async function send() {
    if (!message || selected.size === 0) return
    setSending(true); setTotalSend(selected.size); setSent(0); setLiveLog([])
    try {
      const phones = [...selected].map(i => contactRows[i]?.phone || '').filter(Boolean)
      await apiPost('/api/broadcast/send', { message, phones, delay_ms: delayMs, period_label: period, messages: phones.map(p => message) })
      setStatus('Broadcast selesai!'); setStep(4)
    } catch (e: any) { setStatus('Gagal: ' + e.message) }
    setSending(false)
  }

  function insertVar(v: string) { setMessage(m => m + v) }
  function colNameToVar(col: string, label: string) {
    return `\${col|filter} — ${label} ({{${col}}})`
  }

  function copyLLMContext() {
    const sample = contactRows[0] || {}
    const cols = columns.map((h, i) => `  - ${h} (label: "${colLabels[i] || h}") = ${sample[h] || '(kosong)'}`).join('\n')
    const ctx = '# Template Broadcast PKSE UGM\n\n## Data Columns (first contact)\n' + cols + '\n\n## Template Rules\n' + TEMPLATE_DOCS.map(t => '- ' + t).join('\n') + '\n\n## Task\nGenerate WhatsApp broadcast message template using syntax above. Output only template text.'
    navigator.clipboard.writeText(ctx).then(() => { setStatus('Context disalin!'); setTimeout(() => setStatus(''), 2000) })
  }

  async function loadHistory() { setShowHistory(true); try { setHistory(await apiGet('/api/broadcast/history')) } catch {} }

  if (loading) return <div className="text-slate-400 text-center py-8">Memuat...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-slate-800">WhatsApp Broadcast</h2>
        <div className="flex items-center gap-3">
          <span className={`flex items-center gap-1.5 text-sm ${waConnected ? 'text-green-600' : 'text-red-500'}`}>
            <span className={`w-2.5 h-2.5 rounded-full ${waConnected ? 'bg-green-500' : 'bg-red-500'}`} />{waConnected ? 'Terhubung' : 'Tidak terhubung'}
          </span>
          {!waConnected && <button onClick={loadQR} className="text-xs text-blue-600 hover:underline"><RefreshCw className="w-3 h-3 inline" />QR</button>}
          {status && <span className="text-sm text-green-600">{status}</span>}
        </div>
      </div>

      {qrCode && !waConnected && (
        <div className="mb-4 bg-white rounded-xl border p-4 flex gap-4 items-center">
          <img src={qrCode} className="w-40 h-40 border rounded-lg" alt="" />
          <div className="text-sm text-slate-600"><p className="font-semibold mb-1">Scan QR Code</p><p>WhatsApp → Perangkat Tertaut → Scan</p><button onClick={loadQR} className="mt-2 text-xs text-blue-600 hover:underline"><RefreshCw className="w-3 h-3 inline" />Refresh</button></div>
        </div>
      )}

      <div className="flex gap-1 mb-4 border-b pb-2">
        {['Pilih Kontak','Tulis Pesan','Test & Kirim'].map((l, i) => (
          <button key={i} onClick={() => setStep(i + 1)} className={`px-4 py-2 rounded-t-lg text-sm font-medium ${step === i + 1 ? 'bg-white text-blue-700 shadow-sm border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>{i + 1}. {l}</button>
        ))}
        <div className="flex-1" />
        <button onClick={loadHistory} className="text-xs text-slate-500 hover:text-blue-600 flex items-center gap-1"><History className="w-3 h-3" />Riwayat</button>
      </div>

      {showHistory && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setShowHistory(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6">
            <h3 className="text-lg font-bold mb-4">Riwayat Broadcast</h3>
            {history.length === 0 && <div className="text-slate-400 text-center py-8">Belum ada broadcast</div>}
            {history.map((h: any, i: number) => <div key={i} className="border-b py-2 text-sm"><span className="text-slate-500">{h.date || h.created_at}</span> — {h.message?.substring(0, 80)}...</div>)}
            <button onClick={() => setShowHistory(false)} className="mt-4 px-4 py-2 border rounded-lg text-sm">Tutup</button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div>
          <div className="flex gap-2 mb-3">
            <span className="text-sm text-slate-500 self-center">{selected.size} dari {contactRows.length} terpilih</span>
            <div className="flex-1" />
            <button onClick={copyLLMContext} className="text-xs bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg hover:bg-purple-100 flex items-center gap-1"><Copy className="w-3 h-3" />Copy AI Context</button>
          </div>

          <div className="bg-white rounded-xl border overflow-auto max-h-[55vh]">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="p-2 w-8"><input type="checkbox" checked={selected.size >= contactRows.length && contactRows.length > 0} onChange={toggleAll} /></th>
                  <th className="p-2 w-8">#</th>
                  {columns.map((c, i) => (
                    <th key={c} className="p-2 text-left font-medium text-slate-600">{colLabels[i] || c}
                      <button onClick={() => insertVar(`{{${c}}}`)} className="ml-1 text-blue-400 hover:text-blue-600 text-[10px]">+</button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contactRows.map((row, ri) => (
                  <tr key={ri} className={`border-t ${selected.has(ri) ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                    <td className="p-2"><input type="checkbox" checked={selected.has(ri)} onChange={() => toggle(ri)} /></td>
                    <td className="p-2 text-slate-400">{ri + 1}</td>
                    {columns.map(c => <td key={c} className="p-2 max-w-[200px] truncate">{row[c] || '-'}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end mt-4">
            <button onClick={() => setStep(2)} disabled={selected.size === 0} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50 flex items-center gap-1">Lanjut <ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex gap-4">
          <div className="flex-1 space-y-3">
            <textarea value={message} onChange={e => setMessage(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm h-52 resize-none font-sans" placeholder="Tulis pesan broadcast..." />
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span>{message.length} karakter</span>
              <select value={delayMs} onChange={e => setDelayMs(parseInt(e.target.value))} className="border rounded px-2 py-1">
                <option value={1000}>1 detik</option><option value={3000}>3 detik</option><option value={5000}>5 detik</option><option value={10000}>10 detik</option>
              </select>
              <span>delay antar pesan</span>
            </div>
          </div>

          <div className="w-64 space-y-3 flex-shrink-0">
            <div className="bg-white rounded-xl border p-3">
              <h4 className="text-xs font-bold text-slate-500 mb-2">Variable Columns</h4>
              {columns.map(c => <button key={c} onClick={() => insertVar(`{{${c}}}`)} className="block text-xs text-blue-600 hover:bg-blue-50 w-full text-left px-2 py-1 rounded mb-0.5">{{{c}}} — {colLabels[columns.indexOf(c)] || c}</button>)}
            </div>
            <div className="bg-white rounded-xl border p-3">
              <h4 className="text-xs font-bold text-slate-500 mb-2">Filters (add |filter)</h4>
              {FILTERS.map(f => <button key={f} onClick={() => insertVar(`|${f.replace(':N','')}`)} className="block text-xs text-purple-600 hover:bg-purple-50 w-full text-left px-2 py-1 rounded mb-0.5 font-mono">|{f}</button>)}
            </div>
            <button onClick={() => setShowLLM(!showLLM)} className="text-xs text-amber-600 hover:underline w-full text-left">📋 Template syntax guide ({showLLM ? 'sembunyikan' : 'tampilkan'})</button>
            {showLLM && <div className="bg-amber-50 rounded-lg border border-amber-200 p-2 text-[10px] text-slate-700 space-y-0.5">{TEMPLATE_DOCS.map((t,i) => <div key={i} className="font-mono">• {t}</div>)}</div>}
          </div>

          <div className="flex justify-between mt-4 absolute bottom-4 left-0 right-0 px-6">
            <button onClick={() => setStep(1)} className="px-4 py-2 border rounded-lg text-sm"><ChevronLeft className="w-4 h-4 inline" />Kembali</button>
            <button onClick={() => setStep(3)} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm">Review <ChevronRight className="w-4 h-4 inline" /></button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-white rounded-xl border p-4">
              <h3 className="text-sm font-bold text-slate-600 mb-2">Test Kirim</h3>
              <div className="flex gap-2">
                <input value={testPhone} onChange={e => setTestPhone(e.target.value)} className="flex-1 border rounded-lg px-3 py-2 text-sm" placeholder="08xxx (1 nomor)" />
                <button onClick={sendTest} className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm flex items-center gap-1"><TestTube className="w-4 h-4" />Test</button>
              </div>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <h3 className="text-sm font-bold text-slate-600 mb-2">Kirim Broadcast</h3>
              <div className="flex items-center gap-2 text-sm text-slate-600"><Users className="w-4 h-4" />{selected.size} penerima</div>
              <div className="text-xs text-slate-500 mt-1">Delay: {delayMs / 1000}s</div>
              {sending && <div className="mt-2 text-sm text-blue-600"><Loader2 className="w-4 h-4 inline animate-spin" /> {sent}/{totalSend} terkirim</div>}
              {liveLog.slice(-3).map((l, i) => <div key={i} className="text-xs text-slate-500 mt-1">{l.phone}: {l.status}</div>)}
              <button onClick={send} disabled={sending} className="mt-3 w-full px-6 py-2 bg-green-600 text-white rounded-lg text-sm flex items-center justify-center gap-2">
                {sending ? <><Loader2 className="w-4 h-4 animate-spin" />Mengirim...</> : <><Send className="w-4 h-4" />Kirim Broadcast</>}
              </button>
            </div>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <h3 className="text-sm font-bold text-slate-600 mb-2">Preview Pesan</h3>
            <div className="bg-slate-50 rounded-lg p-3 text-sm whitespace-pre-wrap max-h-32 overflow-y-auto">{message}</div>
          </div>
          <div className="flex mt-4">
            <button onClick={() => setStep(2)} className="px-4 py-2 border rounded-lg text-sm"><ChevronLeft className="w-4 h-4 inline" />Edit</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="bg-green-50 rounded-xl border border-green-200 p-8 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-green-800">Broadcast Selesai!</h3>
          <p className="text-sm text-green-600 mt-1">{sent} pesan terkirim</p>
          <button onClick={() => { setStep(1); setSelected(new Set()); setMessage('Halo {{full_name}},\n\n'); setStatus(''); setSent(0) }} className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg text-sm">Broadcast Baru</button>
        </div>
      )}
    </div>
  )
}
