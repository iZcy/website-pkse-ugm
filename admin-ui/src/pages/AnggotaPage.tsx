import { useState, useEffect, useCallback } from 'react'
import { usePeriod } from '../components/AdminLayout'
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'
import ImageUpload from '../components/ImageUpload'

export default function AnggotaPage() {
  const { period } = usePeriod()
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState('')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState<Record<string, string>>({})

  const fields = ['full_name','nickname','department','program_studi','fakultas','angkatan','position','phone','nim','photo_url']
  const labels: Record<string,string> = { full_name:'Nama Lengkap', nickname:'Panggilan', department:'Departemen', program_studi:'Program Studi', fakultas:'Fakultas', angkatan:'Angkatan', position:'Posisi', phone:'Telepon', nim:'NIM', photo_url:'Foto URL' }

  const load = useCallback(async () => {
    try {
      const data = await apiGet(`/api/cms/members?period=${period}&per_page=300`)
      setMembers(data.items || data || [])
    } catch { setMembers([]) }
    setLoading(false)
  }, [period])

  useEffect(() => { load() }, [load])

  function openAdd() { setEditId(''); setForm({}); setShowModal(true) }
  function openEdit(m: any) { setEditId(m.id); setForm(Object.fromEntries(fields.map(f => [f, m[f] || '']))); setShowModal(true) }

  async function save() {
    setSaving(true)
    try {
      const body = { ...form, period_label: period }
      if (editId) await apiPut(`/api/cms/members/${editId}`, body)
      else await apiPost('/api/cms/members', body)
      setShowModal(false); load()
    } catch (e: any) { alert(e.message) }
    setSaving(false)
  }

  async function remove(id: string) {
    if (!confirm('Hapus anggota ini?')) return
    await apiDelete(`/api/cms/members/${id}`)
    load()
  }

  const filtered = search ? members.filter((m: any) => (m.full_name || '').toLowerCase().includes(search.toLowerCase())) : members

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-slate-800">Anggota ({members.length})</h2>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} className="pl-9 pr-3 py-2 border rounded-lg text-sm w-56" placeholder="Cari..." />
          </div>
          <button onClick={openAdd} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"><Plus className="w-4 h-4" /> Tambah</button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr><th className="text-left px-4 py-2">Nama</th><th className="text-left px-4 py-2">Departemen</th><th className="text-left px-4 py-2">Angkatan</th><th className="text-left px-4 py-2">NIM</th><th className="px-4 py-2 w-24"></th></tr>
          </thead>
          <tbody>
            {filtered.map((m: any) => (
              <tr key={m.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    {m.photo_url ? <img src={m.photo_url} className="w-8 h-8 rounded-full object-cover" alt="" /> : <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">{(m.full_name || '?')[0]}</div>}
                    <div><div className="font-medium">{m.full_name}</div><div className="text-xs text-slate-400">{m.nickname}</div></div>
                  </div>
                </td>
                <td className="px-4 py-2 text-slate-600">{m.department}</td>
                <td className="px-4 py-2 text-slate-600">{m.angkatan}</td>
                <td className="px-4 py-2 text-slate-500 text-xs">{m.nim}</td>
                <td className="px-4 py-2">
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(m)} className="p-1.5 rounded hover:bg-slate-100"><Pencil className="w-3.5 h-3.5 text-slate-500" /></button>
                    <button onClick={() => remove(m.id)} className="p-1.5 rounded hover:bg-red-50"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <div className="text-center py-8 text-slate-400">Memuat...</div>}
        {!loading && !filtered.length && <div className="text-center py-8 text-slate-400">Tidak ada anggota</div>}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <h3 className="text-lg font-bold text-slate-800 p-6 pb-0 flex-shrink-0">{editId ? 'Edit Anggota' : 'Tambah Anggota'}</h3>
            <div className="overflow-y-auto flex-1 p-6 space-y-3">
              {fields.map(f => (
                <div key={f}><label className="text-sm font-medium text-slate-700">{labels[f]}</label>
                  {f === 'photo_url' ? (
                    <ImageUpload value={form[f] || ''} onChange={(url) => setForm({...form, [f]: url})} />
                  ) : (
                    <input value={form[f] || ''} onChange={e => setForm({...form, [f]: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder={labels[f]} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-end p-6 pt-0 flex-shrink-0">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">Batal</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">{saving ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
