import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPut } from '../lib/api'
import { Save } from 'lucide-react'
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

export default function GlobalPage() {
  const [data, setData] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    try { const d = await apiGet('/api/cms/global-setting'); setData(d || {}) } catch { setData({}) }
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  function setF(f: string, v: any) { setData({ ...data, [f]: v }) }

  async function save() {
    setSaving(true)
    try { await apiPut('/api/cms/global-setting', data); setMsg('Tersimpan!'); setTimeout(() => setMsg(''), 2000) }
    catch (e: any) { alert(e.message) }
    setSaving(false)
  }

  if (loading) return <div className="text-slate-400 text-center py-8">Memuat...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4 sticky top-0 bg-slate-100 z-10 py-2">
        <h2 className="text-2xl font-bold text-slate-800">Pengaturan Global</h2>
        <div className="flex items-center gap-3">
          {msg && <span className="text-sm text-green-600">{msg}</span>}
          <button onClick={save} disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"><Save className="w-4 h-4" /> Simpan</button>
        </div>
      </div>

      <div className="space-y-4 max-w-3xl">
        {/* Organization */}
        <Section title="Organisasi">
          <Field label="Nama Organisasi"><input value={data.org_name || ''} onChange={e => setF('org_name', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" /></Field>
          <Field label="Tentang (HTML)"><ReactQuill value={data.about_html || ''} onChange={(v: string) => setF('about_html', v)} theme="snow" modules={quillModules} className="bg-white" /></Field>
        </Section>

        {/* Logos */}
        <Section title="Logo">
          <Field label="Logo Utama"><ImageUpload value={data.logo_url || ''} onChange={url => setF('logo_url', url)} /></Field>
          <Field label="Logo Universitas"><ImageUpload value={data.logo_university_url || ''} onChange={url => setF('logo_university_url', url)} /></Field>
          <Field label="Logo Yayasan"><ImageUpload value={data.logo_yayasan_url || ''} onChange={url => setF('logo_yayasan_url', url)} /></Field>
        </Section>

        {/* Hero / Header */}
        <Section title="Header & Hero">
          <Field label="Header Title"><input value={data.header_title || ''} onChange={e => setF('header_title', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" /></Field>
          <Field label="Header Subtitle"><input value={data.header_subtitle || ''} onChange={e => setF('header_subtitle', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" /></Field>
          <Field label="Hero Badge"><input value={data.hero_badge || ''} onChange={e => setF('hero_badge', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" /></Field>
          <Field label="Hero Title Main"><input value={data.hero_title_main || ''} onChange={e => setF('hero_title_main', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" /></Field>
          <Field label="Hero Title Accent"><input value={data.hero_title_accent || ''} onChange={e => setF('hero_title_accent', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" /></Field>
        </Section>

        {/* Footer */}
        <Section title="Footer">
          <Field label="Footer Title"><input value={data.footer_title || ''} onChange={e => setF('footer_title', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" /></Field>
          <Field label="Footer Copy"><input value={data.footer_copy || ''} onChange={e => setF('footer_copy', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" /></Field>
          <Field label="Footer Text"><textarea value={data.footer_text || ''} onChange={e => setF('footer_text', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm h-20" /></Field>
        </Section>

        {/* Social Media */}
        <Section title="Social Media">
          <Field label="Instagram"><input value={data.social_media?.instagram || ''} onChange={e => setF('social_media', { ...data.social_media, instagram: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="@paguyubankseugm" /></Field>
          <Field label="Twitter / X"><input value={data.social_media?.twitter || ''} onChange={e => setF('social_media', { ...data.social_media, twitter: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" /></Field>
          <Field label="Facebook"><input value={data.social_media?.facebook || ''} onChange={e => setF('social_media', { ...data.social_media, facebook: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" /></Field>
          <Field label="YouTube"><input value={data.social_media?.youtube || ''} onChange={e => setF('social_media', { ...data.social_media, youtube: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" /></Field>
          <Field label="LinkedIn"><input value={data.social_media?.linkedin || ''} onChange={e => setF('social_media', { ...data.social_media, linkedin: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" /></Field>
          <Field label="TikTok"><input value={data.social_media?.tiktok || ''} onChange={e => setF('social_media', { ...data.social_media, tiktok: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" /></Field>
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border p-6">
      <h3 className="font-semibold text-slate-700 mb-3">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-600 mb-1 block">{label}</label>
      {children}
    </div>
  )
}
