import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { usePeriod } from '../components/AdminLayout'
import { RaporInstance, apiGet, apiPost, apiPut, apiDelete } from '../lib/api'
import { Plus, Eye, Trash2, Send, Settings, Weight } from 'lucide-react'

export default function RaporPage() {
  const { period } = usePeriod()
  const [instances, setInstances] = useState<RaporInstance[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showAspects, setShowAspects] = useState(false)
  const [showWeights, setShowWeights] = useState(false)
  const [weightInst, setWeightInst] = useState<RaporInstance | null>(null)
  const [title, setTitle] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [saving, setSaving] = useState(false)
  const [globalAspects, setGlobalAspects] = useState<any[]>([])
  const [aspectsSaving, setAspectsSaving] = useState(false)
  const [wHadir, setWHadir] = useState('2')
  const [wIzin, setWIzin] = useState('1')
  const [wAbsen, setWAbsen] = useState('0')

  const load = useCallback(async () => {
    try {
      const [data, gs] = await Promise.all([
        apiGet(`/api/cms/rapor-instances?period=${period}`),
        apiGet('/api/cms/global-setting'),
      ])
      setInstances(data.items || data || [])
      setGlobalAspects((gs?.score_aspects || gs?.ScoreAspects || []).map((a: any) => ({ label: a.aspect || a.label || '', desc: a.desc || '', kind: a.kind || 'numeric', min: a.min ?? 0, max: a.max ?? 5 })))
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
        score_aspects: globalAspects.map((a: any) => ({ aspect: a.aspect || a.label, desc: a.desc, kind: a.kind, min: a.min, max: a.max })),
      })
      setShowCreate(false); setTitle(''); setStart(''); setEnd('')
      load()
    } catch (e: unknown) { alert((e as Error).message) }
    setSaving(false)
  }

  async function saveAspects() {
    setAspectsSaving(true)
    try {
      await apiPut('/api/cms/global-setting', { score_aspects: globalAspects.map((a: any) => ({ aspect: a.aspect || a.label, desc: a.desc, kind: a.kind, min: a.min, max: a.max })) })
      setShowAspects(false)
      load()
    } catch (e: any) { alert(e.message) }
    setAspectsSaving(false)
  }

  function openWeights(inst: RaporInstance) {
    setWeightInst(inst)
    const w = inst.attendance_weights || { hadir: 2, izin: 1, absen: 0 }
    setWHadir(String(w.hadir ?? 2))
    setWIzin(String(w.izin ?? 1))
    setWAbsen(String(w.absen ?? 0))
    setShowWeights(true)
  }

  async function saveWeights() {
    if (!weightInst) return
    setSaving(true)
    try {
      await apiPut(`/api/cms/rapor-instances/${weightInst.id}`, {
        ...weightInst,
        attendance_weights: { hadir: Number(wHadir) || 0, izin: Number(wIzin) || 0, absen: Number(wAbsen) || 0 }
      })
      setShowWeights(false); setWeightInst(null)
      load()
    } catch (e: any) { alert(e.message) }
    setSaving(false)
  }

  async function publish(id: string) {
    if (!confirm('Publish rapor ini?')) return
    await apiPut(`/api/cms/rapor-instances/${id}/publish`)
    load()
  }

  async function unpublish(id: string) {
    if (!confirm('Batalkan publish rapor ini?')) return
    await apiPut(`/api/cms/rapor-instances/${id}/unpublish`)
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
        <div className="flex gap-2">
          <button onClick={() => setShowAspects(true)} className="bg-white text-slate-700 px-4 py-2 rounded-lg text-sm font-medium border flex items-center gap-2">
            <Settings className="w-4 h-4" /> Template Aspek ({globalAspects.length})
          </button>
          <button onClick={() => setShowCreate(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" /> Buat Rapor Baru
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {instances.length === 0 && <div className="text-slate-400 text-center py-8">Belum ada rapor</div>}
        {instances.map(inst => (
          <div key={inst.id} className="bg-white rounded-xl border border-slate-200 p-5 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-800">{inst.title}</h3>
              <p className="text-sm text-slate-500 mt-1">Absensi: {fmtDate(inst.activity_start)} — {fmtDate(inst.activity_end)}</p>
              <p className={`text-xs mt-1 ${inst.published ? 'text-green-600' : 'text-amber-600'}`}>{inst.published ? '✓ Sudah dipublikasi' : '⏳ Draft'}</p>
            </div>
            <div className="flex items-center gap-2">
              <Link to={`/rapor/entries?period=${period}&instance_id=${inst.id}`} className="px-3 py-1.5 text-sm bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 text-nowrap">
                <Eye className="w-3.5 h-3.5 inline mr-1" /> Isi Nilai
              </Link>
              <button onClick={() => openWeights(inst)} className="px-3 py-1.5 text-sm bg-slate-50 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 text-nowrap">
                <Weight className="w-3.5 h-3.5 inline mr-1" /> Bobot
              </button>
              {inst.published ? (
                <button onClick={() => unpublish(inst.id)} className="px-3 py-1.5 text-sm bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 text-nowrap">
                  Unpublish
                </button>
              ) : (
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <h3 className="text-lg font-bold p-6 pb-0 flex-shrink-0">Buat Rapor Baru</h3>
            <div className="overflow-y-auto flex-1 p-6 space-y-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Judul Rapor</label><input value={title} onChange={e => setTitle(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Mulai Absensi</label><input type="date" value={start} onChange={e => setStart(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Akhir Absensi</label><input type="date" value={end} onChange={e => setEnd(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
              </div>
              <p className="text-xs text-slate-400">Aspek penilaian akan diambil dari Template Aspek global ({globalAspects.length} aspek). Edit via tombol "Template Aspek".</p>
            </div>
            <div className="flex justify-end gap-2 p-6 pt-0 flex-shrink-0">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-slate-50">Batal</button>
              <button onClick={create} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">{saving ? 'Membuat...' : 'Buat'}</button>
            </div>
          </div>
        </div>
      )}

      {showAspects && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setShowAspects(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <h3 className="text-lg font-bold p-6 pb-0 flex-shrink-0">Edit Template Aspek Penilaian</h3>
            <div className="overflow-y-auto flex-1 p-6 space-y-3">
              <p className="text-xs text-slate-400 mb-2">Aspek ini berlaku global. Rapor baru akan mewarisi template ini.</p>
              {globalAspects.map((a, i) => (
                <div key={i} className="flex gap-2 items-start bg-slate-50 rounded-lg p-2">
                  <span className="text-xs text-slate-400 pt-2">{i + 1}</span>
                  <div className="flex-1 space-y-1">
                    <input value={a.label || ''} onChange={e => { const n = [...globalAspects]; n[i] = { ...n[i], label: e.target.value }; setGlobalAspects(n) }} className="w-full border rounded px-2 py-1 text-sm" placeholder="Nama aspek" />
                    <input value={a.desc || ''} onChange={e => { const n = [...globalAspects]; n[i] = { ...n[i], desc: e.target.value }; setGlobalAspects(n) }} className="w-full border rounded px-2 py-1 text-xs" placeholder="Deskripsi" />
                  </div>
                  <select value={a.kind || 'numeric'} onChange={e => { const n = [...globalAspects]; n[i] = { ...n[i], kind: e.target.value }; setGlobalAspects(n) }} className="text-xs border rounded px-1 py-1">
                    <option value="numeric">Angka</option>
                    <option value="descriptive">Teks</option>
                  </select>
                  {a.kind !== 'descriptive' && (
                    <div className="flex gap-1 items-center">
                      <input type="number" value={a.min ?? 0} onChange={e => { const n = [...globalAspects]; n[i] = { ...n[i], min: parseInt(e.target.value) || 0 }; setGlobalAspects(n) }} className="w-12 border rounded px-1 py-0.5 text-xs" placeholder="Min" />
                      <span className="text-xs text-slate-300">-</span>
                      <input type="number" value={a.max ?? 5} onChange={e => { const n = [...globalAspects]; n[i] = { ...n[i], max: parseInt(e.target.value) || 5 }; setGlobalAspects(n) }} className="w-12 border rounded px-1 py-0.5 text-xs" placeholder="Max" />
                    </div>
                  )}
                  {globalAspects.length > 1 && <button onClick={() => setGlobalAspects(globalAspects.filter((_, j) => j !== i))} className="text-red-400 text-xs pt-2">✕</button>}
                </div>
              ))}
              <button onClick={() => setGlobalAspects([...globalAspects, { label: '', desc: '', kind: 'numeric', min: 0, max: 5 }])} className="text-xs text-blue-600 hover:underline">+ Tambah aspek</button>
            </div>
            <div className="flex justify-end gap-2 p-6 pt-0 flex-shrink-0">
              <button onClick={() => setShowAspects(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-slate-50">Batal</button>
              <button onClick={saveAspects} disabled={aspectsSaving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">{aspectsSaving ? 'Menyimpan...' : 'Simpan Template'}</button>
            </div>
          </div>
        </div>
      )}

      {showWeights && weightInst && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setShowWeights(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold mb-4">Bobot Kehadiran — {weightInst.title}</h3>
            <p className="text-xs text-slate-400 mb-4">Nilai yang diberikan per status kehadiran. Skor akhir = (total / max) × 100%</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-sm w-20 text-rapor-700 font-medium">Hadir</span>
                <input type="number" step="0.5" value={wHadir} onChange={e => setWHadir(e.target.value)} className="w-24 border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm w-20 text-gold-600 font-medium">Izin</span>
                <input type="number" step="0.5" value={wIzin} onChange={e => setWIzin(e.target.value)} className="w-24 border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm w-20 text-red-500 font-medium">Absen</span>
                <input type="number" step="0.5" value={wAbsen} onChange={e => setWAbsen(e.target.value)} className="w-24 border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowWeights(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-slate-50">Batal</button>
              <button onClick={saveWeights} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">{saving ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
