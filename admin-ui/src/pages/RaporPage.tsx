import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { usePeriod } from '../components/AdminLayout'
import { RaporInstance, apiGet, apiPost, apiPut, apiDelete } from '../lib/api'
import { Plus, Eye, Trash2, Send } from 'lucide-react'

export default function RaporPage() {
  const { period } = usePeriod()
  const [instances, setInstances] = useState<RaporInstance[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await apiGet(`/api/cms/rapor-instances?period=${period}`)
      setInstances(data.items || data || [])
    } catch { setInstances([]) }
    setLoading(false)
  }, [period])

  useEffect(() => { load() }, [load])

  function fmtDate(d: string) {
    return d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'
  }

  async function create() {
    if (!title || !start || !end) return alert('Semua field wajib diisi')
    setSaving(true)
    try {
      await apiPost('/api/cms/rapor-instances', {
        period_label: period, title,
        activity_start: start + 'T00:00:00Z',
        activity_end: end + 'T23:59:59Z',
      })
      setShowCreate(false)
      setTitle(''); setStart(''); setEnd('')
      load()
    } catch (e: unknown) { alert((e as Error).message) }
    setSaving(false)
  }

  async function publish(id: string) {
    if (!confirm('Publish rapor ini?')) return
    await apiPut(`/api/cms/rapor-instances/${id}/publish`)
    load()
  }

  async function remove(id: string) {
    if (!confirm('Hapus rapor ini beserta semua entri nilai?')) return
    await apiDelete(`/api/cms/rapor-instances/${id}`)
    load()
  }

  if (loading) return <div className="text-slate-400 text-center py-8">Memuat...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Rapor Beswan</h2>
        <button onClick={() => setShowCreate(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
          <Plus className="w-4 h-4" /> Buat Rapor Baru
        </button>
      </div>

      <div className="space-y-3">
        {instances.length === 0 && <div className="text-slate-400 text-center py-8">Belum ada rapor</div>}
        {instances.map(inst => (
          <div key={inst.id} className="bg-white rounded-xl border border-slate-200 p-5 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-800">{inst.title}</h3>
              <p className="text-sm text-slate-500 mt-1">Absensi: {fmtDate(inst.activity_start)} — {fmtDate(inst.activity_end)}</p>
              <p className={`text-xs mt-1 ${inst.published ? 'text-green-600' : 'text-amber-600'}`}>
                {inst.published ? '✓ Sudah dipublikasi' : '⏳ Draft'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link to={`/admin/rapor/entries?period=${period}&instance_id=${inst.id}`} className="px-3 py-1.5 text-sm bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 text-nowrap">
                <Eye className="w-3.5 h-3.5 inline mr-1" /> Isi Nilai
              </Link>
              {!inst.published && (
                <button onClick={() => publish(inst.id)} className="px-3 py-1.5 text-sm bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 text-nowrap">
                  <Send className="w-3.5 h-3.5 inline mr-1" /> Publish
                </button>
              )}
              <button onClick={() => remove(inst.id)} className="px-3 py-1.5 text-sm bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100">
                <Trash2 className="w-3.5 h-3.5 inline" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Buat Rapor Baru</h3>
            <div className="space-y-3">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Judul Rapor</label>
                <input value={title} onChange={e => setTitle(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Evaluasi Tengah Semester" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Mulai Absensi</label>
                  <input type="date" value={start} onChange={e => setStart(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Akhir Absensi</label>
                  <input type="date" value={end} onChange={e => setEnd(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-slate-600 border rounded-lg hover:bg-slate-50">Batal</button>
              <button onClick={create} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">{saving ? 'Membuat...' : 'Buat'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
