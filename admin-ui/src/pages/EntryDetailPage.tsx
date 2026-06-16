import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { apiGet } from '../lib/api'

interface ScoreItem { label: string; desc: string; score: number; kind: string; min: number; max: number; textVal?: string }
interface ActItem { name: string; attended: boolean; status: string }
interface VolItem { name: string; role: string }
interface EntryData {
  member: { id: string; FullName: string; Department: string; ProgramStudi: string; NIM: string; PhotoURL: string; Angkatan: string; Fakultas: string }
  instance: { title: string; period_label: string }
  entry: { feedback: string; token: string }
  scores: ScoreItem[]
  attendance: { present: number; absent: number; izin: number; volunteer: number; total: number; pct: number; score: number; max_score: number; score_pct: number; wajib: { score: number; max: number }; opt: { score: number; max: number }; volBonus: number }
  activities: Record<string, ActItem[]>
  volunteerActivities: VolItem[]
  allInstances: { title: string; token: string; active: boolean }[]
}

export default function EntryDetailPage() {
  const { token } = useParams<{token:string}>()
  const [data, setData] = useState<EntryData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiGet(`/rapor/api/entry/${token}`).then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false))
  }, [token])

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50"><div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin" /></div>
  if (!data) return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50"><div className="text-center"><h1 className="text-xl font-bold text-red-700">Rapor Tidak Ditemukan</h1></div></div>

  const { member, instance, entry, scores, attendance, activities, volunteerActivities, allInstances } = data

  return (
    <div style={{background:'linear-gradient(135deg,#f0fdf4 0%,#ecfdf5 50%,#f0fdf4 100%)',minHeight:'100vh',fontFamily:'Plus Jakarta Sans,sans-serif'}} className="pb-16">
      <div className="max-w-2xl mx-auto px-4 pt-8">
        <Link to={`/m/${member.id}`} className="text-sm text-gray-400 hover:text-gray-600 mb-4 inline-block">← Kembali ke rapor saya</Link>

        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur rounded-full px-4 py-2 text-sm text-green-700 font-medium shadow-sm mb-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21.908 9.42C21.502 5.52 18.48 2.5 14.58 2.09A10 10 0 0 0 2 12c0 5.523 4.477 10 10 10 5.522 0 10-4.477 10-10 0-.195-.006-.39-.017-.585"/></svg>
            PKSE UGM
          </div>
          <h1 className="text-2xl font-bold text-green-900">Rapor Beswan</h1>
          <p className="text-green-600 mt-1">{instance.title}</p>
        </div>

        {allInstances.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
            {allInstances.map(i => (
              <Link key={i.token} to={`/t/${i.token}`}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all ${i.active ? 'bg-green-700 text-white shadow' : 'bg-white text-green-700 border border-green-200 hover:bg-green-50'}`}>
                {i.title}
              </Link>
            ))}
          </div>
        )}

        <div className="bg-white rounded-2xl p-6 shadow-sm mb-4">
          <div className="flex items-center gap-4 mb-4">
            {member.PhotoURL ? <img src={member.PhotoURL} className="w-14 h-14 rounded-full object-cover border-2 border-green-200" /> : (
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xl font-bold border-2 border-green-200">{member.FullName[0]}</div>
            )}
            <div>
              <h2 className="text-lg font-bold text-gray-900">{member.FullName}</h2>
              <p className="text-sm text-gray-500">{member.Department} · {member.ProgramStudi}</p>
              {member.NIM && <p className="text-xs text-gray-400 mt-0.5">NIM: {member.NIM}</p>}
            </div>
          </div>
          <div className="flex gap-4 text-sm text-gray-500 border-t border-gray-100 pt-3">
            <span>Angkatan {member.Angkatan}</span><span>·</span><span>{member.Fakultas}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm mb-4">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
            Penilaian
          </h3>
          <div className="space-y-4">
            {scores.map((s, i) => (
              <div key={i}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-sm font-medium text-gray-700">{s.label}</span>
                  {s.kind === 'descriptive' ? (
                    <span className="text-sm font-bold text-green-600">{s.textVal || '-'}</span>
                  ) : (
                    <span className={`text-sm font-bold ${s.score >= 4 ? 'text-green-600' : s.score === 3 ? 'text-amber-600' : 'text-red-500'}`}>{s.score}/{s.max}</span>
                  )}
                </div>
                {s.kind !== 'descriptive' && (
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${s.score >= 4 ? 'bg-green-500' : s.score === 3 ? 'bg-amber-400' : 'bg-red-400'}`}
                      style={{width:`${(s.score/s.max)*100}%`}} />
                  </div>
                )}
                {s.kind === 'descriptive' && (
                  <div className="border rounded-lg bg-slate-50 p-2 mt-1"><p className="text-sm text-gray-700 whitespace-pre-wrap">{s.textVal || <span className="text-gray-400 italic">Belum diisi</span>}</p></div>
                )}
                <p className="text-xs text-gray-400 mt-1">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm mb-4">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><path d="m9 14 2 2 4-4"/></svg>
            Kehadiran Kegiatan
          </h3>
          <div className="grid grid-cols-4 gap-3 mb-4">
            <StatBox color="green" value={attendance.present} label="Hadir" />
            <StatBox color="amber" value={attendance.izin} label="Izin" />
            <StatBox color="red" value={attendance.absent} label="Tanpa Izin" />
            <StatBox color="purple" value={attendance.volunteer} label="Lintas" />
          </div>
          <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
            <span>Skor Kehadiran</span>
            <span className="font-bold text-green-700">{attendance.score} / {attendance.max_score}</span>
          </div>
          {attendance.wajib && (
            <div className="mb-3 space-y-1 text-xs text-gray-400">
              <div>Wajib: {attendance.wajib.score} / {attendance.wajib.max} · Tidak Wajib: {attendance.opt.score} / {attendance.opt.max}</div>
              <div>Lintas: +{attendance.volBonus}</div>
            </div>
          )}
          <div className="h-2 rounded-full bg-gray-100 mb-2">
            <div className="h-full rounded-full bg-green-500" style={{width:`${attendance.score_pct}%`}} />
          </div>
          <p className="text-xs text-gray-500 text-center">{attendance.score}/{attendance.max_score} skor kehadiran wajib ({attendance.present} dari {attendance.total} kegiatan)</p>

          {Object.entries(activities).map(([cat, acts]) => (
            <div key={cat} className="mt-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{cat}</h4>
              <div className="flex flex-wrap gap-1.5">
                {acts.map(a => (
                  <span key={a.name} className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full ${
                    a.status === 'hadir' ? 'bg-green-100 text-green-700' :
                    a.status === 'izin' ? 'bg-amber-100 text-amber-600' :
                    'bg-red-50 text-red-600 line-through opacity-60'}`}>
                    {a.status === 'hadir' ? '✓' : '✗'} {a.name}
                  </span>
                ))}
              </div>
            </div>
          ))}

          {volunteerActivities && volunteerActivities.length > 0 && (
            <div className="mt-4">
              <h4 className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-2">Lintas Kementerian</h4>
              <div className="flex flex-wrap gap-1.5">
                {volunteerActivities.map(v => (
                  <span key={v.name} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                    ✦ {v.name}{v.role ? ` — ${v.role}` : ''}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {entry.feedback && (
          <div className="bg-white rounded-2xl p-6 shadow-sm mb-4">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
              Pesan & Kesan
            </h3>
            <p className="text-gray-600 leading-relaxed whitespace-pre-line">{entry.feedback}</p>
          </div>
        )}

        <div className="text-center text-xs text-gray-400 mt-6">
          <p>{instance.period_label} · {instance.title}</p>
          <p className="mt-1">PKSE UGM</p>
        </div>

        <div className="text-center mt-6">
          <Link to={`/m/${member.id}`} className="text-sm text-gray-400 hover:text-gray-600">← Kembali ke rapor saya</Link>
        </div>
      </div>
    </div>
  )
}

function StatBox({ color, value, label }: { color: string; value: number; label: string }) {
  const styles: Record<string,string> = { green:'bg-green-50 text-green-700', amber:'bg-amber-50 text-amber-600', red:'bg-red-50 text-red-600', purple:'bg-purple-50 text-purple-600' }
  return (
    <div className={`rounded-xl p-3 text-center ${styles[color]?.split(' ')[0] || 'bg-gray-50'}`}>
      <div className={`text-2xl font-bold ${styles[color]?.split(' ')[1] || 'text-gray-600'}`}>{value}</div>
      <div className="text-xs">{label}</div>
    </div>
  )
}
