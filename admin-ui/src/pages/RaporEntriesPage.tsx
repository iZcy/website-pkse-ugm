import { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { usePeriod } from '../components/AdminLayout'
import { Member, RaporInstance, RaporEntry, apiGet, apiPost } from '../lib/api'
import { Save, ArrowLeft } from 'lucide-react'

const DEFAULT_ASPECTS = [
  { label: 'Kedisiplinan & Komitmen', desc: 'Kehadiran dan keteraturan mengikuti kegiatan' },
  { label: 'Keaktifan', desc: 'Partisipasi aktif dalam kegiatan organisasi' },
  { label: 'Tanggung Jawab', desc: 'Pemenuhan tugas dan kewajiban' },
  { label: 'Kerjasama', desc: 'Kemampuan bekerja dalam tim' },
  { label: 'Inisiatif', desc: 'Proaktif dalam kontribusi dan ide' },
]

export default function RaporEntriesPage() {
  const { period } = usePeriod()
  const [searchParams] = useSearchParams()
  const instanceId = searchParams.get('instance_id') || ''
  const [_inst, setInstance] = useState<RaporInstance | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [entries, setEntries] = useState<RaporEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [status, setStatus] = useState('')
  const [aspectEditing, setAspectEditing] = useState(false)
  const [aspects, setAspects] = useState<any[]>(DEFAULT_ASPECTS)

  const load = useCallback(async () => {
    if (!instanceId) { setLoading(false); return }
    try {
      const [inst, mem, ent] = await Promise.all([
        apiGet(`/api/cms/rapor-instances/${instanceId}`),
        apiGet(`/api/cms/members?period=${period}&per_page=1000`),
        apiGet(`/api/cms/rapor-entries?instance_id=${instanceId}`),
      ])
      setInstance(inst as any)
      const memberList = ((mem as any).items || mem || [])
      setMembers(memberList.sort((a: any, b: any) => (a.department || '').localeCompare(b.department || '')))
      setEntries((ent as any).items || ent || [])

      if (inst.score_aspects && inst.score_aspects.length > 0) {
        setAspects(inst.score_aspects.map((a: any) => ({ label: a.aspect || a.label, desc: a.desc || '' })))
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [instanceId, period])
  useEffect(() => { load() }, [load])

  function getEntry(memberId: string) {
    return entries.find((e: any) => {
      const mid = typeof e.member_id === 'object' ? (e.member_id.$oid || e.member_id) : e.member_id
      return mid === memberId
    })
  }

  function memberIdStr(m: Member) {
    return typeof m.id === 'object' ? ((m.id as any).$oid || m.id as string) : m.id
  }

  async function saveEntry(memberId: string) {
    setSaving(memberId)
    const row = document.querySelector(`[data-member="${memberId}"]`)?.closest('[data-row]') as HTMLElement
    if (!row) { setSaving(null); return }
    try {
      const scores = aspects.map((_, i) => {
        const inp = row.querySelector(`[data-idx="${i}"]`) as HTMLInputElement
        return parseInt(inp.value) || 0
      })
      const fb = row.querySelector('[data-field="feedback"]') as HTMLInputElement
      const result = await apiPost('/api/cms/rapor-entries', {
        instance_id: instanceId, member_id: memberId, period_label: period,
        scores, feedback: fb?.value || '', published: false,
      })
      const idx = entries.findIndex((e: any) => {
        const mid = typeof e.member_id === 'object' ? (e.member_id.$oid || e.member_id) : e.member_id
        return mid === memberId
      })
      const updated = [...entries]
      if (idx >= 0) updated[idx] = result
      else updated.push(result)
      setEntries(updated)
      setStatus('Tersimpan')
      setTimeout(() => setStatus(''), 2000)
    } catch (e: unknown) { alert((e as Error).message) }
    setSaving(null)
  }

  async function saveAll() {
    const rows = document.querySelectorAll('[data-row]')
    let saved = 0
    for (const row of rows) {
      const memberId = (row as HTMLElement).dataset.row || ''
      try {
        const scores = aspects.map((_, i) => {
          const inp = row.querySelector(`[data-idx="${i}"]`) as HTMLInputElement
          return parseInt(inp.value) || 0
        })
        const fb = row.querySelector('[data-field="feedback"]') as HTMLInputElement
        await apiPost('/api/cms/rapor-entries', {
          instance_id: instanceId, member_id: memberId, period_label: period,
          scores, feedback: fb?.value || '', published: false,
        })
        saved++
      } catch { /* skip */ }
    }
    setStatus(`Tersimpan ${saved} dari ${rows.length}`)
    setTimeout(() => setStatus(''), 3000)
    load()
  }

  async function saveAspects() {
    try {
      await fetch(`/api/cms/rapor-instances/${instanceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score_aspects: aspects.map((a: any) => ({ aspect: a.label, desc: a.desc })) }),
        credentials: 'same-origin',
      })
      setAspectEditing(false)
      setStatus('Aspek penilaian tersimpan!')
      setTimeout(() => setStatus(''), 2000)
    } catch (e: any) { alert(e.message) }
  }

  const groupedMembers = new Map<string, Member[]>()
  for (const m of members) {
    const dept = m.department || 'Tanpa Kementerian'
    if (!groupedMembers.has(dept)) groupedMembers.set(dept, [])
    groupedMembers.get(dept)!.push(m)
  }

  if (loading) return <div className="text-slate-400 text-center py-8">Memuat...</div>
  if (!instanceId) return <div className="text-red-500 text-center py-8">instance_id tidak ditemukan</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <Link to={`/rapor?period=${period}`} className="text-blue-600 text-sm hover:underline mb-1 inline-block">
            <ArrowLeft className="w-3.5 h-3.5 inline mr-1" /> Kembali
          </Link>
          <h2 className="text-2xl font-bold text-slate-800">Isi Nilai Rapor</h2>
        </div>
        <div className="flex gap-2 items-center">
          <button onClick={() => setAspectEditing(true)} className="text-xs text-blue-600 hover:underline">{aspects.length} aspek</button>
          <button onClick={saveAll} className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
            <Save className="w-4 h-4" /> Simpan Semua
          </button>
        </div>
      </div>

      {status && <div className="mb-3 px-4 py-2 rounded-lg text-sm bg-green-50 text-green-700">{status}</div>}

      {/* Aspect header bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 mb-3 sticky top-0 z-10">
        <div className="grid grid-cols-[2fr_repeat(auto-fit,minmax(0,1fr))] gap-2 items-center">
          <div className="text-xs font-semibold text-slate-400 px-2">Nama</div>
          {aspects.map((a: any, i: number) => (
            <div key={i} className="text-xs font-semibold text-slate-400 text-center truncate" title={a.desc}>
              {a.label}
            </div>
          ))}
          <div className="w-20"></div>
        </div>
      </div>

      {[...groupedMembers.entries()].map(([dept, deptMembers]) => (
        <div key={dept} className="mb-4">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-2 px-1">{dept} ({deptMembers.length})</h3>
          <div className="space-y-2">
            {deptMembers.map(m => {
              const mid = memberIdStr(m)
              const ent = getEntry(mid)
              const scores = ent ? ent.scores : aspects.map(() => 0)
              const feedback = ent?.feedback || ''
              const token = ent?.token || ''
              return (
                <div key={mid} data-row={mid} className="bg-white rounded-xl border border-slate-200 p-3">
                  <div className="grid grid-cols-[2fr_repeat(auto-fit,minmax(0,1fr))] gap-2 items-center">
                    <div className="flex items-center gap-2 min-w-0">
                      {m.photo_url ? <img src={m.photo_url} className="w-7 h-7 rounded-full object-cover flex-shrink-0" alt="" /> : <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold flex-shrink-0">{(m.full_name || '?')[0]}</div>}
                      <div className="text-sm text-slate-800 truncate">{m.full_name}</div>
                    </div>
                    {aspects.map((_, i) => (
                      <input key={i} type="number" data-idx={i} defaultValue={scores[i] || 0} min={0} max={5} className="score-input mx-auto" />
                    ))}
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => saveEntry(mid)} disabled={saving === mid} className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">{saving === mid ? '...' : 'Simpan'}</button>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <input type="text" data-field="feedback" defaultValue={feedback} className="flex-1 border border-slate-200 rounded px-2 py-1 text-xs" placeholder="Feedback..." />
                  </div>
                  {token && (
                    <div className="text-xs text-slate-400 mt-1">
                      Link: <input type="text" value={`https://pkseugm.web.id/rapor/t/${token}`} className="text-blue-500 bg-slate-50 border-none px-1 w-56 text-xs" readOnly onFocus={e => e.target.select()} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Aspect editing modal */}
      {aspectEditing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setAspectEditing(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto p-6">
            <h3 className="text-lg font-bold mb-4">Edit Aspek Penilaian</h3>
            <div className="space-y-3">
              {aspects.map((a: any, i: number) => (
                <div key={i} className="flex gap-2 items-start">
                  <span className="text-xs text-slate-400 pt-2">{i + 1}</span>
                  <div className="flex-1 space-y-1">
                    <input value={a.label} onChange={e => { const n = [...aspects]; n[i] = { ...n[i], label: e.target.value }; setAspects(n) }} className="w-full border rounded px-2 py-1 text-sm" placeholder="Nama aspek" />
                    <input value={a.desc} onChange={e => { const n = [...aspects]; n[i] = { ...n[i], desc: e.target.value }; setAspects(n) }} className="w-full border rounded px-2 py-1 text-xs" placeholder="Deskripsi" />
                  </div>
                  {aspects.length > 1 && (
                    <button onClick={() => setAspects(aspects.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 text-xs pt-2">✕</button>
                  )}
                </div>
              ))}
              <button onClick={() => setAspects([...aspects, { label: '', desc: '' }])} className="text-xs text-blue-600 hover:underline">+ Tambah aspek</button>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setAspectEditing(false)} className="px-4 py-2 border rounded-lg text-sm">Batal</button>
              <button onClick={saveAspects} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Simpan Aspek</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
