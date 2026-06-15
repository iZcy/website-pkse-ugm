import { useState, useEffect, useCallback, useRef } from 'react'
import { usePeriod } from '../components/AdminLayout'
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'
import ImageUpload from '../components/ImageUpload'

function SuggestInput({ value, onChange, placeholder, suggestions }: { value: string; onChange: (v: string) => void; placeholder: string; suggestions: string[] }) {
  const [show, setShow] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setShow(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const filtered = value.length >= 1 ? suggestions.filter(s => s.toLowerCase().includes(value.toLowerCase()) && s.toLowerCase() !== value.toLowerCase()).slice(0, 5) : []
  return (
    <div ref={ref} className="relative">
      <input value={value} onChange={e => { onChange(e.target.value); setShow(true) }} onFocus={() => setShow(true)} placeholder={placeholder} className="w-full border rounded-lg px-3 py-2 text-sm" />
      {show && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 bg-white border border-slate-200 rounded-b-lg shadow-lg max-h-40 overflow-y-auto">
          {filtered.map(s => <div key={s} onClick={() => { onChange(s); setShow(false) }} className="px-3 py-1.5 cursor-pointer hover:bg-blue-50 text-sm border-b border-slate-50 last:border-0">{s}</div>)}
        </div>
      )}
    </div>
  )
}

export default function AnggotaPage() {
  const { period } = usePeriod()
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState('')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [periods, setPeriods] = useState<any[]>([])
  const [allMembers, setAllMembers] = useState<any[]>([])
  const [form, setForm] = useState<any>({})
  const [activePeriods, setActivePeriods] = useState<Record<string,string>>({})

  const prodiSuggestions = [...new Set(allMembers.map((m: any) => m.program_studi).filter(Boolean))].sort()
  const fakultasSuggestions = [...new Set(allMembers.map((m: any) => m.fakultas).filter(Boolean))].sort()

  const load = useCallback(async () => {
    try {
      const data = await apiGet(`/api/cms/members?period=${period}&page=${page}&per_page=20&search=${encodeURIComponent(search)}`)
      setMembers(data.items || [])
      setTotalPages(data.pages || 1)
    } catch { setMembers([]) }
    setLoading(false)
  }, [period, page, search])

  useEffect(() => {
    load()
    apiGet('/api/cms/periods').then(d => setPeriods(d||[])).catch(()=>{})
    apiGet(`/api/cms/members?period=${period}&per_page=500`).then((d:any) => setAllMembers(d.items||[])).catch(()=>{})
  }, [load, period])

  function openAdd() {
    setEditId('')
    setForm({ full_name: '', nickname: '', program_studi: '', fakultas: '', angkatan: '', phone: '', nim: '', photo_url: '', cover_url: '', position: '' })
    const ap: Record<string,string> = {}
    periods.forEach((p: any) => { if (p.label === period) ap[period] = (p.sub_periods || ['Gelombang 1'])[0] })
    setActivePeriods(ap)
    setShowModal(true)
  }

  function openEdit(m: any) {
    setEditId(m.id)
    setForm({ full_name: m.full_name || '', nickname: m.nickname || '', program_studi: m.program_studi || '', fakultas: m.fakultas || '', angkatan: m.angkatan || '', phone: m.phone || '', nim: m.nim || '', photo_url: m.photo_url || '', cover_url: m.cover_url || '', position: m.position || '' })
    const ap: Record<string,string> = {}
    if (m.active_periods) { Object.entries(m.active_periods).forEach(([k, v]) => { ap[k] = v as string }) }
    setActivePeriods(ap)
    setShowModal(true)
  }

  async function save() {
    const required = ['full_name', 'nickname', 'program_studi', 'fakultas', 'angkatan', 'phone', 'nim', 'photo_url']
    for (const f of required) {
      if (!form[f]?.trim()) return alert(`Field "${f}" wajib diisi`)
    }
    if (Object.keys(activePeriods).length === 0) return alert('Pilih minimal satu periode aktif')
    setSaving(true)
    try {
      const body: any = { ...form, period_label: period, active_periods: activePeriods }
      if (editId) await apiPut(`/api/cms/members/${editId}`, body)
      else await apiPost('/api/cms/members', body)
      setShowModal(false); load()
    } catch (e: any) { alert(e.message) }
    setSaving(false)
  }

  async function remove(id: string) {
    if (!confirm('Hapus anggota ini?')) return
    await apiDelete(`/api/cms/members/${id}`); load()
  }

  if (loading) return <div className="text-slate-400 text-center py-8">Memuat...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-slate-800">Anggota</h2>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} className="pl-9 pr-3 py-2 border rounded-lg text-sm w-56" placeholder="Cari..." />
          </div>
          <button onClick={openAdd} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"><Plus className="w-4 h-4" /> Tambah</button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 w-10">No.</th>
              <th className="px-4 py-3 w-14">Foto</th>
              <th className="text-left px-4 py-3">Nama</th>
              <th className="text-left px-4 py-3">Profil</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">No. HP</th>
              <th className="text-left px-4 py-3 whitespace-nowrap">Penempatan Saat Ini</th>
              <th className="px-4 py-3 w-24">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m: any, mi: number) => (
              <tr key={m.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-400 text-center">{(page - 1) * 20 + mi + 1}</td>
                <td className="px-4 py-3">
                  {m.photo_url ? <img loading="lazy" src={`${m.photo_url}?size=thumb`} className="w-10 h-10 rounded-full object-cover" alt="" /> : <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 text-xs">N/A</div>}
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-800">{m.full_name}</div>
                  {m.nickname && <div className="text-xs text-slate-400">{m.nickname}</div>}
                </td>
                <td className="px-4 py-3 text-slate-600 text-xs">
                  <div>{m.program_studi || '-'}</div>
                  <div className="text-slate-400">{m.fakultas || '-'}{m.angkatan ? ' · ' + m.angkatan : ''}</div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {m.active_periods?.[period]
                    ? <div className="flex items-center gap-1"><span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Aktif</span><span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full whitespace-nowrap">{m.active_periods[period]}</span></div>
                    : <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Tidak aktif</span>}
                </td>
                <td className="px-4 py-3 text-slate-600 text-xs font-mono">{m.phone || <span className="text-slate-300">-</span>}</td>
                <td className="px-4 py-3 text-slate-600 text-sm">
                  {m.department ? <div>{m.department}</div> : <div className="text-amber-600 text-xs">Belum ditempatkan</div>}
                  {m.position && <div className="text-xs text-slate-400">{m.position}</div>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(m)} className="p-1 rounded hover:bg-slate-100"><Pencil className="w-3.5 h-3.5 text-blue-600" /></button>
                    <button onClick={() => remove(m.id)} className="p-1 rounded hover:bg-red-50"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {members.length === 0 && <div className="text-center py-8 text-slate-400">Tidak ada data</div>}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: totalPages }, (_, i) => (
            <button key={i} onClick={() => setPage(i + 1)} className={`px-3 py-1 text-sm rounded-lg ${page === i + 1 ? 'bg-blue-600 text-white' : 'border hover:bg-slate-100'}`}>{i + 1}</button>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <h3 className="text-lg font-bold p-6 pb-0 flex-shrink-0">{editId ? 'Edit Anggota' : 'Tambah Anggota'}</h3>
            <div className="overflow-y-auto flex-1 p-6 space-y-3">
              <Field label="Nama Lengkap *"><input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" /></Field>
              <Field label="Panggilan *"><input value={form.nickname} onChange={e => setForm({ ...form, nickname: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" /></Field>
              <Field label="Program Studi *"><SuggestInput value={form.program_studi} onChange={v => setForm({ ...form, program_studi: v })} placeholder="Program Studi" suggestions={prodiSuggestions} /></Field>
              <Field label="Fakultas *"><SuggestInput value={form.fakultas} onChange={v => setForm({ ...form, fakultas: v })} placeholder="Fakultas" suggestions={fakultasSuggestions} /></Field>
              <Field label="Angkatan *"><input value={form.angkatan} onChange={e => setForm({ ...form, angkatan: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="2023" /></Field>
              <Field label="No. HP *"><input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="08xxxxxxxxxx" /></Field>
              <Field label="NIM *"><input value={form.nim} onChange={e => setForm({ ...form, nim: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" /></Field>
              {periods.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-slate-600 mb-1 block">Aktif per Periode/Sub-Periode *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {periods.map((p: any) => (
                      <div key={p.label} className="border border-slate-200 rounded-lg p-2 bg-slate-50">
                        <div className="text-xs text-slate-600 mb-1">{p.display_name || p.label}</div>
                        <select value={activePeriods[p.label] || ''} onChange={e => { const n={...activePeriods}; if (e.target.value) n[p.label]=e.target.value; else delete n[p.label]; setActivePeriods(n) }} className="w-full border rounded px-2 py-1 text-xs">
                          <option value="">Tidak aktif</option>
                          {(p.sub_periods||['Gelombang 1']).map((sp: string) => <option key={sp} value={sp}>{sp}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <Field label="Posisi (dikelola via Kementerian)">
                <input value={form.position || ''} disabled className="w-full border rounded-lg px-3 py-2 text-sm bg-slate-100 text-slate-400" placeholder="Atur di tab Kementerian" />
              </Field>
              <Field label="Foto *"><ImageUpload value={form.photo_url} onChange={url => setForm({ ...form, photo_url: url })} /></Field>
              <Field label="Cover (opsional)"><ImageUpload value={form.cover_url} onChange={url => setForm({ ...form, cover_url: url })} placeholder="URL Cover" /></Field>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="text-sm font-medium text-slate-600 mb-1 block">{label}</label>{children}</div>
}
