import { useState, useEffect, useCallback, useRef } from 'react'
import { usePeriod } from '../components/AdminLayout'
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api'
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, GripVertical } from 'lucide-react'
import Sortable from 'sortablejs'
import MassUpload, { MassUploadButton } from '../components/MassUpload'
import { faqMassUploadConfig } from '../lib/massUploadConfigs'

interface FAQ {
  id: string
  question: string
  answer: string
  order?: number
  period_label?: string
}

const empty = (): FAQ => ({ id: '', question: '', answer: '' })

export default function FAQPage() {
  const { period } = usePeriod()
  const [items, setItems] = useState<FAQ[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showMassUpload, setShowMassUpload] = useState(false)
  const [editId, setEditId] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FAQ>(empty())
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const tableRef = useRef<HTMLTableElement>(null)
  const sortRef = useRef<Sortable | null>(null)
  const itemsRef = useRef<FAQ[]>([])
  itemsRef.current = items

  const load = useCallback(async () => {
    try {
      const data = await apiGet(`/api/cms/faqs?period=${period}`)
      setItems(data.items || data || [])
    } catch { setItems([]) }
    setLoading(false)
  }, [period])

  useEffect(() => { load() }, [load])

  // Drag-to-reorder: each FAQ is its own <tbody class="faq-row"> so the
  // question row and its expanded answer row move together. Sortable moves
  // the DOM node itself; we undo that move and let React re-render from the
  // new state so the two never disagree. The backend's UpdateFAQ $sets every
  // field, so the whole object is sent with the new `order` (same as the old
  // admin panel did).
  useEffect(() => {
    const el = tableRef.current
    if (!el || loading || items.length === 0) return
    sortRef.current?.destroy()
    sortRef.current = Sortable.create(el, {
      animation: 180, handle: '.faq-drag', draggable: '.faq-row',
      onEnd: async (evt) => {
        const { item, from, oldIndex, newIndex } = evt
        if (oldIndex == null || newIndex == null || oldIndex === newIndex) return
        const rows = Array.from(from.querySelectorAll(':scope > .faq-row')).filter(r => r !== item)
        from.insertBefore(item, rows[oldIndex] ?? null)
        const list = [...itemsRef.current]
        const [moved] = list.splice(oldIndex, 1)
        list.splice(newIndex, 0, moved)
        setItems(list)
        const updates = list
          .map((f, idx) => ({ f, idx }))
          .filter(({ f, idx }) => f.order !== idx)
          .map(({ f, idx }) => apiPut(`/api/cms/faqs/${f.id}`, { ...f, order: idx }))
        try { await Promise.all(updates) } catch (e: any) { alert('Gagal mengurutkan FAQ: ' + (e?.message || e)) }
        load()
      },
    })
    return () => { sortRef.current?.destroy(); sortRef.current = null }
  }, [items, loading, load])

  const handleEdit = (item: FAQ) => {
    setEditId(item.id)
    setForm({ ...item })
    setShowModal(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editId) {
        await apiPut(`/api/cms/faqs/${editId}`, form)
      } else {
        await apiPost('/api/cms/faqs', form)
      }
      setShowModal(false)
      load()
    } catch { /* handled */ }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin hapus?')) return
    try {
      await apiDelete(`/api/cms/faqs/${id}`)
      load()
    } catch { /* handled */ }
  }

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (loading) return <div className="p-6 text-slate-500">Loading...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800">FAQ</h2>
        <div className="flex gap-2">
          <button onClick={() => { setEditId(''); setForm(empty()); setShowModal(true) }} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Tambah
          </button>
          <MassUploadButton onClick={() => setShowMassUpload(true)} />
        </div>
      </div>
      {showMassUpload && <MassUpload config={faqMassUploadConfig} onClose={() => setShowMassUpload(false)} onSuccess={load} />}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table ref={tableRef} className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-left">
            <tr>
              <th className="px-3 py-3 font-medium w-8"></th>
              <th className="px-3 py-3 font-medium w-8"></th>
              <th className="px-5 py-3 font-medium">Pertanyaan</th>
              <th className="px-5 py-3 font-medium w-24"></th>
            </tr>
          </thead>
          {items.length === 0 ? (
            <tbody>
              <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-400">Belum ada data</td></tr>
            </tbody>
          ) : items.map((item) => (
            <tbody key={item.id} className="faq-row" data-id={item.id}>
              <tr className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => toggleExpand(item.id)}>
                <td className="faq-drag px-3 py-3 text-slate-400 hover:text-slate-600 cursor-move" title="Geser urutan" onClick={e => e.stopPropagation()}>
                  <GripVertical className="w-4 h-4" />
                </td>
                <td className="px-3 py-3 text-slate-400">
                  {expanded.has(item.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </td>
                <td className="px-5 py-3 text-slate-800">{item.question}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <button onClick={() => handleEdit(item)} className="p-1.5 rounded hover:bg-blue-50 text-blue-600" title="Edit">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500" title="Hapus">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
              {expanded.has(item.id) && (
                <tr className="bg-slate-50">
                  <td colSpan={2}></td>
                  <td colSpan={2} className="px-5 py-3 text-slate-600 text-sm whitespace-pre-wrap">{item.answer}</td>
                </tr>
              )}
            </tbody>
          ))}
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">{editId ? 'Edit' : 'Tambah'} FAQ</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Pertanyaan</label>
                <input value={form.question} onChange={e => setForm({ ...form, question: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Jawaban</label>
                <textarea rows={5} value={form.answer} onChange={e => setForm({ ...form, answer: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Batal</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
