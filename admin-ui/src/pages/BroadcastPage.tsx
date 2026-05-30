import { useState, useEffect, useCallback } from 'react'
import { usePeriod } from '../components/AdminLayout'
import { apiGet, apiPost } from '../lib/api'
import { Send, Users } from 'lucide-react'

export default function BroadcastPage() {
  const { period } = usePeriod()
  const [contacts, setContacts] = useState<any[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [filterDept, setFilterDept] = useState('')

  const load = useCallback(async () => {
    try { const d = await apiGet(`/api/broadcast/anggota-contacts?period=${period}`); setContacts(d.contacts || d || []) } catch { setContacts([]) }
    setLoading(false)
  }, [period])
  useEffect(() => { load() }, [load])

  function toggleAll() {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map((c: any) => c.id)))
  }

  function toggle(id: string) {
    const next = new Set(selected)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelected(next)
  }

  const departments = [...new Set(contacts.map((c: any) => c.department).filter(Boolean))]
  const filtered = filterDept ? contacts.filter((c: any) => c.department === filterDept) : contacts

  async function send() {
    if (!message) return alert('Tulis pesan terlebih dahulu')
    if (selected.size === 0) return alert('Pilih setidaknya satu kontak')
    setSending(true)
    try {
      await apiPost('/api/broadcast/send', { message, contact_ids: [...selected], period_label: period })
      setStatus(`Berhasil mengirim ke ${selected.size} kontak`)
    } catch (e: any) { setStatus(`Gagal: ${e.message}`) }
    setSending(false)
  }

  if (loading) return <div className="text-slate-400 text-center py-8">Memuat...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-slate-800">WhatsApp Broadcast</h2>
        <div className="text-sm text-slate-500"><Users className="w-4 h-4 inline mr-1" />{contacts.length} kontak</div>
      </div>

      <div className="mb-4 flex gap-2">
        <button onClick={() => setFilterDept('')} className={`px-3 py-1.5 text-sm rounded-lg border ${!filterDept ? 'bg-blue-600 text-white' : 'hover:bg-slate-100'}`}>Semua</button>
        {departments.map((d: any) => (
          <button key={d} onClick={() => setFilterDept(d)} className={`px-3 py-1.5 text-sm rounded-lg border ${filterDept === d ? 'bg-blue-600 text-white' : 'hover:bg-slate-100'}`}>{d}</button>
        ))}
      </div>

      <div className="flex gap-4 mb-4">
        <div className="flex-1">
          <textarea value={message} onChange={e => setMessage(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm h-32" placeholder="Tulis pesan WhatsApp..." />
          <button onClick={send} disabled={sending} className="mt-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2">
            <Send className="w-4 h-4" /> {sending ? 'Mengirim...' : `Kirim ke ${selected.size} kontak`}
          </button>
          {status && <div className={`mt-2 text-sm ${status.includes('Gagal') ? 'text-red-600' : 'text-green-600'}`}>{status}</div>}
        </div>
        <div className="w-72 bg-white rounded-xl border border-slate-200 max-h-96 overflow-y-auto">
          <label className="flex items-center gap-2 px-3 py-2 border-b bg-slate-50 cursor-pointer text-sm font-medium">
            <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} /> Pilih Semua ({filtered.length})
          </label>
          {filtered.map((c: any) => (
            <label key={c.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer text-sm">
              <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
              <span>{c.full_name || c.name}</span>
              <span className="text-xs text-slate-400 ml-auto">{c.phone}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}
