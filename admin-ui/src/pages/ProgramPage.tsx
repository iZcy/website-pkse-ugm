import { useState, useEffect, useCallback } from 'react'
import { usePeriod } from '../components/AdminLayout'
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'
import ImageUpload from '../components/ImageUpload'

export default function ProgramPage() {
  const { period } = usePeriod()
  const [programs, setPrograms] = useState<any[]>([])
  const [depts, setDepts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState('')
  const [saving, setSaving] = useState(false)
  const [deptFilter, setDeptFilter] = useState('')
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ title: '', description: '', department: '', image_url: '' })

  const load = useCallback(async () => {
    try {
      const [p, d] = await Promise.all([
        apiGet(`/api/cms/programs?period=${period}`),
        apiGet(`/api/cms/departments?period=${period}`),
      ])
      setPrograms(p || [])
      setDepts(d || [])
    } catch { setPrograms([]); setDepts([]) }
    setLoading(false)
  }, [period])
  useEffect(() => { load() }, [load])

  function openAdd() {
    setEditId('')
    setForm({ title: '', description: '', department: depts[0]?.name || '', image_url: '' })
    setShowModal(true)
  }
  function openEdit(p: any) {
    setEditId(p.id)
    setForm({ title: p.title || '', description: p.description || '', department: p.department || '', image_url: p.image_url || '' })
    setShowModal(true)
  }
  async function save() {
    if (!form.title) return alert('Judul wajib diisi')
    setSaving(true)
    try {
      const body: any = { ...form, period_label: period }
      if (editId) await apiPut(`/api/cms/programs/${editId}`, body)
      else await apiPost('/api/cms/programs', body)
      setShowModal(false); load()
    } catch (e: any) { alert(e.message) }
    setSaving(false)
  }
  async function remove(id: string) {
    if (!confirm('Hapus program ini?')) return
    await apiDelete(`/api/cms/programs/${id}`); load()
  }

  const filtered = programs.filter((p: any) => {
    const matchDept = !deptFilter || (p.department || '').toLowerCase() === deptFilter.toLowerCase()
    const s = search.toLowerCase().trim()
    const matchSearch = !s || (p.title || '').toLowerCase().includes(s) || (p.description || '').toLowerCase().includes(s)
    return matchDept && matchSearch
  })

  if (loading) return <div className="text-slate-400 text-center py-8">Memuat...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-slate-800">Program</h2>
        <button onClick={openAdd} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"><Plus className="w-4 h-4" /> Tambah</button>
      </div>

      <div className="flex gap-3 mb-4">
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm bg-white">
          <option value="">Semua Kementerian</option>
          {depts.map((d: any) => <option key={d.name} value={d.name}>{d.name}</option>)}
        </select>
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} className="pl-9 pr-3 py-2 border rounded-lg text-sm w-full" placeholder="Cari program..." />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-4 py-2 w-10">#</th>
              <th className="text-left px-4 py-2">Kementerian</th>
              <th className="text-left px-4 py-2">Nama Program</th>
              <th className="text-left px-4 py-2">Deskripsi</th>
              <th className="px-4 py-2 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-slate-400">Tidak ada program yang cocok.</td></tr>
            )}
            {filtered.map((p: any, i: number) => (
              <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-2 text-slate-400 text-center">{i + 1}</td>
                <td className="px-4 py-2 text-slate-600">{p.department || '-'}</td>
                <td className="px-4 py-2 font-medium text-slate-800">
                  <div className="flex items-center gap-2">
                    {p.image_url && <img src={p.image_url} className="w-8 h-8 rounded-lg object-cover" alt="" />}
                    {p.title || ''}
                  </div>
                </td>
                <td className="px-4 py-2 text-slate-600 max-w-xs truncate">{p.description || '-'}</td>
                <td className="px-4 py-2">
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(p)} className="p-1 rounded hover:bg-slate-100"><Pencil className="w-3.5 h-3.5 text-blue-600" /></button>
                    <button onClick={() => remove(p.id)} className="p-1 rounded hover:bg-red-50"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
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
            <h3 className="text-lg font-bold p-6 pb-0 flex-shrink-0">{editId ? 'Edit' : 'Tambah'} Program</h3>
            <div className="overflow-y-auto flex-1 p-6 space-y-3">
              <div><label className="text-sm font-medium">Judul</label><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="text-sm font-medium">Kementerian</label><select value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">{depts.map((d: any) => <option key={d.name} value={d.name}>{d.name}</option>)}</select></div>
              <div><label className="text-sm font-medium">Deskripsi</label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm h-20" /></div>
              <div><label className="text-sm font-medium">Gambar</label><ImageUpload value={form.image_url} onChange={url => setForm({ ...form, image_url: url })} /></div>
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
