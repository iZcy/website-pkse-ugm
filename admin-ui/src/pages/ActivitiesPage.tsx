import { useState, useEffect, useCallback } from 'react'
import { usePeriod } from '../components/AdminLayout'
import { Activity, Member, apiGet, apiPost, apiPut, apiDelete } from '../lib/api'
import { Plus } from 'lucide-react'

export default function ActivitiesPage() {
  const { period } = usePeriod()
  const [activities, setActivities] = useState<Activity[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [catFilter, setCatFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showAttendance, setShowAttendance] = useState(false)
  const [editId, setEditId] = useState('')
  const [name, setName] = useState('')
  const [category, setCategory] = useState('yayasan')
  const [date, setDate] = useState('')
  const [attActivity, setAttActivity] = useState<Activity | null>(null)
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  const cats = ['yayasan', 'paguyuban', 'lintas']
  const catBadge: Record<string, string> = { yayasan: 'bg-blue-600 text-white', paguyuban: 'bg-green-600 text-white', lintas: 'bg-purple-600 text-white' }
  const catCard: Record<string, string> = { yayasan: 'bg-blue-50 border-blue-200', paguyuban: 'bg-green-50 border-green-200', lintas: 'bg-purple-50 border-purple-200' }

  const loadActivities = useCallback(async () => {
    try {
      const data = await apiGet(`/api/cms/activities?period=${period}`)
      setActivities(data.items || data || [])
    } catch { setActivities([]) }
    setLoading(false)
  }, [period])

  const loadMembers = useCallback(async () => {
    try {
      const data = await apiGet(`/api/cms/members?period=${period}&per_page=200`)
      setMembers(data.items || data || [])
    } catch { setMembers([]) }
  }, [period])

  useEffect(() => { loadActivities(); loadMembers() }, [loadActivities, loadMembers])

  const filtered = catFilter ? activities.filter(a => a.category === catFilter) : activities

  function openAdd() { setEditId(''); setName(''); setCategory('yayasan'); setDate(''); setShowModal(true) }
  function openEdit(a: Activity) { setEditId(a.id); setName(a.name); setCategory(a.category); setDate(a.date?.slice(0, 10) || ''); setShowModal(true) }
  function openAttendance(a: Activity) { setAttActivity(a); setCheckedIds(new Set(a.attendee_ids || [])); setShowAttendance(true) }

  async function save() {
    if (!name || !date) return alert('Isi semua field')
    setSaving(true)
    try {
      const body = { period_label: period, name, category, date: date + 'T00:00:00Z' }
      if (editId) await apiPut(`/api/cms/activities/${editId}`, body)
      else await apiPost('/api/cms/activities', body)
      setShowModal(false)
      loadActivities()
    } catch (e: unknown) { alert((e as Error).message) }
    setSaving(false)
  }

  async function remove(id: string) {
    if (!confirm('Hapus aktivitas ini?')) return
    await apiDelete(`/api/cms/activities/${id}`)
    loadActivities()
  }

  async function saveAttendance() {
    if (!attActivity) return
    setSaving(true)
    try {
      await apiPut(`/api/cms/activities/${attActivity.id}/attendance`, { attendee_ids: [...checkedIds] })
      setShowAttendance(false)
      loadActivities()
    } catch (e: unknown) { alert((e as Error).message) }
    setSaving(false)
  }

  const memberIdStr = (m: Member) => m.id

  if (loading) return <div className="text-slate-400 text-center py-8">Memuat...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Kegiatan & Absensi</h2>
        <button onClick={openAdd} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
          <Plus className="w-4 h-4" /> Tambah Aktivitas
        </button>
      </div>

      <div className="mb-4 flex gap-2 flex-wrap">
        <button onClick={() => setCatFilter('')} className={`px-3 py-1.5 text-sm rounded-lg border ${!catFilter ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-300 hover:bg-slate-100'}`}>Semua</button>
        {cats.map(c => (
          <button key={c} onClick={() => setCatFilter(c)} className={`px-3 py-1.5 text-sm rounded-lg border capitalize ${catFilter === c ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-300 hover:bg-slate-100'}`}>{c}</button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && <div className="text-slate-400 text-center py-8">Belum ada aktivitas</div>}
        {filtered.map(a => (
          <div key={a.id} className={`rounded-xl border p-4 ${catCard[a.category] || 'bg-white border-slate-200'}`}>
            <div className="mb-3">
              <span className={`px-3 py-0.5 rounded-full text-xs font-medium capitalize ${catBadge[a.category] || ''}`}>{a.category}</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-slate-800">{a.name}</div>
                <div className="text-xs text-slate-500">{a.date ? new Date(a.date).toLocaleDateString('id-ID') : '-'} · {a.attendee_ids?.length || 0} hadir</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openAttendance(a)} className="text-xs px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 border border-green-200">Kehadiran</button>
                <button onClick={() => openEdit(a)} className="text-xs px-3 py-1.5 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200">Edit</button>
                <button onClick={() => remove(a.id)} className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-200">Hapus</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">{editId ? 'Edit Aktivitas' : 'Tambah Aktivitas'}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-slate-700">Nama Aktivitas</label>
                <input value={name} onChange={e => setName(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Rapat Pleno I" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Kategori</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                  {cats.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Tanggal</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm rounded-lg border hover:bg-slate-50">Batal</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700">{saving ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Modal */}
      {showAttendance && attActivity && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={e => e.target === e.currentTarget && setShowAttendance(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Kehadiran: {attActivity.name}</h3>
            <div className="overflow-y-auto flex-1 space-y-1 mb-4">
              {members.map(m => {
                const mid = memberIdStr(m)
                return (
                  <label key={mid} className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-slate-50 cursor-pointer">
                    <input type="checkbox" checked={checkedIds.has(mid)} onChange={() => {
                      const next = new Set(checkedIds)
                      next.has(mid) ? next.delete(mid) : next.add(mid)
                      setCheckedIds(next)
                    }} className="accent-blue-600 w-4 h-4" />
                    <span className="text-sm text-slate-700">{m.full_name}</span>
                    <span className="text-xs text-slate-400 ml-auto">{m.department || ''}</span>
                  </label>
                )
              })}
              {members.length === 0 && <div className="text-slate-400 text-sm">Tidak ada anggota</div>}
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowAttendance(false)} className="px-4 py-2 text-sm rounded-lg border hover:bg-slate-50">Tutup</button>
              <button onClick={saveAttendance} disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700">{saving ? 'Menyimpan...' : 'Simpan Kehadiran'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
