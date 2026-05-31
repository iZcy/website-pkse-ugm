import { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { usePeriod } from '../components/AdminLayout'
import { apiGet, apiPost } from '../lib/api'
import { Save, ArrowLeft, Search } from 'lucide-react'

const DEFAULT_ASPECTS = [
  { label: 'Kedisiplinan & Komitmen', desc: 'Kehadiran dan keteraturan', kind: 'numeric', min: 0, max: 5 },
  { label: 'Keaktifan', desc: 'Partisipasi aktif', kind: 'numeric', min: 0, max: 5 },
  { label: 'Tanggung Jawab', desc: 'Pemenuhan tugas', kind: 'numeric', min: 0, max: 5 },
  { label: 'Kerjasama', desc: 'Kemampuan bekerja dalam tim', kind: 'numeric', min: 0, max: 5 },
  { label: 'Inisiatif', desc: 'Proaktif dalam kontribusi', kind: 'descriptive', min: 0, max: 5 },
]

export default function RaporEntriesPage() {
  const { period } = usePeriod()
  const [searchParams] = useSearchParams()
  const instanceId = searchParams.get('instance_id') || ''
  const [_instance, setInstance] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [entries, setEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [savingAll, setSavingAll] = useState(false)
  const [status, setStatus] = useState('')
  const [aspectEditing, setAspectEditing] = useState(false)
  const [aspects, setAspects] = useState<any[]>(DEFAULT_ASPECTS)
  const [sliderVals, setSliderVals] = useState<Record<string,number>>({})
  const [activeDept, setActiveDept] = useState('__all__')
  const [searchQuery, setSearchQuery] = useState('')

  const load = useCallback(async () => {
    if (!instanceId) { setLoading(false); return }
    try {
      const [inst, mem, ent, depts] = await Promise.all([
        apiGet(`/api/cms/rapor-instances/${instanceId}`),
        apiGet(`/api/cms/members?period=${period}&per_page=200`),
        apiGet(`/api/cms/rapor-entries?instance_id=${instanceId}`),
        apiGet(`/api/cms/departments?period=${period}`),
      ])
      setInstance(inst)
      setMembers(Array.isArray(mem?.items) ? mem.items : Array.isArray(mem) ? mem : [])
      setEntries(Array.isArray(ent?.items) ? ent.items : Array.isArray(ent) ? ent : [])
      setDepartments(Array.isArray(depts) ? depts : [])
      if (inst?.score_aspects?.length > 0) {
        setAspects(inst.score_aspects.map((a: any) => ({
          label: a.aspect || a.label || '', desc: a.desc || '', kind: a.kind || 'numeric', min: a.min ?? 0, max: a.max ?? 5
        })))
      }
    } catch { setMembers([]); setEntries([]); setDepartments([]) }
    setLoading(false)
  }, [instanceId, period])
  useEffect(() => { load() }, [load])

  function getEntry(memberId: string) {
    return entries.find((e: any) => {
      const mid = typeof e.member_id === 'object' ? (e.member_id.$oid || e.member_id) : e.member_id
      return mid === memberId
    })
  }

  function memberIdStr(m: any) {
    return typeof m.id === 'object' ? ((m.id as any).$oid || m.id as string) : m.id
  }

  // Build department tree (parent_id → children)
  const deptMap: Record<string, any> = {}
  const topDepts: any[] = []
  for (const d of departments) { deptMap[d.id] = { ...d, children: [], members: [] }; }
  for (const d of departments) {
    const node = deptMap[d.id]
    if (d.parent_id && deptMap[d.parent_id]) deptMap[d.parent_id].children.push(node)
    else topDepts.push(node)
  }
  // Assign members to matching departments (case-insensitive)
  for (const m of members) {
    for (const d of departments) {
      if ((m.department || '').toLowerCase() === (d.name || '').toLowerCase()) {
        deptMap[d.id].members.push(m); break
      }
    }
  }
  const deptNamesLower = departments.map((d: any) => d.name.toLowerCase())
  const unassigned = members.filter((m: any) => !m.department || !deptNamesLower.includes(m.department.toLowerCase()))

  function filterMembers(list: any[]) {
    if (!searchQuery) return list
    const q = searchQuery.toLowerCase()
    return list.filter((m: any) => (m.full_name || '').toLowerCase().includes(q))
  }

  // Get visible members respecting the tree
  type Section = { dept: string; members: any[]; children: Section[] }
  function getSections(node: any): Section {
    const filtered = filterMembers(node.members || [])
    const childSections = (node.children || []).map(getSections)
    return { dept: node.name, members: filtered, children: childSections }
  }
  function flattenSections(sections: Section[]): { dept: string; members: any[]; isSub: boolean }[] {
    const out: any[] = []
    for (const s of sections) {
      out.push({ dept: s.dept, members: s.members, isSub: false })
      for (const c of s.children) {
        if (c.members.length > 0 || activeDept !== '__all__') out.push({ dept: c.dept, members: c.members, isSub: true })
      }
    }
    return out
  }

  let visibleMembers: { dept: string; members: any[]; isSub: boolean }[] = []
  if (activeDept === '__all__') {
    flattenSections(topDepts.map(getSections)).forEach(s => {
      if (s.members.length > 0) visibleMembers.push(s)
    })
    if (unassigned.length > 0) visibleMembers.push({ dept: 'Belum Ditempatkan', members: filterMembers(unassigned), isSub: false })
  } else {
    // Find the matching department and show it + its sub-departments
    const found = departments.find((d: any) => d.name === activeDept)
    if (found && deptMap[found.id]) {
      const section = getSections(deptMap[found.id])
      if (section.members.length > 0) visibleMembers.push({ dept: section.dept, members: section.members, isSub: false })
      for (const c of section.children) {
        visibleMembers.push({ dept: '— ' + c.dept, members: c.members, isSub: true })
      }
    } else if (activeDept === 'Belum Ditempatkan') {
      visibleMembers.push({ dept: 'Belum Ditempatkan', members: filterMembers(unassigned), isSub: false })
    }
  }

  async function saveEntry(memberId: string) {
    setSaving(memberId)
    const row = document.querySelector(`[data-member="${memberId}"]`)?.closest('[data-row]') as HTMLElement
    if (!row) { setSaving(null); return }
    try {
      const scores = aspects.map((a, i) => {
        const inp = row.querySelector(`[data-idx="${i}"]`) as HTMLInputElement | HTMLTextAreaElement
        return inp?.value || (a.kind === 'numeric' ? String(a.min ?? 0) : '')
      })
      const result = await apiPost('/api/cms/rapor-entries', {
        instance_id: instanceId, member_id: memberId, period_label: period,
        scores, published: false,
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
    setSavingAll(true)
    setStatus('')
    const rows = document.querySelectorAll('[data-row]')
    let saved = 0, failed = 0
    for (const row of rows) {
      const memberId = (row as HTMLElement).dataset.row || ''
      if (!memberId) continue
      try {
        const scores = aspects.map((a, i) => {
          const inp = row.querySelector(`[data-idx="${i}"]`) as HTMLInputElement | HTMLTextAreaElement
          return inp?.value || (a.kind === 'numeric' ? String(a.min ?? 0) : '')
        })
        await apiPost('/api/cms/rapor-entries', {
          instance_id: instanceId, member_id: memberId, period_label: period,
          scores, published: false,
        })
        saved++
        setStatus(`Menyimpan... ${saved}/${rows.length}`)
      } catch (e: any) { failed++; console.error('saveAll failed for', memberId, e.message) }
    }
    setStatus(`Tersimpan ${saved}${failed > 0 ? ', gagal ' + failed : ''} dari ${rows.length}`)
    setSavingAll(false)
    setTimeout(() => setStatus(''), 3000)
    load()
  }


  const totalMembers = members.length
  const deptTabs = [
    { key: '__all__', label: `Semua (${totalMembers})` },
    ...topDepts.map((d: any) => ({
      key: d.name, label: `${d.name} (${d.members.length + d.children.reduce((s: number, c: any) => s + (c.members?.length || 0), 0)})`
    }))
  ]
  if (unassigned.length > 0) deptTabs.push({ key: 'Belum Ditempatkan', label: `Belum Ditempatkan (${unassigned.length})` })

  if (loading) return <div className="text-slate-400 text-center py-8">Memuat...</div>
  if (!instanceId) return <div className="text-red-500 text-center py-8">instance_id tidak ditemukan</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <Link to={`/rapor?period=${period}`} className="text-blue-600 text-sm hover:underline mb-1 inline-block"><ArrowLeft className="w-3.5 h-3.5 inline mr-1" /> Kembali</Link>
          <h2 className="text-2xl font-bold text-slate-800">Isi Nilai Rapor</h2>
        </div>
        <div className="flex gap-2 items-center">
          <button onClick={() => setAspectEditing(true)} className="text-xs text-blue-600 hover:underline">{aspects.filter(a => !a.disabled).length}/{aspects.length} aspek</button>
          <button onClick={saveAll} disabled={savingAll} className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">{savingAll ? '⏳ Menyimpan...' : <><Save className="w-4 h-4" /> Simpan Semua</>}</button>
        </div>
      </div>

      {status && <div className="mb-3 px-4 py-2 rounded-lg text-sm bg-green-50 text-green-700">{status}</div>}

      {/* Filter tabs */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
        {deptTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveDept(tab.key)}
            className={`whitespace-nowrap px-3 py-1.5 text-xs rounded-lg border transition ${activeDept === tab.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-3 max-w-xs">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 pr-3 py-1.5 border rounded-lg text-xs w-full" placeholder="Cari anggota..." />
      </div>

      {/* Member rows by department */}
      {visibleMembers.map(({ dept, members: deptMems, isSub }) => (
        <div key={dept} className={`mb-4 ${isSub ? 'ml-4 border-l-2 border-slate-200 pl-3' : ''}`}>
          <h3 className={`text-xs font-bold mb-2 px-1 ${isSub ? 'text-slate-400' : 'text-slate-500 uppercase tracking-wide text-sm'}`}>{dept} ({deptMems.length})</h3>
          <div>
            {deptMems.length === 0 && <div className="text-xs text-slate-400 py-4 text-center">Tidak ada anggota di kementerian ini.</div>}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {deptMems.map((m: any) => {
              const mid = memberIdStr(m)
              const ent = getEntry(mid)
              const scores: any[] = ent?.scores || []
              const token = ent?.token || ''
              return (
                <div key={mid} data-row={mid} data-member={mid} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-4">
                  <div className="flex items-center gap-2 mb-3">
                    {m.photo_url ? <img src={m.photo_url} className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-100 flex-shrink-0" alt="" /> : <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{(m.full_name || '?')[0]}</div>}
                    <div>
                      <div className="text-sm font-semibold text-slate-800 leading-tight">{m.full_name}</div>
                      {m.nim && <div className="text-[10px] text-slate-400">{m.nim}</div>}
                    </div>
                    <button onClick={() => saveEntry(mid)} disabled={saving === mid} className="ml-auto px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex-shrink-0 transition-colors">{saving === mid ? '...' : 'Simpan'}</button>
                  </div>
                  <div className="space-y-2">
                    {aspects.map((a, i) => (
                      <div key={i} className="group">
                        <label className="text-[11px] font-medium text-slate-500 mb-0.5 block">{a.label}</label>
                        {a.kind === 'numeric' ? (
                          <div className="flex items-center gap-2">
                            <input type="range" data-idx={i} defaultValue={scores[i] || a.min || 0} min={a.min ?? 0} max={a.max ?? 5}
                              onChange={e => { const v = parseInt(e.target.value); setSliderVals(prev => ({ ...prev, [`${mid}-${i}`]: v })) }}
                              className="flex-1 h-1.5 accent-blue-600" />
                            <span className="text-xs font-bold text-slate-600 w-6 text-right">{sliderVals[`${mid}-${i}`] ?? scores[i] ?? a.min ?? 0}</span>
                            <input type="number" data-idx={i} value={sliderVals[`${mid}-${i}`] ?? scores[i] ?? a.min ?? 0} onChange={e => { const v = Math.max(a.min??0, Math.min(a.max??5, parseInt(e.target.value)||0)); setSliderVals(prev=>({...prev,[`${mid}-${i}`]:v})) }} min={a.min??0} max={a.max??5} className="w-14 border rounded px-1.5 py-0.5 text-xs text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                          </div>
                        ) : (
                          <textarea data-idx={i} defaultValue={scores[i] || ''} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs resize-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 outline-none" rows={2} placeholder="Tulis penilaian..."/>
                        )}
                      </div>
                    ))}
                  </div>
                  {token && <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-400 truncate"><button onClick={e=>{e.preventDefault();navigator.clipboard.writeText("https://pkseugm.web.id/rapor/t/"+token)}} className="text-[10px] text-blue-500 hover:text-blue-700 underline">{"https://pkseugm.web.id/rapor/t/"+String(token).substring(0,16)+"..."}</button></div>}
                </div>
              )
            })}
            </div>
          </div>
        </div>
      ))}

      {aspectEditing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setAspectEditing(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold mb-2">Aspek Aktif</h3>
            <p className="text-xs text-slate-400 mb-4">Centang aspek yang diterapkan pada rapor ini. Edit aspek di halaman Rapor.</p>
            <div className="space-y-2">
              {aspects.map((a, i) => (
                <label key={i} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-50 cursor-pointer text-sm">
                  <input type="checkbox" checked={!a.disabled} onChange={() => { const n = [...aspects]; n[i] = { ...n[i], disabled: !a.disabled }; setAspects(n) }} className="accent-blue-600" />
                  <span>{a.label}</span>
                  <span className="text-xs text-slate-400 ml-auto">{a.kind === 'descriptive' ? 'Teks' : `Angka (${a.min}-${a.max})`}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2 justify-end mt-4"><button onClick={() => setAspectEditing(false)} className="px-4 py-2 border rounded-lg text-sm">Tutup</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
