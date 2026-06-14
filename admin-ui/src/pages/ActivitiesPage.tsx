import { useState, useEffect, useCallback } from 'react'
import { usePeriod } from '../components/AdminLayout'
import { Activity, Member, apiGet, apiPost, apiPut, apiDelete } from '../lib/api'
import { Plus, Table2, Settings } from 'lucide-react'

const S_H = 2; const S_I = 1; const S_A = 0
const ST_C: Record<number,string> = {2:'bg-green-500 text-white',1:'bg-amber-400 text-white',0:'bg-red-400 text-white'}
const ST_L: Record<number,string> = {2:'H',1:'I',0:'A'}
const DEPT = ['Pengurus Inti','MSDP (Manajemen Sumber Daya Paguyuban)','ComDev (Community Development)','Medsi (Media, Desain, dan Relasi)','SBJ (Sinergi Bahagia dan Juara)','Pemikad (Pengembangan Minat, Bakat, dan Akademi)']

export default function ActivitiesPage() {
  const { period } = usePeriod()
  const [activities, setActivities] = useState<Activity[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [catFilter, setCatFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showAttendance, setShowAttendance] = useState(false)
  const [editId, setEditId] = useState('')
  const [name, setName] = useState('')
  const [category, setCategory] = useState('yayasan')
  const [date, setDate] = useState('')
  const [mandatory, setMandatory] = useState(true)
  const [attActivity, setAttActivity] = useState<Activity | null>(null)
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [showTable, setShowTable] = useState(false)
  const [tableMode, setTableMode] = useState<'attendance'|'volunteer'>('attendance')
  const [tableMembers, setTableMembers] = useState<Member[]>([])
  const [tableActs, setTableActs] = useState<Activity[]>([])
  const [tableStatus, setTableStatus] = useState<Record<string,Record<string,number>>>({})
  const [tableVolRoles, setTableVolRoles] = useState<Record<string,Record<string,string>>>({})
  const [showScoring, setShowScoring] = useState(false)
  const [scWajibH, setScWajibH] = useState('2'); const [scWajibI, setScWajibI] = useState('1'); const [scWajibA, setScWajibA] = useState('0')
  const [scOptH, setScOptH] = useState('1.5'); const [scOptI, setScOptI] = useState('0.75'); const [scOptA, setScOptA] = useState('0')
  const [scVol, setScVol] = useState('0.5')
  const [activeCell, setActiveCell] = useState<{mid:string;aid:string}|null>(null)

  const cats = ['yayasan', 'paguyuban']
  const catBadge: Record<string, string> = { yayasan: 'bg-blue-600 text-white', paguyuban: 'bg-green-600 text-white' }
  const catCard: Record<string, string> = { yayasan: 'bg-blue-50 border-blue-200', paguyuban: 'bg-green-50 border-green-200' }

  const loadActivities = useCallback(async () => {
    try {
      const data = await apiGet(`/api/cms/activities?period=${period}`)
      setActivities(data.items || data || [])
    } catch { setActivities([]) }
    setLoading(false)
  }, [period])

  const loadMembers = useCallback(async () => {
    try {
      const data = await apiGet(`/api/cms/members?period=${period}&per_page=200`)
      setMembers(data.items || data || [])
    } catch { setMembers([]) }
  }, [period])

  useEffect(() => { loadActivities(); loadMembers() }, [loadActivities, loadMembers])

  const filtered = catFilter ? activities.filter(a => a.category === catFilter) : activities

  function openAdd() { setEditId(''); setName(''); setCategory('yayasan'); setDate(''); setMandatory(true); setShowModal(true) }
  function openEdit(a: Activity) { setEditId(a.id); setName(a.name); setCategory(a.category); setDate(a.date?.slice(0, 10) || ''); setMandatory(a.mandatory !== false); setShowModal(true) }
  function openAttendance(a: Activity) { setAttActivity(a); setCheckedIds(new Set(a.attendee_ids || [])); setShowAttendance(true) }

  async function save() {
    if (!name || !date) return alert('Isi semua field')
    setSaving(true)
    try {
      const body = { period_label: period, name, category, date: date + 'T00:00:00Z', mandatory }
      if (editId) await apiPut(`/api/cms/activities/${editId}`, body)
      else await apiPost('/api/cms/activities', body)
      setShowModal(false)
      loadActivities()
    } catch (e: unknown) { alert((e as Error).message) }
    setSaving(false)
  }

  async function remove(id: string) {
    if (!confirm('Hapus aktivitas ini?')) return
    await apiDelete(`/api/cms/activities/${id}`)
    loadActivities()
  }

  async function saveAttendance() {
    if (!attActivity) return
    setSaving(true)
    try {
      await apiPut(`/api/cms/activities/${attActivity.id}/attendance`, { attendee_ids: [...checkedIds] })
      setShowAttendance(false)
      loadActivities()
    } catch (e: unknown) { alert((e as Error).message) }
    setSaving(false)
  }

  const memberIdStr = (m: Member) => m.id
  function deptIx(d: string) { const i = DEPT.indexOf(d); return i >= 0 ? i : 99 }

  async function openTable() {
    setSaving(true)
    try {
      const [ms, ps] = await Promise.all([
        apiGet(`/api/cms/members?period=${period}&per_page=200`),
        apiGet('/api/cms/periods'),
      ])
      const items = (ms.items || ms || []) as Member[]
      items.sort((a,b) => deptIx(a.department||'') - deptIx(b.department||'') || (a.full_name||'').localeCompare(b.full_name||''))
      setTableMembers(items)
      const pd = (ps as any[]).find((p:any) => p.label === period)
      const dates = pd?.sub_period_dates || {}

      const acts = activities.slice().sort((a,b) => (a.date||'').localeCompare(b.date||''))
      setTableActs(acts)
      setTableMode('attendance')

      const st: Record<string,Record<string,number>> = {}
      const vr: Record<string,Record<string,string>> = {}
      for (const m of items) {
        st[m.id] = {}; vr[m.id] = {}
        const ap = m.active_periods || {}
        const sp = ap[period] || ''
        const joinDate = dates[sp] || ''
        for (const a of acts) {
          if (joinDate && a.date && a.date.slice(0,10) < joinDate) {
            st[m.id][a.id] = -1
          } else {
            const att = a.attendance || {}
            st[m.id][a.id] = att[m.id] !== undefined ? att[m.id] : (a.attendee_ids||[]).includes(m.id) ? S_H : S_A
          }
          vr[m.id][a.id] = (a.volunteer_roles||{})[m.id] || ''
        }
      }
      setTableStatus(st); setTableVolRoles(vr)
      setShowTable(true)
    } catch (e) { alert(String(e)) }
    setSaving(false)
  }

  function setCell(mid: string, aid: string, val: number) {
    setTableStatus(prev => ({...prev, [mid]: {...prev[mid], [aid]: val}}))
    setActiveCell(null)
  }

  async function saveTable() {
    if (!confirm('Simpan semua perubahan?')) return
    setSaving(true)
    try {
      for (const a of tableActs) {
        if (tableMode === 'attendance') {
          const hadir: string[] = []; const izin: string[] = []; const absen: string[] = []
          const pm: Record<string,number> = {}
          for (const m of tableMembers) {
            const s = tableStatus[m.id]?.[a.id] ?? S_A; if (s < 0) continue
            pm[m.id] = s
            if (s === S_H) hadir.push(m.id); else if (s === S_I) izin.push(m.id); else absen.push(m.id)
          }
          await apiPut(`/api/cms/activities/${a.id}/attendance`, {attendee_ids:[...hadir,...izin,...absen],attendance:pm})
        } else {
          const vids: string[] = []; const vr: Record<string,string> = {}
          for (const m of tableMembers) {
            const role = tableVolRoles[m.id]?.[a.id] || ''
            if (role) { vids.push(m.id); vr[m.id] = role }
          }
          await apiPut(`/api/cms/activities/${a.id}/volunteers`, {volunteer_ids:vids,volunteer_roles:vr})
        }
        await new Promise(r => setTimeout(r, 50))
      }
      setShowTable(false)
      loadActivities()
    } catch (e: any) { alert(e.message) }
    setSaving(false)
  }

  function openScoring() {
    // Try load existing weights from first instance
    const inst = (activities[0] as any)?.attendance_weights
    if (inst?.wajib) { setScWajibH(String(inst.wajib.hadir||2)); setScWajibI(String(inst.wajib.izin||1)); setScWajibA(String(inst.wajib.absen||0)) }
    if (inst?.tidak_wajib) { setScOptH(String(inst.tidak_wajib.hadir||1.5)); setScOptI(String(inst.tidak_wajib.izin||0.75)); setScOptA(String(inst.tidak_wajib.absen||0)) }
    if (inst?.voluntary !== undefined) setScVol(String(inst.voluntary||0.5))
    setShowScoring(true)
  }

  async function saveScoring() {
    setSaving(true)
    try {
      const weights = {
        wajib: {hadir: Number(scWajibH), izin: Number(scWajibI), absen: Number(scWajibA)},
        tidak_wajib: {hadir: Number(scOptH), izin: Number(scOptI), absen: Number(scOptA)},
        voluntary: Number(scVol),
      }
      const insts = await apiGet(`/api/cms/rapor-instances?period=${period}`)
      for (const inst of (insts.items || insts || [])) {
        await apiPut(`/api/cms/rapor-instances/${inst.id}`, {...inst, attendance_weights: weights})
      }
      setShowScoring(false)
    } catch (e: any) { alert(e.message) }
    setSaving(false)
  }

  if (loading) return <div className="text-slate-400 text-center py-8">Memuat...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Kegiatan & Absensi</h2>
        <div className="flex gap-2">
          <button onClick={openTable} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
            <Table2 className="w-4 h-4" /> Edit Kehadiran
          </button>
          <button onClick={openScoring} className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
            <Settings className="w-4 h-4" /> Bobot Skor
          </button>
          <button onClick={openAdd} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" /> Tambah Aktivitas
          </button>
        </div>
      </div>

      <div className="mb-4 flex gap-2 flex-wrap">
        <button onClick={() => setCatFilter('')} className={`px-3 py-1.5 text-sm rounded-lg border ${!catFilter ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-300 hover:bg-slate-100'}`}>Semua</button>
        {cats.map(c => (
          <button key={c} onClick={() => setCatFilter(c)} className={`px-3 py-1.5 text-sm rounded-lg border capitalize ${catFilter === c ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-300 hover:bg-slate-100'}`}>{c}</button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && <div className="text-slate-400 text-center py-8">Belum ada aktivitas</div>}
        {filtered.map(a => (
          <div key={a.id} className={`rounded-xl border p-4 ${catCard[a.category] || 'bg-white border-slate-200'}`}>
            <div className="mb-3">
              <span className={`px-3 py-0.5 rounded-full text-xs font-medium capitalize ${catBadge[a.category] || ''}`}>{a.category}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${a.mandatory !== false ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>{a.mandatory !== false ? 'Wajib' : 'Opsional'}</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-slate-800">{a.name}</div>
                <div className="text-xs text-slate-500">{a.date ? new Date(a.date).toLocaleDateString('id-ID') : '-'} · {a.attendee_ids?.length || 0} hadir</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openAttendance(a)} className="text-xs px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 border border-green-200">Kehadiran</button>
                <button onClick={() => openEdit(a)} className="text-xs px-3 py-1.5 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200">Edit</button>
                <button onClick={() => remove(a.id)} className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-200">Hapus</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">{editId ? 'Edit Aktivitas' : 'Tambah Aktivitas'}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-slate-700">Nama Aktivitas</label>
                <input value={name} onChange={e => setName(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Rapat Pleno I" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Kategori</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                  {cats.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Tanggal</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={mandatory} onChange={e => setMandatory(e.target.checked)} id="mandatory" className="accent-red-600 w-4 h-4" />
                <label htmlFor="mandatory" className="text-sm text-slate-700">Wajib</label>
                <span className="text-xs text-slate-400">(tidak wajib = opsional)</span>
              </div>
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm rounded-lg border hover:bg-slate-50">Batal</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700">{saving ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Modal */}
      {showAttendance && attActivity && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={e => e.target === e.currentTarget && setShowAttendance(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Kehadiran: {attActivity.name}</h3>
            <div className="overflow-y-auto flex-1 space-y-1 mb-4">
              {members.map(m => {
                const mid = memberIdStr(m)
                return (
                  <label key={mid} className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-slate-50 cursor-pointer">
                    <input type="checkbox" checked={checkedIds.has(mid)} onChange={() => {
                      const next = new Set(checkedIds)
                      next.has(mid) ? next.delete(mid) : next.add(mid)
                      setCheckedIds(next)
                    }} className="accent-blue-600 w-4 h-4" />
                    <span className="text-sm text-slate-700">{m.full_name}</span>
                    <span className="text-xs text-slate-400 ml-auto">{m.department || ''}</span>
                  </label>
                )
              })}
              {members.length === 0 && <div className="text-slate-400 text-sm">Tidak ada anggota</div>}
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowAttendance(false)} className="px-4 py-2 text-sm rounded-lg border hover:bg-slate-50">Tutup</button>
              <button onClick={saveAttendance} disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700">{saving ? 'Menyimpan...' : 'Simpan Kehadiran'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Attendance/Volunteer Table Editor */}
      {showTable && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setShowTable(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
              <h3 className="text-lg font-bold">Edit Kehadiran</h3>
              <div className="flex items-center gap-4">
                <div className="flex rounded-lg border overflow-hidden">
                  <button onClick={() => setTableMode('attendance')} className={`px-3 py-1 text-xs font-medium ${tableMode==='attendance'?'bg-blue-600 text-white':'bg-white text-slate-600'}`}>Kehadiran</button>
                  <button onClick={() => setTableMode('volunteer')} className={`px-3 py-1 text-xs font-medium ${tableMode==='volunteer'?'bg-emerald-600 text-white':'bg-white text-slate-600'}`}>Volunteer</button>
                </div>
                {tableMode==='attendance' && (
                  <div className="flex gap-2 text-xs">
                    {[S_H,S_I,S_A].map(s=><span key={s} className={`px-2 py-0.5 rounded-full ${ST_C[s]}`}>{ST_L[s]}={s===S_H?'Hadir':s===S_I?'Izin':'Absen'}</span>)}
                    <span className="px-2 py-0.5 rounded border border-red-300 text-red-600 text-xs">■ blm gabung</span>
                  </div>
                )}
              </div>
            </div>
            <div className="overflow-auto flex-1 bg-slate-50">
              <table className="border-collapse text-[11px]">
                <thead className="sticky top-0 z-20">
                  <tr>
                    <th className="sticky left-0 z-30 bg-white border-b-2 border-slate-300 px-3 py-2 text-left font-semibold text-slate-700 whitespace-nowrap min-w-[200px]" style={{boxShadow:'2px 0 4px rgba(0,0,0,0.06)'}}>Anggota</th>
                    {tableActs.map(a => (
                      <th key={a.id} className="border-b-2 border-slate-300 bg-white px-3 py-2 text-center whitespace-nowrap font-medium">
                        <div className="text-slate-600 leading-tight">{a.name}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {a.date ? new Date(a.date).toLocaleDateString('id-ID',{day:'numeric',month:'short'}) : '-'}
                          {a.mandatory !== false ? <span className="text-red-500 ml-1">W</span> : <span className="text-slate-300 ml-1">O</span>}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableMembers.map((m, mi) => (
                    <tr key={m.id} className={mi % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      <td className="sticky left-0 z-10 border-b border-slate-200 px-3 py-2 whitespace-nowrap" style={{boxShadow: mi%2===0?'2px 0 4px rgba(0,0,0,0.04)':'2px 0 4px rgba(0,0,0,0.02)'}}>
                        <div className="font-semibold text-slate-800">{m.full_name}</div>
                        <div className="text-[10px] text-slate-400">{m.department?.replace(/ \(.*/,'') || ''}</div>
                      </td>
                      {tableActs.map(a => {
                        const s = tableStatus[m.id]?.[a.id] ?? S_A
                        const excluded = s < 0
                        const active = activeCell?.mid === m.id && activeCell?.aid === a.id
                        if (tableMode === 'volunteer') {
                          return (
                            <td key={a.id} className={`border-b border-slate-200 px-1 py-1 text-center ${excluded ? 'bg-red-50' : ''}`}>
                              {excluded ? <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold bg-red-100 text-red-400 border border-red-200">—</span> : (
                                <input className="w-14 text-center text-xs px-1 py-0.5 border border-slate-200 rounded focus:outline-none focus:border-blue-400"
                                       value={tableVolRoles[m.id]?.[a.id] || ''} placeholder="..."
                                       onChange={e => setTableVolRoles(p => ({...p, [m.id]: {...p[m.id], [a.id]: e.target.value}}))} />
                              )}
                            </td>
                          )
                        }
                        const baseCls = 'border-b border-slate-200 px-0 py-1 text-center'
                        if (excluded) {
                          return (
                            <td key={a.id} className={`${baseCls} bg-red-50`}>
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold bg-red-100 text-red-400 border border-red-200">—</span>
                            </td>
                          )
                        }
                        return (
                          <td key={a.id} className={`${baseCls} cursor-pointer hover:bg-blue-50 transition-colors relative`}
                              onClick={() => setActiveCell(active ? null : {mid: m.id, aid: a.id})}>
                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shadow-sm ${
                              s===S_H?'bg-green-500 text-white':s===S_I?'bg-amber-400 text-white':'bg-red-100 text-red-600 border border-red-200'}`}>{ST_L[s]}</span>
                            {active && (
                              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 flex gap-0.5 bg-white rounded-lg shadow-xl border p-0.5"
                                   onClick={e => e.stopPropagation()}>
                                <button onClick={() => setCell(m.id, a.id, S_H)} className="px-2 py-1 text-xs font-bold rounded bg-green-500 text-white hover:bg-green-600">H</button>
                                <button onClick={() => setCell(m.id, a.id, S_I)} className="px-2 py-1 text-xs font-bold rounded bg-amber-400 text-white hover:bg-amber-500">I</button>
                                <button onClick={() => setCell(m.id, a.id, S_A)} className="px-2 py-1 text-xs font-bold rounded bg-red-400 text-white hover:bg-red-500">A</button>
                              </div>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between items-center px-4 py-3 border-t flex-shrink-0 bg-white">
              <span className="text-xs text-slate-400">{tableMode==='attendance'?'Klik sel lalu pilih status (H/I/A)':'Isi peran/kontribusi volunteer'}</span>
              <div className="flex gap-2">
                <button onClick={() => setShowTable(false)} className="px-4 py-2 text-sm rounded-lg border hover:bg-slate-50">Batal</button>
                <button onClick={saveTable} disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium">{saving?'Menyimpan...':'Simpan Semua'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scoring Config */}
      {showScoring && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target===e.currentTarget && setShowScoring(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
            <h3 className="text-lg font-bold mb-4">Bobot Skor Kehadiran</h3>
            <div className="space-y-4">
              <div className="border rounded-lg p-3">
                <h4 className="text-sm font-bold text-red-700 mb-2">Kegiatan Wajib</h4>
                <div className="grid grid-cols-3 gap-2">
                  <div><label className="text-xs text-slate-500">Hadir</label><input type="number" step="0.5" value={scWajibH} onChange={e=>setScWajibH(e.target.value)} className="w-full border rounded px-2 py-1 text-sm" /></div>
                  <div><label className="text-xs text-slate-500">Izin</label><input type="number" step="0.5" value={scWajibI} onChange={e=>setScWajibI(e.target.value)} className="w-full border rounded px-2 py-1 text-sm" /></div>
                  <div><label className="text-xs text-slate-500">Absen</label><input type="number" step="0.5" value={scWajibA} onChange={e=>setScWajibA(e.target.value)} className="w-full border rounded px-2 py-1 text-sm" /></div>
                </div>
              </div>
              <div className="border rounded-lg p-3">
                <h4 className="text-sm font-bold text-slate-700 mb-2">Kegiatan Tidak Wajib</h4>
                <div className="grid grid-cols-3 gap-2">
                  <div><label className="text-xs text-slate-500">Hadir</label><input type="number" step="0.5" value={scOptH} onChange={e=>setScOptH(e.target.value)} className="w-full border rounded px-2 py-1 text-sm" /></div>
                  <div><label className="text-xs text-slate-500">Izin</label><input type="number" step="0.5" value={scOptI} onChange={e=>setScOptI(e.target.value)} className="w-full border rounded px-2 py-1 text-sm" /></div>
                  <div><label className="text-xs text-slate-500">Absen</label><input type="number" step="0.5" value={scOptA} onChange={e=>setScOptA(e.target.value)} className="w-full border rounded px-2 py-1 text-sm" /></div>
                </div>
              </div>
              <div className="border rounded-lg p-3">
                <h4 className="text-sm font-bold text-emerald-700 mb-2">Volunteer (bonus per kegiatan)</h4>
                <div><label className="text-xs text-slate-500">Bonus</label><input type="number" step="0.5" value={scVol} onChange={e=>setScVol(e.target.value)} className="w-full border rounded px-2 py-1 text-sm" /></div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={()=>setShowScoring(false)} className="px-4 py-2 text-sm rounded-lg border hover:bg-slate-50">Batal</button>
              <button onClick={saveScoring} disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700">{saving?'Menyimpan...':'Simpan'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
