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
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  // Nested children fire dragenter/dragleave pairs; count depth so the
  // highlight only clears when the pointer really leaves the component.
  const dragDepth = useRef(0)

  async function uploadFile(file: File) {
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

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    await uploadFile(file)
    // allow re-selecting the same file later
    if (fileRef.current) fileRef.current.value = ''
  }

  // ── Drag & drop (ported from old pickerDragOver / pickerDragLeave / pickerDrop) ──
  function onDragEnter(e: React.DragEvent) {
    e.preventDefault()
    dragDepth.current += 1
    setDragOver(true)
  }
  function onDragOver(e: React.DragEvent) {
    e.preventDefault()
    if (!dragOver) setDragOver(true)
  }
  function onDragLeave(e: React.DragEvent) {
    e.preventDefault()
    dragDepth.current = Math.max(0, dragDepth.current - 1)
    if (dragDepth.current === 0) setDragOver(false)
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    dragDepth.current = 0
    setDragOver(false)
    if (uploading) return
    const file = e.dataTransfer.files?.[0]
    if (file) uploadFile(file)
  }

  return (
    <div
      className={`space-y-2 rounded-lg transition ${dragOver ? 'outline-dashed outline-2 outline-offset-2 outline-blue-500 bg-blue-50' : ''}`}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
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
        {dragOver ? (
          <div className="flex-1 border border-dashed border-blue-400 rounded-lg px-3 py-1.5 text-sm flex items-center gap-2 text-blue-600 bg-blue-50 pointer-events-none">
            <Upload className="w-4 h-4" /> Lepaskan gambar di sini
          </div>
        ) : uploading ? (
          <div className="flex-1 border rounded-lg px-3 py-1.5 text-sm flex items-center gap-2 text-blue-600 bg-slate-50">
            <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
          </div>
        ) : mode === 'url' ? (
          <input value={value} onChange={e => onChange(e.target.value)} className="flex-1 border rounded-lg px-3 py-1.5 text-sm" placeholder={placeholder} title="Anda juga bisa seret gambar ke sini" />
        ) : (
          <label className="flex-1 border rounded-lg px-3 py-1.5 text-sm cursor-pointer bg-slate-50 hover:bg-slate-100 flex items-center gap-2 text-slate-500">
            <Upload className="w-4 h-4" /> Pilih atau seret gambar...
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
          </label>
        )}
      </div>
    </div>
  )
}
