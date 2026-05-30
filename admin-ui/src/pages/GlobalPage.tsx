import { useState, useEffect, useCallback } from 'react'
import { usePeriod } from '../components/AdminLayout'
import { apiGet, apiPut } from '../lib/api'
import { Pencil } from 'lucide-react'
import ImageUpload from '../components/ImageUpload'

interface GlobalSetting {
  org_name: string
  logo_url: string
  logo_university_url: string
  logo_yayasan_url: string
  footer_text: string
}

const empty = (): GlobalSetting => ({ org_name: '', logo_url: '', logo_university_url: '', logo_yayasan_url: '', footer_text: '' })

export default function GlobalPage() {
  const { period } = usePeriod()
  const [data, setData] = useState<GlobalSetting>(empty())
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<GlobalSetting>(empty())

  const load = useCallback(async () => {
    try {
      const res = await apiGet(`/api/cms/global-setting?period=${period}`)
      setData(res || empty())
    } catch { setData(empty()) }
    setLoading(false)
  }, [period])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    setSaving(true)
    try {
      await apiPut('/api/cms/global-setting', form)
      setData({ ...form })
      setShowModal(false)
    } catch { /* handled */ }
    setSaving(false)
  }

  const urlFields = new Set(['logo_url', 'logo_university_url', 'logo_yayasan_url'])

  const fields: { key: keyof GlobalSetting; label: string }[] = [
    { key: 'org_name', label: 'Nama Organisasi' },
    { key: 'logo_url', label: 'Logo URL' },
    { key: 'logo_university_url', label: 'Logo Universitas URL' },
    { key: 'logo_yayasan_url', label: 'Logo Yayasan URL' },
    { key: 'footer_text', label: 'Footer Text' },
  ]

  if (loading) return <div className="p-6 text-slate-500">Loading...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Pengaturan Global</h2>
        <button onClick={() => { setForm({ ...data }); setShowModal(true) }} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-blue-700">
          <Pencil className="w-4 h-4" /> Edit
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-left">
            <tr>
              <th className="px-5 py-3 font-medium">Key</th>
              <th className="px-5 py-3 font-medium">Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {fields.map(({ key, label }) => (
              <tr key={key} className="hover:bg-slate-50">
                <td className="px-5 py-3 text-slate-500 font-medium">{label}</td>
                <td className="px-5 py-3 text-slate-800 break-all">{data[key] || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <h3 className="text-lg font-bold text-slate-800 p-6 pb-0 flex-shrink-0">Edit Pengaturan Global</h3>
            <div className="overflow-y-auto flex-1 p-6 space-y-3">
              {fields.map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-slate-600 mb-1">{label}</label>
                  {urlFields.has(key) ? (
                    <ImageUpload value={form[key] || ''} onChange={(url) => setForm({ ...form, [key]: url })} />
                  ) : (
                    <input value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-end p-6 pt-0 flex-shrink-0">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">Batal</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
