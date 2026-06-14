import { useState, useRef } from 'react'
import { Upload, Link2, X, Loader2 } from 'lucide-react'

interface Props {
  value: string
  onChange: (url: string) => void
  placeholder?: string
}

export default function ImageUpload({ value, onChange, placeholder = 'URL Gambar' }: Props) {
  const [mode, setMode] = useState<'url' | 'upload'>('url')
  const [uploading, setUploading] = useState(false)
  const [previewError, setPreviewError] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/cms/upload', { method: 'POST', body: fd, credentials: 'same-origin' })
      const data = await res.json()
      if (data.url) {
        onChange(data.url)
        setPreviewError(false)
      } else {
        alert('Upload gagal: ' + (data.error || 'unknown'))
      }
    } catch (e: any) {
      alert('Upload error: ' + e.message)
    }
    setUploading(false)
  }

  return (
    <div className="space-y-2">
      {value && !previewError && (
        <div className="relative group w-full h-32 rounded-lg overflow-hidden bg-slate-100">
          <img loading="lazy" src={value} alt="" className="w-full h-full object-cover" onError={() => setPreviewError(true)} />
          <button type="button" onClick={() => onChange('')} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
      <div className="flex gap-2">
        <button type="button" onClick={() => setMode(mode === 'url' ? 'upload' : 'url')} className={`px-3 py-1.5 text-xs rounded-lg border flex-shrink-0 ${mode === 'url' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
          {mode === 'url' ? <><Link2 className="w-3 h-3 inline mr-1" />URL</> : <><Upload className="w-3 h-3 inline mr-1" />Upload</>}
        </button>
        {mode === 'url' ? (
          <input value={value} onChange={e => onChange(e.target.value)} className="flex-1 border rounded-lg px-3 py-1.5 text-sm" placeholder={placeholder} />
        ) : (
          <label className="flex-1 border rounded-lg px-3 py-1.5 text-sm cursor-pointer bg-slate-50 hover:bg-slate-100 flex items-center gap-2 text-slate-500">
            {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</> : <><Upload className="w-4 h-4" /> Pilih gambar...</>}
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
          </label>
        )}
      </div>
    </div>
  )
}
