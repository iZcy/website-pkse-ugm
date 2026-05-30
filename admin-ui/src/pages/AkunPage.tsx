import { useState, useEffect, useCallback } from 'react'
import { usePeriod } from '../components/AdminLayout'
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api'
import { Plus, Pencil, Trash2 } from 'lucide-react'

export default function AkunPage() {
  usePeriod()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ username: '', password: '', role: 'admin', accessible_periods: '' })

  const load = useCallback(async () => {
    try { const d = await apiGet('/api/cms/accounts'); setItems(d.items || d || []) } catch { setItems([]) }
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  function openAdd() { setEditId(''); setForm({ username: '', password: '', role: 'admin', accessible_periods: '' }); setShowModal(true) }
  function openEdit(a: any) { setEditId(a.id); setForm({ username: a.username || '', password: '', role: a.role || 'admin', accessible_periods: (a.accessible_periods || []).join(',') }) }

  async function save() {
    if (!form.username) return alert('Username wajib')
    setSaving(true)
    try {
      const body: any = { ...form, accessible_periods: form.accessible_periods.split(',').map((s: string) => s.trim()).filter(Boolean) }
      if (!editId && !form.password) return alert('Password wajib untuk akun baru')
      if (editId) await apiPut(`/api/cms/accounts/${editId}`, body)
      else await apiPost('/api/cms/accounts', body)
      setShowModal(false); load()
    } catch (e: any) { alert(e.message) }
    setSaving(false)
  }

  async function remove(id: string) { if (!confirm('Hapus akun ini?')) return; await apiDelete(`/api/cms/accounts/${id}`); load() }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Manajemen Akun</h2>
        <button onClick={openAdd} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"><Plus className="w-4 h-4" /> Tambah</button>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600"><tr><th className="text-left px-4 py-2">Username</th><th className="text-left px-4 py-2">Role</th><th className="text-left px-4 py-2">Periode</th><th className="px-4 py-2 w-24"></th></tr></thead>
          <tbody>
            {items.map((a: any) => (
              <tr key={a.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-2 font-medium">{a.username}</td>
                <td className="px-4 py-2"><span className={`text-xs px-2 py-0.5 rounded-full ${a.role === 'superadmin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{a.role}</span></td>
                <td className="px-4 py-2 text-xs text-slate-500">{(a.accessible_periods || []).join(', ')}</td>
                <td className="px-4 py-2"><div className="flex gap-1"><button onClick={() => openEdit(a)} className="p-1.5 rounded hover:bg-slate-100"><Pencil className="w-3.5 h-3.5 text-slate-500" /></button><button onClick={() => remove(a.id)} className="p-1.5 rounded hover:bg-red-50"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <div className="text-center py-8 text-slate-400">Memuat...</div>}
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">{editId ? 'Edit' : 'Tambah'} Akun</h3>
            <div className="space-y-3">
              <div><label className="text-sm font-medium">Username</label><input value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="text-sm font-medium">{editId ? 'Password (kosongkan jika tidak diubah)' : 'Password'}</label><input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="text-sm font-medium">Role</label><select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm"><option value="admin">admin</option><option value="superadmin">superadmin</option></select></div>
              <div><label className="text-sm font-medium">Periode (pilah koma)</label><input value={form.accessible_periods} onChange={e => setForm({...form, accessible_periods: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
            </div>
            <div className="flex gap-2 justify-end mt-4"><button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">Batal</button><button onClick={save} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">{saving ? '...' : 'Simpan'}</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
