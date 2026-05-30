import { useState, useEffect, useCallback } from 'react'
import { usePeriod } from '../components/AdminLayout'
import { apiGet, apiPost } from '../lib/api'
import { Send, Search, Users, CheckCircle, Loader2, RefreshCw } from 'lucide-react'

export default function BroadcastPage() {
  const { period } = usePeriod()
  const [step, setStep] = useState(1)
  const [contacts, setContacts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState('Halo {{nama}},\n\n')
  const [delayMs, setDelayMs] = useState(3000)
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState('')
  const [waConnected, setWaConnected] = useState(false)
  const [qrCode, setQrCode] = useState('')

  const loadContacts = useCallback(async () => {
    try {
      const data = await apiGet(`/api/broadcast/anggota-contacts?period=${period}`)
      setContacts(data.contacts || data || [])
    } catch { setContacts([]) }
    setLoading(false)
  }, [period])
  useEffect(() => { loadContacts() }, [loadContacts])

  useEffect(() => {
    apiGet('/api/broadcast/status').then(d => {
      if (d.connected) setWaConnected(true)
      else loadQR()
    }).catch(() => {})
  }, [])

  async function loadQR() {
    try {
      const r = await fetch('/api/broadcast/qr', { credentials: 'same-origin' })
      if (r.ok) { const blob = await r.blob(); setQrCode(URL.createObjectURL(blob)) }
    } catch { }
  }

  function toggleAll(filtered: any[]) {
    if (selected.size >= filtered.length) {
      const next = new Set(selected); filtered.forEach((c: any) => next.delete(c.id)); setSelected(next)
    } else {
      const next = new Set(selected); filtered.forEach((c: any) => next.add(c.id)); setSelected(next)
    }
  }

  function toggle(id: string) {
    const next = new Set(selected); next.has(id) ? next.delete(id) : next.add(id); setSelected(next)
  }

  async function send() {
    if (!message || selected.size === 0) return
    setSending(true)
    try {
      await apiPost('/api/broadcast/send', { message, phones: [...selected], delay_ms: delayMs, period_label: period })
      setStatus('Berhasil dikirim!'); setStep(4)
    } catch (e: any) { setStatus('Gagal: ' + e.message) }
    setSending(false)
  }

  const departments = [...new Set(contacts.map((c: any) => c.department).filter(Boolean))]
  const filtered = contacts.filter((c: any) => {
    const matchDept = !deptFilter || c.department === deptFilter
    const s = search.toLowerCase()
    const matchSearch = !s || (c.full_name || '').toLowerCase().includes(s) || (c.phone || '').includes(s)
    return matchDept && matchSearch
  })

  if (loading) return <div className="text-slate-400 text-center py-8">Memuat...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-slate-800">WhatsApp Broadcast</h2>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-sm">
            <span className={`w-2.5 h-2.5 rounded-full ${waConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            {waConnected ? 'Terhubung' : 'Tidak terhubung'}
          </span>
          {!waConnected && <button onClick={loadQR} className="text-xs text-blue-600 hover:underline"><RefreshCw className="w-3 h-3 inline" /> QR</button>}
        </div>
      </div>

      {qrCode && !waConnected && (
        <div className="mb-4 bg-white rounded-xl border p-4 flex gap-4 items-center">
          <img src={qrCode} className="w-40 h-40 border rounded-lg" alt="" />
          <div className="text-sm text-slate-600">
            <p className="font-semibold mb-1">Scan QR Code</p>
            <p>WhatsApp → Perangkat Tertaut → Scan</p>
            <button onClick={loadQR} className="mt-2 text-xs text-blue-600 hover:underline"><RefreshCw className="w-3 h-3 inline" /> Refresh</button>
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-4 border-b pb-2">
        {['Pilih Kontak', 'Tulis Pesan', 'Konfirmasi'].map((l, i) => (
          <button key={i} onClick={() => setStep(i + 1)} className={`px-4 py-2 rounded-t-lg text-sm font-medium ${step === i + 1 ? 'bg-white text-blue-700 shadow-sm border-b-2 border-blue-600' : 'text-slate-500'}`}>
            {i + 1}. {l}
          </button>
        ))}
        {status && <span className="ml-auto text-sm text-green-600 self-center">{status}</span>}
      </div>

      {step === 1 && (
        <div>
          <div className="flex gap-3 mb-3 flex-wrap">
            <div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} className="pl-9 pr-3 py-2 border rounded-lg text-sm w-56" placeholder="Cari..." /></div>
            <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm"><option value="">Semua</option>{departments.map(d => <option key={d} value={d}>{d}</option>)}</select>
            <span className="flex-1 text-sm text-slate-500 self-center text-right">{selected.size} dari {contacts.length}</span>
          </div>
          <div className="bg-white rounded-xl border overflow-hidden max-h-[60vh] overflow-y-auto">
            <label className="flex items-center gap-2 px-3 py-2 border-b bg-slate-50 cursor-pointer text-sm font-medium sticky top-0">
              <input type="checkbox" checked={selected.size >= filtered.length && filtered.length > 0} onChange={() => toggleAll(filtered)} /> Pilih Semua ({filtered.length})
            </label>
            {filtered.map(c => (
              <label key={c.id} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm border-b border-slate-50">
                <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
                <span className="flex-1">{c.full_name || c.name}</span>
                <span className="text-xs text-slate-400">{c.department}</span>
                <span className="text-xs text-slate-400 font-mono">{c.phone}</span>
              </label>
            ))}
          </div>
          <div className="flex justify-end mt-4">
            <button onClick={() => setStep(2)} disabled={selected.size === 0} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">Lanjut →</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <div className="bg-white rounded-xl border p-4 space-y-3">
            <textarea value={message} onChange={e => setMessage(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm h-40 resize-none" />
            <div className="flex gap-3 text-xs text-slate-500 flex-wrap">
              <span>{message.length} karakter</span>
              <button onClick={() => setMessage(m => m + '{{nama}}')} className="text-blue-600 hover:underline">+Nama</button>
              <button onClick={() => setMessage(m => m + '{{nim}}')} className="text-blue-600 hover:underline">+NIM</button>
              <button onClick={() => setMessage(m => m + '{{departemen}}')} className="text-blue-600 hover:underline">+Dept</button>
              <button onClick={() => setMessage(m => m + '{{rapor_link}}')} className="text-blue-600 hover:underline">+Link Rapor</button>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm text-slate-600">Delay:</label>
              <select value={delayMs} onChange={e => setDelayMs(parseInt(e.target.value))} className="border rounded px-2 py-1 text-sm">
                <option value={1000}>1 detik</option><option value={3000}>3 detik</option><option value={5000}>5 detik</option><option value={10000}>10 detik</option>
              </select>
            </div>
          </div>
          <div className="flex justify-between mt-4">
            <button onClick={() => setStep(1)} className="px-4 py-2 border rounded-lg text-sm">← Kembali</button>
            <button onClick={() => setStep(3)} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm">Review →</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <div className="bg-white rounded-xl border p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm text-slate-600"><Users className="w-4 h-4" />{selected.size} penerima</div>
            <div className="bg-slate-50 rounded-lg p-3 text-sm whitespace-pre-wrap">{message}</div>
            <div className="text-xs text-slate-500">Delay: {delayMs / 1000}s antar pesan</div>
          </div>
          <div className="flex justify-between mt-4">
            <button onClick={() => setStep(2)} className="px-4 py-2 border rounded-lg text-sm">← Edit</button>
            <button onClick={send} disabled={sending} className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm flex items-center gap-2">
              {sending ? <><Loader2 className="w-4 h-4 animate-spin" />Mengirim...</> : <><Send className="w-4 h-4" />Kirim Broadcast</>}
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="bg-green-50 rounded-xl border border-green-200 p-8 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-green-800">Broadcast Terkirim!</h3>
          <button onClick={() => { setStep(1); setSelected(new Set()); setMessage('Halo {{nama}},\n\n'); setStatus('') }} className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg text-sm">Broadcast Baru</button>
        </div>
      )}
    </div>
  )
}
