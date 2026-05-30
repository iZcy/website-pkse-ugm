import { useState, useEffect, useCallback } from 'react'
import { usePeriod } from '../components/AdminLayout'
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api'
import { Plus, Pencil, Trash2, RefreshCw } from 'lucide-react'

const CHART_TYPES = ['kpi', 'bar', 'pie', 'line', 'kpi_card']

export default function GlobalStatsPage() {
  const { period } = usePeriod()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState('')
  const [saving, setSaving] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const [form, setForm] = useState({ label: '', key: '', value: '', chart_type: 'kpi', order: '0' })

  const load = useCallback(async () => {
    try { const d = await apiGet('/api/cms/stats'); setItems(d.items || d || []) } catch { setItems([]) }
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  function openAdd() { setEditId(''); setForm({ label: '', key: '', value: '', chart_type: 'kpi', order: '0' }); setShowModal(true) }
  function openEdit(s: any) { setEditId(s.id); setForm({ label: s.label || '', key: s.key || '', value: String(s.value || ''), chart_type: s.chart_type || 'kpi', order: String(s.order || 0) }); setShowModal(true) }

  async function save() {
    setSaving(true)
    try {
      const body: any = { ...form, value: parseFloat(form.value) || 0, order: parseInt(form.order) || 0 }
      if (editId) await apiPut(`/api/cms/stats/${editId}`, body)
      else await apiPost('/api/cms/stats', body)
      setShowModal(false); load()
    } catch (e: any) { alert(e.message) }
    setSaving(false)
  }

  async function remove(id: string) { if (!confirm('Hapus?')) return; await apiDelete(`/api/cms/stats/${id}`); load() }

  async function syncToPeriod() {
    try { await apiPost(`/api/cms/sync-stats?period=${period}`, {}); setSyncMsg(`Tersinkron ke ${period}!`); setTimeout(() => setSyncMsg(''), 2000) }
    catch (e: any) { alert(e.message) }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Template Statistik Global</h2>
        <div className="flex gap-2 items-center">
          {syncMsg && <span className="text-sm text-green-600">{syncMsg}</span>}
          <button onClick={syncToPeriod} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Sync ke "{period}"</button>
          <button onClick={openAdd} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"><Plus className="w-4 h-4" /> Tambah</button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {loading && <div className="text-slate-400 col-span-2 text-center py-8">Memuat...</div>}
        {items.map((s: any) => (
          <div key={s.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
            <div>
              <div className="font-medium">{s.label || s.key}</div>
              <div className="text-2xl font-bold text-blue-600">{s.value}</div>
              <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full">{s.chart_type}</span>
            </div>
            <div className="flex gap-2"><button onClick={() => openEdit(s)} className="p-1.5 hover:bg-slate-100 rounded"><Pencil className="w-3.5 h-3.5" /></button><button onClick={() => remove(s.id)} className="p-1.5 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button></div>
          </div>
        ))}
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">{editId ? 'Edit' : 'Tambah'}</h3>
            <div className="space-y-3">
              <div><label className="text-sm font-medium">Label</label><input value={form.label} onChange={e => setForm({...form, label: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="text-sm font-medium">Key</label><input value={form.key} onChange={e => setForm({...form, key: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="text-sm font-medium">Nilai</label><input value={form.value} onChange={e => setForm({...form, value: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="text-sm font-medium">Tipe</label><select value={form.chart_type} onChange={e => setForm({...form, chart_type: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm">{CHART_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
              <div><label className="text-sm font-medium">Urutan</label><input type="number" value={form.order} onChange={e => setForm({...form, order: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
            </div>
            <div className="flex gap-2 justify-end mt-4"><button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">Batal</button><button onClick={save} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">{saving ? '...' : 'Simpan'}</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
