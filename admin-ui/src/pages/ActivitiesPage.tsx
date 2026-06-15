import { useState, useEffect, useCallback } from 'react'
import { usePeriod } from '../components/AdminLayout'
import { Activity, Member, apiGet, apiPost, apiPut, apiDelete } from '../lib/api'
import { Plus, Settings, Pencil, Trash2 } from 'lucide-react'

const S_H = 2; const S_I = 1; const S_A = 0
const ST_L: Record<number,string> = {2:'H',1:'I',0:'A'}
const DEPT = ['Pengurus Inti','MSDP (Manajemen Sumber Daya Paguyuban)','ComDev (Community Development)','Medsi (Media, Desain, dan Relasi)','SBJ (Sinergi Bahagia dan Juara)','Pemikad (Pengembangan Minat, Bakat, dan Akademi)']

export default function ActivitiesPage() {
  const { period } = usePeriod()
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState('')
  const [name, setName] = useState('')
  const [category, setCategory] = useState('yayasan')
  const [date, setDate] = useState('')
  const [dateEnd, setDateEnd] = useState('')
  const [mandatory, setMandatory] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tableMode, setTableMode] = useState<'attendance'|'volunteer'>('attendance')
  const [tableMembers, setTableMembers] = useState<Member[]>([])
  const [tableActs, setTableActs] = useState<Activity[]>([])
  const [tableStatus, setTableStatus] = useState<Record<string,Record<string,number>>>({})
  const [tableVolRoles, setTableVolRoles] = useState<Record<string,Record<string,string>>>({})
  const [tableJoinDates, setTableJoinDates] = useState<Record<string,string>>({})
  const [activeCell, setActiveCell] = useState<{mid:string;aid:string}|null>(null)
  const [showScoring, setShowScoring] = useState(false)
  const [scWajibH, setScWajibH] = useState('2'); const [scWajibI, setScWajibI] = useState('1'); const [scWajibA, setScWajibA] = useState('0')
  const [scOptH, setScOptH] = useState('1.5'); const [scOptI, setScOptI] = useState('0.75'); const [scOptA, setScOptA] = useState('0')
  const [scVol, setScVol] = useState('0.5')

  const loadActivities = useCallback(async () => {
    try {
      const data = await apiGet(`/api/cms/activities?period=${period}`)
      const items = data.items || data || []
      setActivities(items)
      setLoading(false)
      return items
    } catch { setActivities([]); setLoading(false); return [] }
  }, [period])

  function deptIx(d: string) { const i = DEPT.indexOf(d); return i >= 0 ? i : 99 }

  async function openTable(acts?: Activity[]) {
    try {
      const [ms, ps] = await Promise.all([
        apiGet(`/api/cms/members?period=${period}&per_page=200`),
        apiGet('/api/cms/periods'),
      ])
      const rawMembers = (ms.items || ms || []) as Member[]
      rawMembers.sort((a:Member,b:Member) => deptIx(a.department||'') - deptIx(b.department||'') || (a.full_name||'').localeCompare(b.full_name||''))
      setTableMembers(rawMembers)
      const pd = (ps as any[]).find((p:any) => p.label === period)
      const dates = pd?.sub_period_dates || {}

      const sorted = (acts || activities).slice().sort((a,b) => (a.date||'').localeCompare(b.date||''))
      setTableActs(sorted)

      const st: Record<string,Record<string,number>> = {}
      const vr: Record<string,Record<string,string>> = {}
      const jd: Record<string,string> = {}
      for (const m of rawMembers) {
        st[m.id] = {}; vr[m.id] = {}
        const ap = m.active_periods || {}
        const sp = ap[period] || ''
        const joinDate = dates[sp] || ''
        jd[m.id] = joinDate ? `${sp} · ${new Date(joinDate).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'})}` : (sp || '?')
        for (const a of sorted) {
          if (joinDate && a.date && a.date.slice(0,10) < joinDate) {
            st[m.id][a.id] = -1
          } else {
            const att = a.attendance || {}
            st[m.id][a.id] = att[m.id] !== undefined ? att[m.id] : (a.attendee_ids||[]).includes(m.id) ? S_H : S_A
          }
          vr[m.id][a.id] = (a.volunteer_roles||{})[m.id] || ''
        }
      }
      setTableStatus(st); setTableVolRoles(vr); setTableJoinDates(jd)
    } catch (e) { alert(String(e)) }
  }

  useEffect(() => { loadActivities().then(data => openTable(data)) }, [loadActivities])

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
      setSaving(false)
      alert('Berhasil disimpan!')
    } catch (e: any) { setSaving(false); alert(e.message) }
  }

  function openAdd() { setEditId(''); setName(''); setCategory('yayasan'); setDate(''); setDateEnd(''); setMandatory(true); setShowModal(true) }
  function openEdit(a: Activity) { setEditId(a.id); setName(a.name); setCategory(a.category); setDate(a.date?.slice(0, 10) || ''); setDateEnd(a.date_end?.slice(0, 10) || ''); setMandatory(a.mandatory !== false); setShowModal(true) }
  async function save() {
    if (!name || !date) return alert('Isi semua field')
    setSaving(true)
    try {
      const body: any = { period_label: period, name, category, date: date + 'T00:00:00Z', mandatory }
      if (dateEnd) body.date_end = dateEnd + 'T00:00:00Z'
      if (editId) await apiPut(`/api/cms/activities/${editId}`, body)
      else await apiPost('/api/cms/activities', body)
      setShowModal(false)
      loadActivities().then(data => openTable(data))
    } catch (e: unknown) { alert((e as Error).message) }
    setSaving(false)
  }
  async function remove(id: string) {
    if (!confirm('Hapus aktivitas ini?')) return
    await apiDelete(`/api/cms/activities/${id}`)
    loadActivities().then(data => openTable(data))
  }

  function openScoring() {
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
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-slate-800">Kegiatan & Absensi</h2>
        <div className="flex gap-2">
          <button onClick={openScoring} className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
            <Settings className="w-4 h-4" /> Bobot Skor
          </button>
          <button onClick={openAdd} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" /> Tambah Aktivitas
          </button>
        </div>
      </div>

      {/* Attendance/Volunteer Table */}
      {tableActs.length > 0 && (
        <div className="bg-white rounded-xl border shadow-sm flex flex-col flex-1 min-h-0">
            <div className="flex items-center justify-between p-3 border-b flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex rounded-lg border overflow-hidden">
                  <button onClick={() => setTableMode('attendance')} className={`px-3 py-1 text-xs font-medium ${tableMode==='attendance'?'bg-blue-600 text-white':'bg-white text-slate-600 hover:bg-slate-50'}`}>Kehadiran</button>
                  <button onClick={() => setTableMode('volunteer')} className={`px-3 py-1 text-xs font-medium ${tableMode==='volunteer'?'bg-emerald-600 text-white':'bg-white text-slate-600 hover:bg-slate-50'}`}>Volunteer</button>
                </div>
                <div className="flex gap-1.5 text-xs flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-green-50 border border-green-200 text-green-700 font-medium">H = Hadir</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 font-medium">I = Izin</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-50 border border-red-200 text-red-600 font-medium">A = Absen</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-50 border border-red-400 text-red-600 font-medium">■ blm gabung</span>
                </div>
              </div>
              <button onClick={saveTable} disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium whitespace-nowrap">{saving?'Menyimpan...':'Simpan Semua'}</button>
            </div>
            <div className="overflow-auto flex-1 bg-slate-50">
              <table className="border-collapse text-[11px]">
                <thead className="sticky top-0 z-20">
                  <tr>
                    <th className="sticky left-0 z-30 bg-white border-b-2 border-l border-r border-slate-300 px-3 py-2 text-left font-semibold text-slate-700 whitespace-nowrap min-w-[200px]" style={{boxShadow:'2px 0 4px rgba(0,0,0,0.06)'}}>Anggota</th>
                    {tableActs.map(a => (
                      <th key={a.id} className="border-b-2 border-l border-r border-slate-300 bg-white px-3 py-2 text-center whitespace-nowrap font-medium group">
                        <div className="text-slate-600 leading-tight">{a.name}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {a.date ? new Date(a.date).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'}) : '-'}{a.date_end ? ' — ' + new Date(a.date_end).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'}) : ''}
                          {a.mandatory !== false ? <span className="text-red-500 ml-1">W</span> : <span className="text-slate-300 ml-1">O</span>}
                          <span className="ml-2 opacity-0 group-hover:opacity-100 inline-flex gap-1">
                            <Pencil className="w-3 h-3 cursor-pointer hover:text-blue-500" onClick={() => openEdit(a)} />
                            <Trash2 className="w-3 h-3 cursor-pointer hover:text-red-500" onClick={() => remove(a.id)} />
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableMembers.map((m, mi) => (
                    <tr key={m.id} className={mi % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      <td className={`sticky left-0 z-10 border-b border-l border-r border-slate-200 px-3 py-1.5 whitespace-nowrap ${mi%2===0?'bg-white':'bg-slate-50'}`} style={{boxShadow: mi%2===0?'2px 0 4px rgba(0,0,0,0.04)':'2px 0 4px rgba(0,0,0,0.02)'}}>
                        <div className="font-semibold text-slate-800">{m.full_name}</div>
                        <div className="text-[10px] text-slate-400">{m.department?.replace(/ \(.*/,'') || ''} · {tableJoinDates[m.id] || ''}</div>
                      </td>
                      {tableActs.map(a => {
                        const s = tableStatus[m.id]?.[a.id] ?? S_A
                        const excluded = s < 0
                        const active = activeCell?.mid === m.id && activeCell?.aid === a.id
                        if (tableMode === 'volunteer') {
                          return (
                            <td key={a.id} className={`border-b border-l border-r border-slate-200 px-1 py-1 text-center min-w-[80px] ${excluded ? 'bg-red-50' : ''}`}>
                              {excluded ? <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold bg-red-100 text-red-400 border border-red-200">—</span> : (
                                <input className="w-full text-center text-xs px-1 py-0.5 border border-slate-200 rounded focus:outline-none focus:border-blue-400"
                                       value={tableVolRoles[m.id]?.[a.id] || ''} placeholder="..."
                                       onChange={e => setTableVolRoles(p => ({...p, [m.id]: {...p[m.id], [a.id]: e.target.value}}))} />
                              )}
                            </td>
                          )
                        }
                        const baseCls = 'border-b border-l border-r border-slate-200 px-0 py-1 text-center'
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
        </div>
      )}

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
                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm capitalize">
                  <option value="yayasan">Yayasan</option>
                  <option value="paguyuban">Paguyuban</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Tanggal</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Sampai (opsional)</label>
                <input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-slate-700">Wajib</span>
                  <p className="text-xs text-slate-400">Kegiatan wajib dihadiri seluruh anggota</p>
                </div>
                <button onClick={() => setMandatory(!mandatory)}
                  className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${mandatory ? 'bg-red-500' : 'bg-slate-300'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${mandatory ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
              </div>
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm rounded-lg border hover:bg-slate-50">Batal</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700">{saving ? 'Menyimpan...' : 'Simpan'}</button>
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
