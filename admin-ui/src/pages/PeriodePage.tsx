import { useState, useEffect, useCallback, useRef } from 'react'
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api'
import { Plus, GripVertical } from 'lucide-react'
import Sortable from 'sortablejs'

export default function PeriodePage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ label: '', display_name: '' })
  const [subPeriods, setSubPeriods] = useState<string[]>(['Gelombang 1'])
  const [subPeriodDates, setSubPeriodDates] = useState<Record<string, string>>({})
  const [usedSubs, setUsedSubs] = useState<Set<string>>(new Set())
  const listRef = useRef<HTMLDivElement>(null)
  const sortRef = useRef<Sortable | null>(null)

  const load = useCallback(async () => {
    try {
      const d = await apiGet('/api/cms/periods')
      setItems(d || [])
    } catch { setItems([]) }
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!listRef.current || loading || items.length === 0) return
    sortRef.current?.destroy()
    sortRef.current = Sortable.create(listRef.current, {
      animation: 180, handle: '.period-drag', draggable: '.period-card',
      onEnd: async () => {
        const cards = listRef.current?.querySelectorAll('.period-card')
        if (!cards) return
        for (let i = 0; i < cards.length; i++) {
          const label = (cards[i] as HTMLElement).dataset.label
          if (label) await apiPut(`/api/cms/periods/${label}`, { sort_order: i }).catch(() => {})
        }
        load()
      },
    })
    return () => { sortRef.current?.destroy(); sortRef.current = null }
  }, [items, loading])

  function openCreate() {
    setForm({ label: '', display_name: '' })
    setSubPeriods(['Gelombang 1'])
    setSubPeriodDates({})
    setIsEditing(false)
    setShowModal(true)
  }

  function openEdit(p: any) {
    setForm({ label: p.label, display_name: p.display_name })
    setSubPeriods((p.sub_periods?.length ? p.sub_periods : ['Gelombang 1']))
    setSubPeriodDates(p.sub_period_dates || {})
    setIsEditing(true)
    loadSubPeriodUsage(p.label)
    setShowModal(true)
  }

  async function loadSubPeriodUsage(label: string) {
    try {
      const members = await apiGet(`/api/cms/members?period=${label}&per_page=200`)
      const used = new Set<string>()
      const items = members?.items || members || []
      items.forEach((m: any) => {
        const sp = m.active_periods?.[label]
        if (sp) used.add(sp)
      })
      setUsedSubs(used)
    } catch { setUsedSubs(new Set()) }
  }

  async function save() {
    if (!form.label || !form.display_name) return alert('Label dan nama wajib diisi')
    setSaving(true)
    try {
      const body: any = { label: form.label, display_name: form.display_name, sub_periods: subPeriods.filter(s => s.trim()) }
      const dates: Record<string, string> = {}
      subPeriods.filter(s => s.trim()).forEach(s => { if (subPeriodDates[s]) dates[s] = subPeriodDates[s] })
      if (Object.keys(dates).length) body.sub_period_dates = dates
      if (isEditing) await apiPut(`/api/cms/periods/${form.label}`, body)
      else await apiPost('/api/cms/periods', body)
      setShowModal(false); load()
    } catch (e: any) { alert(e.message) }
    setSaving(false)
  }

  async function activate(label: string) {
    if (!confirm(`Jadikan periode "${label}" sebagai aktif?`)) return
    await apiPut(`/api/cms/periods/${label}/activate`, {})
    load()
  }

  async function remove(label: string) {
    if (!confirm(`Hapus periode "${label}"?`)) return
    await apiDelete(`/api/cms/periods/${label}`)
    load()
  }

  if (loading) return <div className="text-slate-400 text-center py-8">Memuat...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-slate-800">Manajemen Periode</h2>
        <button onClick={openCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"><Plus className="w-4 h-4" /> Tambah Periode</button>
      </div>

      <div ref={listRef}>
        {items.length === 0 && <div className="text-center py-12 text-slate-400">Belum ada periode.</div>}
        {items.map(p => (
          <div key={p.label} className="period-card bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex items-center justify-between gap-4 mb-2" data-label={p.label}>
            <div className="flex items-center gap-3">
              <button className="period-drag text-slate-400 hover:text-slate-600 cursor-grab"><GripVertical className="w-4 h-4" /></button>
              {p.is_active && <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">Aktif</span>}
              <div><h3 className="font-semibold text-slate-800">{p.display_name}</h3><p className="text-xs text-slate-400 font-mono">{p.label}</p></div>
            </div>
            <div className="flex gap-2 items-center">
              <button onClick={() => openEdit(p)} className="text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-100">Edit</button>
              {!p.is_active && (
                <>
                  <button onClick={() => activate(p.label)} className="bg-green-50 hover:bg-green-100 text-green-700 text-xs px-3 py-1.5 rounded-lg font-medium">Jadikan Aktif</button>
                  <button onClick={() => remove(p.label)} className={`bg-red-50 hover:bg-red-100 text-red-600 text-xs px-3 py-1.5 rounded-lg font-medium ${p.has_data ? 'opacity-40 cursor-not-allowed' : ''}`} disabled={p.has_data} title={p.has_data ? 'Periode ini memiliki data terkait' : ''}>Hapus</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
            <h3 className="text-lg font-bold p-6 pb-0 flex-shrink-0">{isEditing ? 'Edit Periode' : 'Tambah Periode'}</h3>
            <div className="overflow-y-auto flex-1 p-6 space-y-3">
              <div><label className="text-sm font-medium text-slate-700">Label</label><input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} readOnly={isEditing} className={`w-full border rounded-lg px-3 py-2 text-sm ${isEditing ? 'bg-slate-100' : ''}`} /></div>
              <div><label className="text-sm font-medium text-slate-700">Nama Tampilan</label><input value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
              {isEditing && (
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Sub-Periode (Gelombang)</label>
                  <div className="space-y-2">
                    {subPeriods.map((sp, i) => {
                      const used = usedSubs.has(sp)
                      return (
                        <div key={i} className="flex flex-wrap gap-2 items-center">
                          <input value={sp} onChange={e => { const n = [...subPeriods]; n[i] = e.target.value; setSubPeriods(n) }} className="flex-1 min-w-[120px] border rounded-lg px-3 py-2 text-sm" />
                          <input type="date" value={subPeriodDates[sp] || ''} onChange={e => setSubPeriodDates({...subPeriodDates, [sp]: e.target.value})} className="w-[150px] border rounded-lg px-3 py-2 text-sm" />
                          <button onClick={() => { if (!used) setSubPeriods(subPeriods.filter((_, j) => j !== i)) }} className={`text-xs px-2 py-1 rounded ${used ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-red-50 text-red-600 hover:bg-red-100'}`} disabled={used}>{used ? 'Dipakai' : 'Hapus'}</button>
                        </div>
                      )
                    })}
                    <button onClick={() => setSubPeriods([...subPeriods, ''])} className="text-xs text-blue-600 hover:underline">+ Tambah Sub-Periode</button>
                  </div>
                </div>
              )}
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
