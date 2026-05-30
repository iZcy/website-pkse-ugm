import { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { usePeriod } from '../components/AdminLayout'
import { apiGet, apiPost } from '../lib/api'
import { Save, ArrowLeft, Search } from 'lucide-react'

const DEFAULT_ASPECTS = [
  { label: 'Kedisiplinan & Komitmen', desc: 'Kehadiran dan keteraturan', kind: 'numeric' },
  { label: 'Keaktifan', desc: 'Partisipasi aktif', kind: 'numeric' },
  { label: 'Tanggung Jawab', desc: 'Pemenuhan tugas', kind: 'numeric' },
  { label: 'Kerjasama', desc: 'Kemampuan bekerja dalam tim', kind: 'numeric' },
  { label: 'Inisiatif', desc: 'Proaktif dalam kontribusi', kind: 'descriptive' },
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
  const [status, setStatus] = useState('')
  const [aspectEditing, setAspectEditing] = useState(false)
  const [aspects, setAspects] = useState<any[]>(DEFAULT_ASPECTS)
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
          label: a.aspect || a.label || '', desc: a.desc || '', kind: a.kind || 'numeric'
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
        return inp?.value || (a.kind === 'numeric' ? '0' : '')
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
        const scores = aspects.map((a, i) => {
          const inp = row.querySelector(`[data-idx="${i}"]`) as HTMLInputElement | HTMLTextAreaElement
          return inp?.value || (a.kind === 'numeric' ? '0' : '')
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
        body: JSON.stringify({ score_aspects: aspects.map((a: any) => ({ aspect: a.label, desc: a.desc, kind: a.kind })) }),
        credentials: 'same-origin',
      })
      setAspectEditing(false)
      setStatus('Aspek penilaian tersimpan!')
      setTimeout(() => setStatus(''), 2000)
    } catch (e: any) { alert(e.message) }
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
          <button onClick={() => setAspectEditing(true)} className="text-xs text-blue-600 hover:underline">{aspects.length} aspek</button>
          <button onClick={saveAll} className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"><Save className="w-4 h-4" /> Simpan Semua</button>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {deptMems.map((m: any) => {
              const mid = memberIdStr(m)
              const ent = getEntry(mid)
              const scores: any[] = ent?.scores || []
              const feedback = ent?.feedback || ''
              const token = ent?.token || ''
              return (
                <div key={mid} data-row={mid} className="bg-white rounded-lg border border-slate-200 p-2 space-y-1">
                  <div className="flex items-center gap-2">
                    {m.photo_url ? <img src={m.photo_url} className="w-6 h-6 rounded-full object-cover flex-shrink-0" alt="" /> : <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold flex-shrink-0">{(m.full_name || '?')[0]}</div>}
                    <div className="text-xs font-medium text-slate-800 truncate">{m.full_name}</div>
                    <button onClick={() => saveEntry(mid)} disabled={saving === mid} className="ml-auto px-2 py-0.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 flex-shrink-0">{saving === mid ? '...' : 'Simpan'}</button>
                  </div>
                  {aspects.map((a, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <label className="text-[10px] text-slate-400 w-16 flex-shrink-0 truncate" title={a.label}>{a.label}</label>
                      {a.kind === 'numeric' ? (
                        <input type="number" data-idx={i} defaultValue={scores[i] || 0} min={0} max={5} className="w-10 border rounded px-1 py-0.5 text-xs text-center" />
                      ) : (
                        <textarea data-idx={i} defaultValue={scores[i] || ''} className="flex-1 border rounded px-1 py-0.5 text-[10px]" rows={1} placeholder="..."/>
                      )}
                    </div>
                  ))}
                  <input type="text" data-field="feedback" defaultValue={feedback} className="w-full border border-slate-200 rounded px-1 py-0.5 text-[10px]" placeholder="Catatan..." />
                  {token && <div className="text-[10px] text-slate-400 truncate">Link: /t/{token}</div>}
                </div>
              )
            })}
            </div>
          </div>
        </div>
      ))}

      {aspectEditing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setAspectEditing(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto p-6">
            <h3 className="text-lg font-bold mb-4">Edit Aspek Penilaian</h3>
            <div className="space-y-3">
              {aspects.map((a, i) => (
                <div key={i} className="flex gap-2 items-start border rounded-lg p-2">
                  <span className="text-xs text-slate-400 pt-2">{i + 1}</span>
                  <div className="flex-1 space-y-1">
                    <input value={a.label} onChange={e => { const n = [...aspects]; n[i] = { ...n[i], label: e.target.value }; setAspects(n) }} className="w-full border rounded px-2 py-1 text-sm" placeholder="Nama aspek" />
                    <input value={a.desc} onChange={e => { const n = [...aspects]; n[i] = { ...n[i], desc: e.target.value }; setAspects(n) }} className="w-full border rounded px-2 py-1 text-xs" placeholder="Deskripsi" />
                    <select value={a.kind || 'numeric'} onChange={e => { const n = [...aspects]; n[i] = { ...n[i], kind: e.target.value }; setAspects(n) }} className="text-xs border rounded px-2 py-1">
                      <option value="numeric">Angka (0-5)</option>
                      <option value="descriptive">Deskriptif (teks)</option>
                    </select>
                  </div>
                  {aspects.length > 1 && <button onClick={() => setAspects(aspects.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 text-xs pt-2">✕</button>}
                </div>
              ))}
              <button onClick={() => setAspects([...aspects, { label: '', desc: '', kind: 'numeric' }])} className="text-xs text-blue-600 hover:underline">+ Tambah aspek</button>
            </div>
            <div className="flex gap-2 justify-end mt-4"><button onClick={() => setAspectEditing(false)} className="px-4 py-2 border rounded-lg text-sm">Batal</button><button onClick={saveAspects} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Simpan Aspek</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
