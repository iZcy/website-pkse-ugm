import { useState, useEffect, useCallback, useRef } from 'react'
import { usePeriod } from '../components/AdminLayout'
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api'
import { Plus, Pencil, Trash2, RefreshCw, GripVertical } from 'lucide-react'
import Sortable from 'sortablejs'
import { ChartChoices, ChartIcon, statChartMode } from './StatistikPage'

interface TemplateForm { label: string; desc: string; chart_type: string; fillable: boolean; visible: boolean; order: string }
const emptyForm = (order = 0): TemplateForm => ({ label: '', desc: '', chart_type: 'bar', fillable: false, visible: true, order: String(order) })

export default function GlobalStatsPage() {
  const { period } = usePeriod()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState('')
  const [saving, setSaving] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const [form, setForm] = useState<TemplateForm>(emptyForm())
  const gridRef = useRef<HTMLDivElement>(null)
  const sortRef = useRef<Sortable | null>(null)

  const load = useCallback(async () => {
    try { const d = await apiGet('/api/cms/stats?period=_TEMPLATE_'); setItems(d.items || d || []) } catch { setItems([]) }
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  // Full payload for template PUT: the backend $sets every field, so partial bodies would wipe label/desc/flags.
  function templatePayload(s: any, patch: Record<string, any> = {}) {
    return {
      ...s,
      period_label: '_TEMPLATE_',
      template_id: s.template_id || s.id,
      chart_type: s.chart_type || 'bar',
      fillable: !!s.fillable,
      visible: s.visible !== false,
      value: String(s.value ?? ''),
      order: s.order || 0,
      ...patch,
    }
  }

  // Drag reorder (old initStatsSortable)
  useEffect(() => {
    const el = gridRef.current
    if (!el || loading || items.length === 0) return
    sortRef.current?.destroy()
    sortRef.current = Sortable.create(el, {
      animation: 180, handle: '.drag-handle', draggable: '.stat-card',
      onEnd: async () => {
        const cards = el.querySelectorAll('.stat-card')
        for (let i = 0; i < cards.length; i++) {
          const id = (cards[i] as HTMLElement).dataset.statId
          const s = items.find((x: any) => x.id === id)
          if (s) await apiPut(`/api/cms/stats/${id}`, templatePayload(s, { order: i })).catch(() => {})
        }
        load()
      },
    })
    return () => { sortRef.current?.destroy(); sortRef.current = null }
  }, [items, loading, load])

  function openAdd() { setEditId(''); setForm(emptyForm(items.length)); setShowModal(true) }
  function openEdit(s: any) {
    setEditId(s.id)
    setForm({ label: s.label || '', desc: s.desc || '', chart_type: s.chart_type || 'bar', fillable: !!s.fillable, visible: s.visible !== false, order: String(s.order || 0) })
    setShowModal(true)
  }

  async function save() {
    if (!form.label.trim()) { alert('Label wajib diisi.'); return }
    setSaving(true)
    try {
      const existing = editId ? items.find((x: any) => x.id === editId) : null
      const body = {
        id: editId,
        period_label: '_TEMPLATE_',
        template_id: existing ? (existing.template_id || existing.id) : '',
        label: form.label.trim(),
        desc: form.desc,
        chart_type: form.chart_type || 'bar',
        fillable: form.fillable,
        visible: form.visible,
        value: String(existing?.value ?? ''),
        order: parseInt(form.order) || 0,
      }
      if (editId) await apiPut(`/api/cms/stats/${editId}`, body)
      else await apiPost('/api/cms/stats', body)
      setShowModal(false); load()
    } catch (e: any) { alert(e.message) }
    setSaving(false)
  }

  async function toggleFlag(s: any, key: 'fillable' | 'visible', checked: boolean) {
    try { await apiPut(`/api/cms/stats/${s.id}`, templatePayload(s, { [key]: checked })); load() }
    catch (e: any) { alert(e.message) }
  }

  async function remove(id: string) { if (!confirm('Hapus template ini?')) return; await apiDelete(`/api/cms/stats/${id}`); load() }

  async function syncToPeriod() {
    if (!period || period === '_TEMPLATE_') { alert('Pilih periode valid!'); return }
    if (!confirm(`Tarik template statistik ke periode "${period}"? Nilai yang sudah diisi pada periode itu akan direset ke 0.`)) return
    try { await apiPost('/api/cms/sync-stats', { period_label: period }); setSyncMsg(`Tersinkron ke ${period}!`); setTimeout(() => setSyncMsg(''), 2000) }
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
      <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {loading && <div className="text-slate-400 col-span-2 text-center py-8">Memuat...</div>}
        {!loading && items.length === 0 && <div className="text-slate-400 col-span-2 text-center py-8">Belum ada template. Tambahkan metrik.</div>}
        {items.map((s: any, idx: number) => {
          const ct = s.chart_type || 'bar'
          return (
            <div key={s.id} data-stat-id={s.id} className="stat-card bg-white rounded-xl border border-slate-200 p-4 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <button className="drag-handle mt-0.5 text-slate-400 hover:text-slate-600 cursor-grab p-0.5" title="Geser urutan"><GripVertical className="w-4 h-4" /></button>
                <div className="w-16 flex-shrink-0 rounded-md border border-slate-200 bg-slate-50 p-1"><ChartIcon type={ct} /></div>
                <div className="min-w-0">
                  <div className="font-medium truncate"><span className="text-slate-400 mr-1">{idx + 1}.</span>{s.label}</div>
                  {s.desc && <div className="text-sm text-slate-500 truncate">{s.desc}</div>}
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full">{ct.toUpperCase()}</span>
                    <span className="text-xs text-slate-400">Mode: {statChartMode(ct)}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-700">
                    <label className="inline-flex items-center gap-1.5"><input type="checkbox" className="rounded" checked={!!s.fillable} onChange={e => toggleFlag(s, 'fillable', e.target.checked)} /> Fillable</label>
                    <label className="inline-flex items-center gap-1.5"><input type="checkbox" className="rounded" checked={s.visible !== false} onChange={e => toggleFlag(s, 'visible', e.target.checked)} /> Tampilkan</label>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0"><button onClick={() => openEdit(s)} className="p-1.5 hover:bg-slate-100 rounded"><Pencil className="w-3.5 h-3.5" /></button><button onClick={() => remove(s.id)} className="p-1.5 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button></div>
            </div>
          )
        })}
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
            <h3 className="text-lg font-bold p-6 pb-0 flex-shrink-0">{editId ? 'Edit' : 'Tambah'} Template Statistik</h3>
            <div className="overflow-y-auto flex-1 p-6 space-y-3">
              <div><label className="text-sm font-medium">Label</label><input value={form.label} onChange={e => setForm({...form, label: e.target.value})} placeholder="Total Anggota" className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="text-sm font-medium">Deskripsi Tambahan</label><input value={form.desc} onChange={e => setForm({...form, desc: e.target.value})} placeholder="Orang dari berbagai jurusan" className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="text-sm font-medium block mb-2">Jenis Chart</label><ChartChoices value={form.chart_type} onChange={v => setForm({...form, chart_type: v})} /></div>
              <div className="grid grid-cols-2 gap-3">
                <label className="inline-flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" className="rounded" checked={form.fillable} onChange={e => setForm({...form, fillable: e.target.checked})} /> Fillable</label>
                <label className="inline-flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" className="rounded" checked={form.visible} onChange={e => setForm({...form, visible: e.target.checked})} /> Tampilkan</label>
              </div>
              <div><label className="text-sm font-medium">Urutan</label><input type="number" value={form.order} onChange={e => setForm({...form, order: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
            </div>
            <div className="flex gap-2 justify-end p-6 pt-0 flex-shrink-0"><button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">Batal</button><button onClick={save} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">{saving ? '...' : 'Simpan'}</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
