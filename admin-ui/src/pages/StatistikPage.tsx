import { useState, useEffect, useCallback, useRef } from 'react'
import { usePeriod } from '../components/AdminLayout'
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api'
import { Plus, Pencil, Trash2, RefreshCw, GripVertical } from 'lucide-react'
import Sortable from 'sortablejs'

const CHART_TYPES = ['kpi', 'bar', 'pie', 'line', 'kpi_card']

export default function StatistikPage() {
  const { period } = usePeriod()
  const [templates, setTemplates] = useState<any[]>([])
  const [periodStats, setPeriodStats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState('')
  const [saving, setSaving] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const [form, setForm] = useState({ label: '', key: '', value: '0', chart_type: 'kpi', order: '0' })
  const tbodyRef = useRef<HTMLTableSectionElement>(null)
  const sortRef = useRef<Sortable | null>(null)

  const load = useCallback(async () => {
    try {
      const [t, s] = await Promise.all([
        apiGet('/api/cms/stats'),
        apiGet(`/api/cms/stats?period=${period}`),
      ])
      setTemplates(t || [])
      setPeriodStats(s || [])
    } catch { setTemplates([]); setPeriodStats([]) }
    setLoading(false)
  }, [period])
  useEffect(() => { load() }, [load])

  // Init sortable
  useEffect(() => {
    if (!tbodyRef.current || loading || periodStats.length === 0) return
    sortRef.current?.destroy()
    sortRef.current = Sortable.create(tbodyRef.current, {
      animation: 180,
      handle: '.drag-handle',
      onEnd: async () => {
        const rows = tbodyRef.current?.querySelectorAll('tr')
        if (!rows) return
        for (let i = 0; i < rows.length; i++) {
          const id = (rows[i] as HTMLElement).dataset.statId
          if (id) await apiPut(`/api/cms/stats/${id}`, { order: i }).catch(() => {})
        }
        load()
      },
    })
    return () => { sortRef.current?.destroy(); sortRef.current = null }
  }, [periodStats, loading])

  function openAdd() { setEditId(''); setForm({ label: '', key: '', value: '0', chart_type: 'kpi', order: String(periodStats.length) }); setShowModal(true) }
  function openEdit(s: any) { setEditId(s.id); setForm({ label: s.label || '', key: s.key || '', value: String(s.value || 0), chart_type: s.chart_type || 'kpi', order: String(s.order || 0) }); setShowModal(true) }

  async function save() {
    setSaving(true)
    try {
      const body: any = { ...form, period_label: period, value: parseFloat(form.value) || 0, order: parseInt(form.order) || 0 }
      if (editId) await apiPut(`/api/cms/stats/${editId}`, body)
      else await apiPost('/api/cms/stats', body)
      setShowModal(false); load()
    } catch (e: any) { alert(e.message) }
    setSaving(false)
  }

  async function remove(id: string) { if (!confirm('Hapus?')) return; await apiDelete(`/api/cms/stats/${id}`); load() }

  async function syncTemplate() {
    if (!confirm('Sync template global ke periode ini?')) return
    try { await apiPost(`/api/cms/sync-stats?period=${period}`, {}); setSyncMsg('Tersinkron!'); setTimeout(() => setSyncMsg(''), 2000); load() }
    catch (e: any) { alert(e.message) }
  }

  async function updateValue(id: string, value: string) {
    await apiPut(`/api/cms/stats/${id}`, { value: parseFloat(value) || 0 }).catch(() => {})
  }

  const displayStats = periodStats.length > 0 ? periodStats : templates

  if (loading) return <div className="text-slate-400 text-center py-8">Memuat...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-slate-800">Statistik</h2>
        <div className="flex gap-2 items-center">
          {syncMsg && <span className="text-sm text-green-600">{syncMsg}</span>}
          <button onClick={syncTemplate} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Sync Template</button>
          <button onClick={openAdd} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"><Plus className="w-4 h-4" /> Tambah</button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-2 w-8"></th>
              <th className="text-left px-4 py-2">Label</th>
              <th className="text-left px-4 py-2">Key</th>
              <th className="text-left px-4 py-2">Tipe</th>
              <th className="text-left px-4 py-2">Nilai</th>
              <th className="px-4 py-2 w-8">#</th>
              <th className="px-4 py-2 w-20"></th>
            </tr>
          </thead>
          <tbody ref={tbodyRef}>
            {displayStats.length === 0 && (
              <tr><td colSpan={7} className="p-6 text-center text-slate-400">Belum ada template statistik. Buat di Template Statistik atau sync.</td></tr>
            )}
            {displayStats.map((s: any) => (
              <tr key={s.id} data-stat-id={s.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-2 py-2"><button className="drag-handle text-slate-300 hover:text-slate-500 cursor-grab p-1"><GripVertical className="w-3.5 h-3.5" /></button></td>
                <td className="px-4 py-2 font-medium">{s.label || s.key}</td>
                <td className="px-4 py-2 text-slate-500 text-xs font-mono">{s.key}</td>
                <td className="px-4 py-2"><span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full">{s.chart_type || 'kpi'}</span></td>
                <td className="px-4 py-2">
                  <input type="number" defaultValue={s.value || 0} onBlur={e => updateValue(s.id, e.target.value)} className="w-20 border rounded px-2 py-1 text-sm text-center" />
                </td>
                <td className="px-2 py-2 text-xs text-slate-400">{s.order || 0}</td>
                <td className="px-4 py-2">
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(s)} className="p-1 rounded hover:bg-slate-100"><Pencil className="w-3.5 h-3.5 text-blue-600" /></button>
                    <button onClick={() => remove(s.id)} className="p-1 rounded hover:bg-red-50"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
            <h3 className="text-lg font-bold p-6 pb-0 flex-shrink-0">{editId ? 'Edit' : 'Tambah'} Statistik</h3>
            <div className="overflow-y-auto flex-1 p-6 space-y-3">
              <div><label className="text-sm font-medium">Label</label><input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="text-sm font-medium">Key</label><input value={form.key} onChange={e => setForm({ ...form, key: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="text-sm font-medium">Nilai</label><input type="number" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="text-sm font-medium">Tipe Chart</label><select value={form.chart_type} onChange={e => setForm({ ...form, chart_type: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">{CHART_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
              <div><label className="text-sm font-medium">Urutan</label><input type="number" value={form.order} onChange={e => setForm({ ...form, order: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
            </div>
            <div className="flex gap-2 justify-end p-6 pt-0 flex-shrink-0">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">Batal</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">{saving ? '...' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
