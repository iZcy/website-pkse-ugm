import { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { usePeriod } from '../components/AdminLayout'
import { Member, RaporInstance, RaporEntry, apiGet, apiPost } from '../lib/api'
import { Save, ArrowLeft } from 'lucide-react'

const ASPECTS = ['Kedisiplinan', 'Keaktifan', 'Tanggung Jawab', 'Kerjasama', 'Inisiatif']

export default function RaporEntriesPage() {
  const { period } = usePeriod()
  const [searchParams] = useSearchParams()
  const instanceId = searchParams.get('instance_id') || ''
  const [instance, setInstance] = useState<RaporInstance | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [entries, setEntries] = useState<RaporEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [status, setStatus] = useState('')

  const load = useCallback(async () => {
    if (!instanceId) { setLoading(false); return }
    try {
      const [inst, mem, ent] = await Promise.all([
        apiGet(`/api/cms/rapor-instances/${instanceId}`),
        apiGet(`/api/cms/members?period=${period}&per_page=200`),
        apiGet(`/api/cms/rapor-entries?instance_id=${instanceId}`),
      ])
      setInstance(inst)
      setMembers((mem as any).items || mem || [])
      setEntries((ent as any).items || ent || [])
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
      const scores = ASPECTS.map((_, i) => {
        const inp = row.querySelector(`[data-idx="${i}"]`) as HTMLInputElement
        return parseInt(inp.value) || 0
      })
      const fb = row.querySelector('[data-field="feedback"]') as HTMLInputElement
      const result = await apiPost('/api/cms/rapor-entries', {
        instance_id: instanceId,
        member_id: memberId,
        period_label: period,
        scores,
        feedback: fb?.value || '',
        published: false,
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
        const scores = ASPECTS.map((_, i) => {
          const inp = row.querySelector(`[data-idx="${i}"]`) as HTMLInputElement
          return parseInt(inp.value) || 0
        })
        const fb = row.querySelector('[data-field="feedback"]') as HTMLInputElement
        await apiPost('/api/cms/rapor-entries', {
          instance_id: instanceId,
          member_id: memberId,
          period_label: period,
          scores,
          feedback: fb?.value || '',
          published: false,
        })
        saved++
      } catch { /* skip */ }
    }
    setStatus(`Tersimpan ${saved} dari ${rows.length}`)
    setTimeout(() => setStatus(''), 3000)
    load()
  }

  function fmtDate(d: string) {
    return d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'
  }

  if (loading) return <div className="text-slate-400 text-center py-8">Memuat...</div>
  if (!instanceId) return <div className="text-red-500 text-center py-8">instance_id tidak ditemukan</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <Link to={`/admin/rapor?period=${period}`} className="text-blue-600 text-sm hover:underline mb-1 inline-block">
            <ArrowLeft className="w-3.5 h-3.5 inline mr-1" /> Kembali ke daftar rapor
          </Link>
          <h2 className="text-2xl font-bold text-slate-800">Isi Nilai Rapor</h2>
        </div>
        <div className="text-sm text-slate-500">
          {instance?.title} · {fmtDate(instance?.activity_start || '')} — {fmtDate(instance?.activity_end || '')}
        </div>
      </div>

      {status && <div className="mb-3 px-4 py-2 rounded-lg text-sm bg-green-50 text-green-700">{status}</div>}

      <div className="flex justify-end mb-3">
        <button onClick={saveAll} className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
          <Save className="w-4 h-4" /> Simpan Semua
        </button>
      </div>

      <div className="space-y-3">
        {members.map(m => {
          const mid = memberIdStr(m)
          const ent = getEntry(mid)
          const scores = ent ? ent.scores : [0, 0, 0, 0, 0]
          const feedback = ent?.feedback || ''
          const token = ent?.token || ''
          const published = ent?.published || false

          return (
            <div key={mid} data-row={mid} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {m.photo_url ? (
                    <img src={m.photo_url} className="w-10 h-10 rounded-full object-cover bg-slate-100" alt="" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-bold">
                      {(m.full_name || '?')[0]}
                    </div>
                  )}
                  <div>
                    <div className="font-medium text-slate-800">{m.full_name || '-'}</div>
                    <div className="text-xs text-slate-500">{m.department || '-'}{m.nim ? ` · ${m.nim}` : ''}</div>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${published ? 'text-green-600 bg-green-50' : 'text-amber-600 bg-amber-50'}`}>
                  {published ? 'Published' : 'Draft'}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
                {ASPECTS.map((a, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <span className="text-xs text-slate-400 w-20 truncate">{a}</span>
                    <input type="number" data-idx={i} defaultValue={scores[i]} min={0} max={5} className="score-input" />
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="text" data-field="feedback" defaultValue={feedback} className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm" placeholder="Feedback / catatan..." />
                <button onClick={() => saveEntry(mid)} disabled={saving === mid} className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1">
                  <Save className="w-3 h-3" /> {saving === mid ? '...' : 'Simpan'}
                </button>
              </div>
              {token && (
                <div className="text-xs text-slate-400 mt-2">
                  Link: <input type="text" value={`https://pkseugm.web.id/rapor/t/${token}`} className="text-blue-500 bg-slate-50 border-none px-1 w-72 text-xs" readOnly onFocus={e => e.target.select()} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
