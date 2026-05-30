import { useState, useEffect, useCallback } from 'react'
import { usePeriod } from '../components/AdminLayout'
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api'
import { Plus, Pencil, Trash2, Copy, Check } from 'lucide-react'

interface Shortlink {
  id: string
  short_code: string
  target_url: string
  title: string
}

const empty = (): Shortlink => ({ id: '', short_code: '', target_url: '', title: '' })

export default function ShortlinkPage() {
  const { period } = usePeriod()
  const [items, setItems] = useState<Shortlink[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Shortlink>(empty())
  const [copied, setCopied] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await apiGet(`/api/cms/shortlinks?period=${period}`)
      setItems(data.items || data || [])
    } catch { setItems([]) }
    setLoading(false)
  }, [period])

  useEffect(() => { load() }, [load])

  const handleEdit = (item: Shortlink) => {
    setEditId(item.id)
    setForm({ ...item })
    setShowModal(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editId) {
        await apiPut(`/api/cms/shortlinks/${editId}`, form)
      } else {
        await apiPost('/api/cms/shortlinks', form)
      }
      setShowModal(false)
      load()
    } catch { /* handled */ }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin hapus?')) return
    try {
      await apiDelete(`/api/cms/shortlinks/${id}`)
      load()
    } catch { /* handled */ }
  }

  const handleCopy = async (code: string) => {
    const url = `${window.location.origin}/s/${code}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(code)
      setTimeout(() => setCopied(null), 2000)
    } catch { /* handled */ }
  }

  if (loading) return <div className="p-6 text-slate-500">Loading...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Shortlink</h2>
        <button onClick={() => { setEditId(''); setForm(empty()); setShowModal(true) }} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Tambah
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-left">
            <tr>
              <th className="px-5 py-3 font-medium">Short Code</th>
              <th className="px-5 py-3 font-medium">Target URL</th>
              <th className="px-5 py-3 font-medium">Judul</th>
              <th className="px-5 py-3 font-medium w-32"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 ? (
              <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-400">Belum ada data</td></tr>
            ) : items.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50">
                <td className="px-5 py-3 text-slate-800 font-mono font-medium">{item.short_code}</td>
                <td className="px-5 py-3 text-slate-500 truncate max-w-xs">{item.target_url}</td>
                <td className="px-5 py-3 text-slate-700">{item.title}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleCopy(item.short_code)} className="p-1.5 rounded hover:bg-slate-100 text-slate-500" title="Copy URL">
                      {copied === item.short_code ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
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
            <h3 className="text-lg font-semibold text-slate-800 mb-4">{editId ? 'Edit' : 'Tambah'} Shortlink</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Short Code</label>
                <input value={form.short_code} onChange={e => setForm({ ...form, short_code: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Target URL</label>
                <input value={form.target_url} onChange={e => setForm({ ...form, target_url: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Judul</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
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
