import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'

export default function AkunPage() {
  const [items, setItems] = useState<any[]>([])
  const [periods, setPeriods] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState('')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [form, setForm] = useState({ username: '', password: '', role: 'admin', assigned_period: '' })

  const load = useCallback(async () => {
    try {
      const [d, p] = await Promise.all([
        apiGet(`/api/cms/accounts?page=${page}&per_page=20&search=${encodeURIComponent(search)}`),
        apiGet('/api/cms/periods'),
      ])
      setItems(d.items || [])
      setTotalPages(d.pages || 1)
      setPeriods(p || [])
    } catch { setItems([]) }
    setLoading(false)
  }, [page, search])
  useEffect(() => { load() }, [load])

  function openAdd() { setEditId(''); setForm({ username: '', password: '', role: 'admin', assigned_period: '' }); setShowModal(true) }
  function openEdit(u: any) { setEditId(u.id); setForm({ username: u.username || '', password: '', role: u.role || 'admin', assigned_period: u.assigned_period || u.accessible_periods?.[0] || periods[0]?.label || '' }) }

  async function save() {
    if (!form.username) return alert('Username wajib')
    if (!editId && !form.password) return alert('Password wajib untuk akun baru')
    setSaving(true)
    try {
      const body: any = { username: form.username, role: form.role, assigned_period: form.assigned_period }
      if (form.password) body.password = form.password
      if (editId) await apiPut(`/api/cms/accounts/${editId}`, body)
      else await apiPost('/api/cms/accounts', body)
      setShowModal(false); load()
    } catch (e: any) { alert(e.message) }
    setSaving(false)
  }

  async function remove(id: string) { if (!confirm('Hapus akun ini?')) return; await apiDelete(`/api/cms/accounts/${id}`); load() }

  if (loading) return <div className="text-slate-400 text-center py-8">Memuat...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-slate-800">Manajemen Akun</h2>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} className="pl-9 pr-3 py-2 border rounded-lg text-sm w-48" placeholder="Cari..." />
          </div>
          <button onClick={openAdd} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"><Plus className="w-4 h-4" /> Tambah</button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 w-10">No.</th>
              <th className="text-left px-4 py-3">Username</th>
              <th className="text-left px-4 py-3">Role</th>
              <th className="text-left px-4 py-3">Periode</th>
              <th className="px-4 py-3 w-20">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {items.map((u: any, i: number) => (
              <tr key={u.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-400 text-center">{(page - 1) * 20 + i + 1}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{u.username}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.role === 'superadmin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{u.role}</span></td>
                <td className="px-4 py-3 text-slate-500">{u.assigned_period || u.accessible_periods?.[0] || (u.role === 'superadmin' ? 'Semua' : '—')}</td>
                <td className="px-4 py-3"><div className="flex gap-1"><button onClick={() => openEdit(u)} className="p-1 rounded hover:bg-slate-100"><Pencil className="w-3.5 h-3.5 text-blue-600" /></button><button onClick={() => remove(u.id)} className="p-1 rounded hover:bg-red-50"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <div className="text-center py-8 text-slate-400">Belum ada akun.</div>}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: totalPages }, (_, i) => <button key={i} onClick={() => setPage(i + 1)} className={`px-3 py-1 text-sm rounded-lg ${page === i + 1 ? 'bg-blue-600 text-white' : 'border hover:bg-slate-100'}`}>{i + 1}</button>)}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
            <h3 className="text-lg font-bold p-6 pb-0 flex-shrink-0">{editId ? 'Edit Akun' : 'Tambah Akun'}</h3>
            <div className="overflow-y-auto flex-1 p-6 space-y-3">
              <div><label className="text-sm font-medium text-slate-600 mb-1 block">Username</label><input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="text-sm font-medium text-slate-600 mb-1 block">{editId ? 'Password (kosongkan jika tidak diubah)' : 'Password'}</label><input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="text-sm font-medium text-slate-600 mb-1 block">Role</label><select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm"><option value="admin">admin</option><option value="superadmin">superadmin</option></select></div>
              {form.role === 'admin' && (
                <div><label className="text-sm font-medium text-slate-600 mb-1 block">Periode</label><select value={form.assigned_period} onChange={e => setForm({ ...form, assigned_period: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">{periods.map((p: any) => <option key={p.label} value={p.label}>{p.label} - {p.display_name}</option>)}</select></div>
              )}
            </div>
            <div className="flex gap-2 justify-end p-6 pt-0 flex-shrink-0"><button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">Batal</button><button onClick={save} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">{saving ? '...' : 'Simpan'}</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
