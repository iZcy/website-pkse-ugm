import { useState, useEffect, useCallback } from 'react'
import { usePeriod } from '../components/AdminLayout'
import { apiGet, apiPut } from '../lib/api'
import { Save, Plus, Trash2, ImageIcon, ChevronUp, ChevronDown } from 'lucide-react'
import ImageUpload from '../components/ImageUpload'

export default function GaleriPage() {
  const { period } = usePeriod()
  const [gallery, setGallery] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    try {
      const d = await apiGet(`/api/cms/period-about?period=${period}`)
      setGallery(d?.gallery_items || [])
    } catch { setGallery([]) }
    setLoading(false)
  }, [period])
  useEffect(() => { load() }, [load])

  function add() { setGallery([...gallery, { title: '', image_url: '', caption: '' }]) }
  function remove(i: number) { setGallery(gallery.filter((_: any, j: number) => j !== i)) }
  function update(i: number, f: string, v: string) {
    const g = [...gallery]; g[i] = { ...g[i], [f]: v }; setGallery(g)
  }
  function moveGalleryItem(i: number, dir: number) {
    const newIdx = i + dir
    if (newIdx < 0 || newIdx >= gallery.length) return
    const g = [...gallery]; [g[i], g[newIdx]] = [g[newIdx], g[i]]; setGallery(g)
  }

  async function save() {
    setSaving(true)
    try {
      const current = await apiGet(`/api/cms/period-about?period=${period}`).catch(() => ({}))
      await apiPut(`/api/cms/period-about?period=${period}`, { ...current, gallery_items: gallery })
      setMsg('Galeri tersimpan!'); setTimeout(() => setMsg(''), 2000)
    } catch (e: any) { alert(e.message) }
    setSaving(false)
  }

  if (loading) return <div className="text-slate-400 text-center py-8">Memuat...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Galeri Periode</h2>
        <div className="flex items-center gap-3">
          {msg && <span className="text-sm text-green-600">{msg}</span>}
          <button onClick={add} className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-100"><Plus className="w-3 h-3 inline" /> Tambah</button>
          <button onClick={save} disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"><Save className="w-4 h-4" /> Simpan</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {gallery.length === 0 && <div className="col-span-full text-center py-16 text-slate-400"><ImageIcon className="w-12 h-12 mx-auto mb-3" /> Belum ada item galeri</div>}
        {gallery.map((item: any, i: number) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {item.image_url ? (
              <img src={item.image_url} className="w-full h-40 object-cover" alt="" />
            ) : (
              <div className="w-full h-40 bg-slate-100 flex items-center justify-center text-slate-300"><ImageIcon className="w-8 h-8" /></div>
            )}
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex gap-0.5">
                  <button onClick={() => moveGalleryItem(i, -1)} className="p-1 rounded hover:bg-slate-100" title="Naik"><ChevronUp className="w-3 h-3" /></button>
                  <button onClick={() => moveGalleryItem(i, 1)} className="p-1 rounded hover:bg-slate-100" title="Turun"><ChevronDown className="w-3 h-3" /></button>
                </div>
              </div>
              <input value={item.title || ''} onChange={e => update(i, 'title', e.target.value)} placeholder="Judul foto" className="w-full border rounded px-2 py-1 text-sm" />
              <ImageUpload value={item.image_url || ''} onChange={(url) => update(i, 'image_url', url)} />
              <input value={item.caption || ''} onChange={e => update(i, 'caption', e.target.value)} placeholder="Caption" className="w-full border rounded px-2 py-1 text-sm" />
              <button onClick={() => remove(i)} className="text-xs text-red-500 hover:bg-red-50 px-2 py-1 rounded"><Trash2 className="w-3 h-3 inline mr-1" /> Hapus</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
