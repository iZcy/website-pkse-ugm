import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost, apiDelete } from '../lib/api'
import { Plus, Trash2, Copy, Check } from 'lucide-react'

export default function ShortlinkPage() {

  const [items, setItems] = useState<any[]>([])

  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [form, setForm] = useState({ target_url: '', label: '', code: '' })
  const [copied, setCopied] = useState('')

  const load = useCallback(async () => {
    try {
      const data = await apiGet(`/api/cms/shortlinks?page=${page}&per_page=20&search=${encodeURIComponent(search)}`)
      setItems(data.items || [])
      setTotalPages(data.pages || 1)
    } catch { setItems([]) }
  }, [page, search])

  useEffect(() => { load() }, [load])

  function openAdd() { setForm({ target_url: '', label: '', code: '' }); setShowModal(true) }

  async function save() {
    if (!form.target_url) return alert('Target URL wajib diisi')
    setSaving(true)
    try {
      await apiPost('/api/cms/shortlinks', form)
      setShowModal(false); setPage(1); load()
    } catch (e: any) { alert(e.message) }
    setSaving(false)
  }

  async function remove(id: string) {
    if (!confirm('Hapus shortlink ini?')) return
    await apiDelete(`/api/cms/shortlinks/${id}`); load()
  }

  async function copyCode(code: string) {
    const url = `https://pkseugm.web.id/l/${code}`
    await navigator.clipboard.writeText(url)
    setCopied(code)
    setTimeout(() => setCopied(''), 2000)
  }

  function shortlinkURL(code: string) { return `https://pkseugm.web.id/l/${code}` }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-slate-800">Shortlink</h2>
        <button onClick={openAdd} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"><Plus className="w-4 h-4" /> Tambah Shortlink</button>
      </div>

      <div className="mb-4">
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Cari shortlink..." className="border rounded-lg px-3 py-2 text-sm w-64" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-4 py-2 w-12">#</th>
              <th className="text-left px-4 py-2">Label</th>
              <th className="text-left px-4 py-2">Short URL</th>
              <th className="text-left px-4 py-2">Target URL</th>
              <th className="px-4 py-2 w-28"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it: any, i: number) => {
              const url = shortlinkURL(it.code || it.short_code)
              return (
                <tr key={it.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-400 text-center">{(page - 1) * 20 + i + 1}</td>
                  <td className="px-4 py-3 font-medium text-slate-700">{it.label || '-'}</td>
                  <td className="px-4 py-3">
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">{url}</a>
                  </td>
                  <td className="px-4 py-3 text-slate-600 break-all max-w-xs">{it.target_url || ''}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => copyCode(it.code || it.short_code)} className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1 rounded flex items-center gap-1">
                        {copied === (it.code || it.short_code) ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                      </button>
                      <button onClick={() => remove(it.id)} className="text-xs bg-red-50 hover:bg-red-100 text-red-700 px-2 py-1 rounded"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {items.length === 0 && <div className="text-center py-8 text-slate-400">Belum ada shortlink.</div>}
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
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
            <h3 className="text-lg font-bold p-6 pb-0 flex-shrink-0">Tambah Shortlink</h3>
            <div className="overflow-y-auto flex-1 p-6 space-y-3">
              <div><label className="text-sm font-medium">Target URL</label><input value={form.target_url} onChange={e => setForm({...form, target_url: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="https://..." /></div>
              <div><label className="text-sm font-medium">Label</label><input value={form.label} onChange={e => setForm({...form, label: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="text-sm font-medium">Custom Code (opsional)</label><input value={form.code} onChange={e => setForm({...form, code: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
            </div>
            <div className="flex gap-2 justify-end p-6 pt-0 flex-shrink-0"><button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">Batal</button><button onClick={save} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">{saving ? '...' : 'Simpan'}</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
