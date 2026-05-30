import { useState, useEffect, useCallback } from 'react'
import { usePeriod } from '../components/AdminLayout'
import { apiGet, apiPut } from '../lib/api'
import { Save, Plus, Trash2 } from 'lucide-react'

export default function TentangPage() {
  const { period } = usePeriod()
  const [data, setData] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    try { const d = await apiGet(`/api/cms/period-about?period=${period}`); setData(d || {}) } catch { setData({}) }
    setLoading(false)
  }, [period])
  useEffect(() => { load() }, [load])

  function setGallery(items: any[]) { setData({ ...data, gallery_items: items }) }
  function addGallery() { setGallery([...(data.gallery_items || []), { title: '', image_url: '', caption: '' }]) }
  function removeGallery(i: number) { setGallery((data.gallery_items || []).filter((_: any, j: number) => j !== i)) }
  function updateGallery(i: number, f: string, v: string) {
    const g = [...(data.gallery_items || [])]; g[i] = { ...g[i], [f]: v }; setGallery(g)
  }

  async function save() {
    setSaving(true)
    try {
      await apiPut(`/api/cms/period-about?period=${period}`, data)
      setMsg('Tersimpan!'); setTimeout(() => setMsg(''), 2000)
    } catch (e: any) { alert(e.message) }
    setSaving(false)
  }

  if (loading) return <div className="text-slate-400 text-center py-8">Memuat...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-slate-800">Tentang Periode</h2>
        <div className="flex items-center gap-3">
          {msg && <span className="text-sm text-green-600">{msg}</span>}
          <button onClick={save} disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"><Save className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Simpan'}</button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-white rounded-xl border p-6">
          <label className="text-sm font-medium text-slate-700 block mb-2">Tentang (HTML)</label>
          <textarea value={data.tentang || ''} onChange={e => setData({ ...data, tentang: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm font-mono h-32" placeholder="<p>...</p>" />
        </div>
        <div className="bg-white rounded-xl border p-6">
          <label className="text-sm font-medium text-slate-700 block mb-2">Visi</label>
          <textarea value={data.visi || ''} onChange={e => setData({ ...data, visi: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm h-20" />
        </div>
        <div className="bg-white rounded-xl border p-6">
          <label className="text-sm font-medium text-slate-700 block mb-2">Misi</label>
          <textarea value={data.misi || ''} onChange={e => setData({ ...data, misi: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm h-20" />
        </div>

        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-slate-700">Galeri ({ (data.gallery_items || []).length } item)</label>
            <button onClick={addGallery} className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-100"><Plus className="w-3 h-3 inline" /> Tambah</button>
          </div>
          <div className="space-y-3">
            {(data.gallery_items || []).map((item: any, i: number) => (
              <div key={i} className="flex gap-2 items-start bg-slate-50 rounded-lg p-3">
                {item.image_url && <img src={item.image_url} className="w-16 h-16 rounded object-cover" alt="" />}
                <div className="flex-1 space-y-2">
                  <input value={item.title || ''} onChange={e => updateGallery(i, 'title', e.target.value)} placeholder="Judul" className="w-full border rounded px-2 py-1 text-sm" />
                  <input value={item.image_url || ''} onChange={e => updateGallery(i, 'image_url', e.target.value)} placeholder="URL Gambar" className="w-full border rounded px-2 py-1 text-sm" />
                  <input value={item.caption || ''} onChange={e => updateGallery(i, 'caption', e.target.value)} placeholder="Caption" className="w-full border rounded px-2 py-1 text-sm" />
                </div>
                <button onClick={() => removeGallery(i)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
