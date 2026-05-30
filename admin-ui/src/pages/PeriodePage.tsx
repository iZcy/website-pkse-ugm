import { useState, useEffect, useCallback } from 'react'
import { usePeriod } from '../components/AdminLayout'
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api'
import { Plus, Pencil, Trash2 } from 'lucide-react'

interface Period {
  id: string
  label: string
  display_name: string
  is_active: boolean
  start_date: string
  end_date: string
}

const empty = (): Period => ({ id: '', label: '', display_name: '', is_active: false, start_date: '', end_date: '' })

export default function PeriodePage() {
  const { period } = usePeriod()
  const [items, setItems] = useState<Period[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Period>(empty())

  const load = useCallback(async () => {
    try {
      const data = await apiGet(`/api/cms/periods?period=${period}`)
      setItems(data.items || data || [])
    } catch { setItems([]) }
    setLoading(false)
  }, [period])

  useEffect(() => { load() }, [load])

  const handleEdit = (item: Period) => {
    setEditId(item.id)
    setForm({ ...item })
    setShowModal(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editId) {
        await apiPut(`/api/cms/periods/${editId}`, form)
      } else {
        await apiPost('/api/cms/periods', form)
      }
      setShowModal(false)
      load()
    } catch { /* handled */ }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin hapus?')) return
    try {
      await apiDelete(`/api/cms/periods/${id}`)
      load()
    } catch { /* handled */ }
  }

  if (loading) return <div className="p-6 text-slate-500">Loading...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Periode</h2>
        <button onClick={() => { setEditId(''); setForm(empty()); setShowModal(true) }} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Tambah
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-left">
            <tr>
              <th className="px-5 py-3 font-medium">Label</th>
              <th className="px-5 py-3 font-medium">Display Name</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium w-24"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 ? (
              <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-400">Belum ada data</td></tr>
            ) : items.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50">
                <td className="px-5 py-3 text-slate-800 font-medium">{item.label}</td>
                <td className="px-5 py-3 text-slate-700">{item.display_name}</td>
                <td className="px-5 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${item.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {item.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleEdit(item)} className="p-1.5 rounded hover:bg-blue-50 text-blue-600" title="Edit">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500" title="Hapus">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">{editId ? 'Edit' : 'Tambah'} Periode</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Label</label>
                <input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Display Name</label>
                <input value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Tanggal Mulai</label>
                  <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Tanggal Selesai</label>
                  <input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="rounded border-slate-300" />
                Active
              </label>
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
