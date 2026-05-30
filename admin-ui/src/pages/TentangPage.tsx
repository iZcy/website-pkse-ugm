import { useState, useEffect, useCallback } from "react"

import { usePeriod } from '../components/AdminLayout'
import { apiGet, apiPut } from '../lib/api'
import { Save, Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import ImageUpload from '../components/ImageUpload'
import ReactQuill from 'react-quill-new'
import 'react-quill-new/dist/quill.snow.css'

const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link', 'clean'],
  ],
}

export default function TentangPage() {
  const { period } = usePeriod()
  const [data, setData] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    try { const d = await apiGet(`/api/cms/period-about?period=${period}`); setData(d || {}) } catch { setData({ period_label: period }) }
    setLoading(false)
  }, [period])
  useEffect(() => { load() }, [load])

  function setField(f: string, v: any) { setData({ ...data, [f]: v }) }

  const gallery: any[] = data.gallery_items || data.gallery || []
  function setGallery(items: any[]) { setField('gallery_items', items); setField('gallery', items) }
  function addGalleryItem() { setGallery([...gallery, { title: '', image_url: '', caption: '' }]) }
  function removeGalleryItem(i: number) { setGallery(gallery.filter((_: any, j: number) => j !== i)) }
  function updateGalleryItem(i: number, f: string, v: string) {
    const g = [...gallery]; g[i] = { ...g[i], [f]: v }; setGallery(g)
  }
  function moveGalleryItem(i: number, dir: number) {
    const g = [...gallery]
    const j = i + dir
    if (j < 0 || j >= g.length) return;
    [g[i], g[j]] = [g[j], g[i]]
    setGallery(g)
  }

  async function save() {
    setSaving(true)
    try {
      await apiPut(`/api/cms/period-about?period=${period}`, { ...data, gallery_items: gallery })
      setMsg('Tersimpan!'); setTimeout(() => setMsg(''), 2000)
    } catch (e: any) { alert(e.message) }
    setSaving(false)
  }

  if (loading) return <div className="text-slate-400 text-center py-8">Memuat...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4 sticky top-0 bg-slate-100 z-10 py-2">
        <h2 className="text-2xl font-bold text-slate-800">Tentang Periode</h2>
        <div className="flex items-center gap-3">
          {msg && <span className="text-sm text-green-600">{msg}</span>}
          <button onClick={save} disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"><Save className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Simpan'}</button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Tagline */}
        <div className="bg-white rounded-xl border p-6 space-y-3">
          <h3 className="font-semibold text-slate-700">Tagline</h3>
          <div><label className="text-sm font-medium text-slate-600">Judul Tagline</label><input value={data.tagline_title || ''} onChange={e => setField('tagline_title', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Judul tagline periode" /></div>
          <div><label className="text-sm font-medium text-slate-600">Subtitle Tagline</label><input value={data.tagline_subtitle || ''} onChange={e => setField('tagline_subtitle', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Subtitle" /></div>
          <div><label className="text-sm font-medium text-slate-600">Deskripsi Tagline</label><textarea value={data.tagline_description || ''} onChange={e => setField('tagline_description', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm h-20" placeholder="Deskripsi singkat" /></div>
        </div>

        {/* Images */}
        <div className="bg-white rounded-xl border p-6 space-y-3">
          <h3 className="font-semibold text-slate-700">Gambar</h3>
          <div><label className="text-sm font-medium text-slate-600">Cover Image</label><ImageUpload value={data.cover_image_url || ''} onChange={url => setField('cover_image_url', url)} /></div>
          <div><label className="text-sm font-medium text-slate-600">Struktur Organisasi</label><ImageUpload value={data.hierarchy_image_url || ''} onChange={url => setField('hierarchy_image_url', url)} placeholder="URL Gambar Struktur" /></div>
          <div><label className="text-sm font-medium text-slate-600">Logo Kabinet</label><ImageUpload value={data.logo_kabinet_url || ''} onChange={url => setField('logo_kabinet_url', url)} placeholder="URL Logo Kabinet" /></div>
        </div>

        {/* Rich Text Editors */}
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h3 className="font-semibold text-slate-700">Sejarah / Tentang</h3>
          <ReactQuill value={data.sejarah || data.tentang || ''} onChange={v => { setField('sejarah', v); setField('tentang', v) }} theme="snow" modules={quillModules} className="bg-white" />
        </div>
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h3 className="font-semibold text-slate-700">Visi</h3>
          <ReactQuill value={data.visi || ''} onChange={v => setField('visi', v)} theme="snow" modules={quillModules} className="bg-white" />
        </div>
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h3 className="font-semibold text-slate-700">Misi</h3>
          <ReactQuill value={data.misi || ''} onChange={v => setField('misi', v)} theme="snow" modules={quillModules} className="bg-white" />
        </div>

        {/* Gallery */}
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-700">Galeri ({gallery.length} item)</h3>
            <button onClick={addGalleryItem} className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-100"><Plus className="w-3 h-3 inline" /> Tambah</button>
          </div>
          <div className="space-y-3">
            {gallery.map((item: any, i: number) => (
              <div key={i} className="flex gap-2 items-start bg-slate-50 rounded-lg p-3">
                <div className="flex flex-col gap-1 flex-shrink-0">
                  <button onClick={() => moveGalleryItem(i, -1)} className="p-0.5 hover:bg-slate-200 rounded" title="Naik"><ChevronUp className="w-3.5 h-3.5" /></button>
                  <button onClick={() => moveGalleryItem(i, 1)} className="p-0.5 hover:bg-slate-200 rounded" title="Turun"><ChevronDown className="w-3.5 h-3.5" /></button>
                </div>
                {item.image_url ? <img src={item.image_url} className="w-16 h-16 rounded object-cover flex-shrink-0" alt="" /> : <div className="w-16 h-16 rounded bg-slate-200 flex-shrink-0" />}
                <div className="flex-1 space-y-2">
                  <input value={item.title || ''} onChange={e => updateGalleryItem(i, 'title', e.target.value)} placeholder="Judul" className="w-full border rounded px-2 py-1 text-sm" />
                  <ImageUpload value={item.image_url || ''} onChange={url => updateGalleryItem(i, 'image_url', url)} />
                  <input value={item.caption || ''} onChange={e => updateGalleryItem(i, 'caption', e.target.value)} placeholder="Caption" className="w-full border rounded px-2 py-1 text-sm" />
                </div>
                <button onClick={() => removeGalleryItem(i)} className="p-1 text-red-500 hover:bg-red-50 rounded flex-shrink-0"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
