import { useState, useEffect, useCallback } from 'react'
import { usePeriod } from '../components/AdminLayout'
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api'
import { Plus, Pencil, Trash2 } from 'lucide-react'

export default function DepartemenPage() {
  const { period } = usePeriod()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState('')
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [icon, setIcon] = useState('')
  const [parentId, setParentId] = useState('')
  const [sortOrder, setSortOrder] = useState(0)

  const load = useCallback(async () => {
    try { const d = await apiGet(`/api/cms/departments?period=${period}`); setItems(d.items || d || []) } catch { setItems([]) }
    setLoading(false)
  }, [period])
  useEffect(() => { load() }, [load])

  function openAdd() { setEditId(''); setName(''); setDesc(''); setIcon(''); setParentId(''); setSortOrder(0); setShowModal(true) }
  function openEdit(d: any) { setEditId(d.id); setName(d.name || ''); setDesc(d.description || ''); setIcon(d.icon || ''); setParentId(d.parent_id || ''); setSortOrder(d.sort_order || 0); setShowModal(true) }

  async function save() {
    if (!name) return alert('Nama wajib diisi')
    setSaving(true)
    try {
      const body: any = { name, description: desc, icon, parent_id: parentId || '', sort_order: sortOrder, period_label: period }
      if (editId) await apiPut(`/api/cms/departments/${editId}`, body)
      else await apiPost('/api/cms/departments', body)
      setShowModal(false); load()
    } catch (e: any) { alert(e.message) }
    setSaving(false)
  }

  async function remove(id: string) { if (!confirm('Hapus?')) return; await apiDelete(`/api/cms/departments/${id}`); load() }

  const getParentName = (pid: string) => items.find(d => d.id === pid)?.name || ''

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Kementerian / Departemen</h2>
        <button onClick={openAdd} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"><Plus className="w-4 h-4" /> Tambah</button>
      </div>
      <div className="space-y-2">
        {loading && <div className="text-slate-400 text-center py-8">Memuat...</div>}
        {items.map((d: any) => (
          <div key={d.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{d.icon || '\u{1F4CB}'}</span>
              <div><div className="font-medium">{d.name}</div><div className="text-xs text-slate-500">{d.description}{d.parent_id ? ` | Induk: ${getParentName(d.parent_id)}` : ''}</div></div>
            </div>
            <div className="flex gap-2">
              <span className="text-xs text-slate-400 self-center">Order: {d.sort_order}</span>
              <button onClick={() => openEdit(d)} className="p-1.5 rounded hover:bg-slate-100"><Pencil className="w-3.5 h-3.5 text-slate-500" /></button>
              <button onClick={() => remove(d.id)} className="p-1.5 rounded hover:bg-red-50"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
            </div>
          </div>
        ))}
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">{editId ? 'Edit' : 'Tambah'} Departemen</h3>
            <div className="space-y-3">
              <div><label className="text-sm font-medium">Nama</label><input value={name} onChange={e => setName(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="text-sm font-medium">Deskripsi</label><input value={desc} onChange={e => setDesc(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="text-sm font-medium">Icon (emoji)</label><input value={icon} onChange={e => setIcon(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="text-sm font-medium">Induk (opsional)</label><select value={parentId} onChange={e => setParentId(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm"><option value="">- Tidak ada -</option>{items.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
              <div><label className="text-sm font-medium">Urutan</label><input type="number" value={sortOrder} onChange={e => setSortOrder(parseInt(e.target.value) || 0)} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
            </div>
            <div className="flex gap-2 justify-end mt-4"><button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">Batal</button><button onClick={save} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">{saving ? '...' : 'Simpan'}</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
