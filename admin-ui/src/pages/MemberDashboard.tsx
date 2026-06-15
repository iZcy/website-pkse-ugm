import { useState, useEffect } from 'react'
import { apiGet } from '../lib/api'
import { LogOut, Key, BarChart3, Loader2 } from 'lucide-react'

interface KepengurusanItem {
  period: string; period_name: string; sub_period: string;
  department: string; position: string
}
interface Profile {
  full_name: string; nickname: string; program_studi: string;
  nim: string; angkatan: string; fakultas: string; photo_url: string;
  rapor_id: string; phone: string; kepengurusan?: KepengurusanItem[]
}

export default function MemberDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [showPw, setShowPw] = useState(false)
  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [pwMsg, setPwMsg] = useState('')
  const [pwOk, setPwOk] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiGet('/api/member/profile').then((d: Profile) => { setProfile(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setPwMsg(''); setPwOk(false)
    try {
      const r = await fetch('/api/member/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ old: oldPw, new: newPw }),
        credentials: 'same-origin',
      })
      const d = await r.json()
      if (r.ok) { setPwMsg('Password berhasil diubah'); setPwOk(true); setOldPw(''); setNewPw('') }
      else setPwMsg(d.error || 'Gagal mengubah password')
    } catch { setPwMsg('Gagal terhubung ke server') }
    setSaving(false)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-green-600" /></div>
  if (!profile) return <div className="min-h-screen flex items-center justify-center text-red-500">Gagal memuat profil. <a href="/login" className="underline ml-1">Login ulang</a></div>

  const kepengurusan = profile.kepengurusan || []

  return (
    <div className="min-h-screen pb-16" style={{background:'linear-gradient(135deg,#f0fdf4 0%,#ecfdf5 50%,#f0fdf4 100%)'}}>
      <div className="max-w-md mx-auto px-4 pt-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur rounded-full px-4 py-2 text-sm text-green-700 font-medium shadow-sm mb-4">PKSE UGM</div>
          <h1 className="text-2xl font-bold text-green-900">Dashboard</h1>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <div className="flex items-center gap-4 mb-4">
            {profile.photo_url ? <img src={profile.photo_url} className="w-16 h-16 rounded-full object-cover border-2 border-green-200" alt="" /> : (
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-2xl font-bold border-2 border-green-200">{profile.full_name[0]}</div>
            )}
            <div>
              <h2 className="text-lg font-bold text-gray-900">{profile.full_name}</h2>
              {profile.program_studi && <p className="text-sm text-gray-500">{profile.program_studi}</p>}
              {profile.nickname && <p className="text-xs text-gray-400">{profile.nickname}</p>}
            </div>
          </div>
          <div className="border-t pt-3 space-y-1 text-sm">
            {profile.nim && <div className="flex"><span className="text-gray-400 w-20">NIM</span><span className="text-gray-700">{profile.nim}</span></div>}
            {profile.angkatan && <div className="flex"><span className="text-gray-400 w-20">Angkatan</span><span className="text-gray-700">{profile.angkatan}</span></div>}
            {profile.fakultas && <div className="flex"><span className="text-gray-400 w-20">Fakultas</span><span className="text-gray-700">{profile.fakultas}</span></div>}
            {profile.phone && <div className="flex"><span className="text-gray-400 w-20">Telepon</span><span className="text-gray-700">{profile.phone}</span></div>}
          </div>

          {kepengurusan.length > 0 && (
            <div className="border-t mt-4 pt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Riwayat Kepengurusan</h3>
              <div className="space-y-3">
                {kepengurusan.map((k, i) => (
                  <div key={i} className="bg-slate-50 rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-gray-700 font-medium text-sm">{k.period_name || k.period}</span>
                        <span className="text-gray-400 text-xs ml-2">{k.sub_period}</span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{k.department}</div>
                    <div className="text-xs text-gray-600 font-medium">{k.position}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <a href={`/rapor/m/${profile.rapor_id}`} className="flex items-center justify-between bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow border border-green-100 group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-green-600 group-hover:bg-green-200 transition-colors"><BarChart3 className="w-5 h-5" /></div>
              <div><h3 className="font-semibold text-gray-900">Rapor Saya</h3><p className="text-xs text-gray-500">Lihat nilai, kehadiran, dan partisipasi</p></div>
            </div>
            <span className="text-green-600">&rarr;</span>
          </a>

          <button onClick={() => setShowPw(true)} className="w-full flex items-center justify-between bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600"><Key className="w-5 h-5" /></div>
              <div><h3 className="font-semibold text-gray-900 text-left">Ganti Password</h3><p className="text-xs text-gray-500">Ubah password login Anda</p></div>
            </div>
          </button>
        </div>

        {showPw && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setShowPw(false)}>
            <form onSubmit={changePassword} className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-slate-800 mb-4">Ganti Password</h3>
              <div className="space-y-3">
                <div className="relative">
                  <input type={showOld ? 'text' : 'password'} value={oldPw} onChange={e => setOldPw(e.target.value)} placeholder="Password lama" className="w-full border rounded-lg px-3 py-2.5 pr-10 text-sm" required />
                  <button type="button" onClick={() => setShowOld(!showOld)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showOld ? <span className="text-xs font-bold">🙈</span> : <span className="text-xs font-bold">👁</span>}
                  </button>
                </div>
                <div className="relative">
                  <input type={showNew ? 'text' : 'password'} value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Password baru" className="w-full border rounded-lg px-3 py-2.5 pr-10 text-sm" required />
                  <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showNew ? <span className="text-xs font-bold">🙈</span> : <span className="text-xs font-bold">👁</span>}
                  </button>
                </div>
                {pwMsg && <p className={`text-xs ${pwOk ? 'text-green-600' : 'text-red-500'}`}>{pwMsg}</p>}
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button type="button" onClick={() => setShowPw(false)} className="px-4 py-2 text-sm rounded-lg border hover:bg-slate-50">Batal</button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium">{saving ? 'Menyimpan...' : 'Simpan'}</button>
              </div>
            </form>
          </div>
        )}

        <div className="text-center mt-6">
          <a href="/admin/logout" className="text-sm text-gray-400 hover:text-gray-600 inline-flex items-center gap-1"><LogOut className="w-3.5 h-3.5" /> Keluar</a>
        </div>
      </div>
    </div>
  )
}
