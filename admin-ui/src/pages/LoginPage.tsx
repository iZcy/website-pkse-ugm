import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet } from '../lib/api'

export default function LoginPage() {
  const [query, setQuery] = useState('')
  const [nim, setNim] = useState('')
  const [results, setResults] = useState<{name:string;nim:string;id:string}[]>([])
  const [selected, setSelected] = useState<{name:string;nim:string;id:string}|null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const navigate = useNavigate()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setShowDropdown(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function search(q: string) {
    setQuery(q)
    if (q.length < 2) { setResults([]); setShowDropdown(false); return }
    try {
      const data = await apiGet(`/rapor/api/search?q=${encodeURIComponent(q)}`)
      const mapped = (data || []).map((m: any) => ({ name: m.full_name || m.name, nim: m.nim, id: m.id || '' }))
      setResults(mapped)
      setShowDropdown(mapped.length > 0)
    } catch { setResults([]) }
  }

  function select(r: typeof results[0]) {
    setSelected(r); setQuery(r.name); setNim(r.nim); setResults([]); setShowDropdown(false); setError('')
  }

  async function login(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const name = selected?.name || query.trim()
    const pass = selected ? nim : nim
    if (!name || !pass) { setError('Isi nama dan NIM'); return }
    setLoading(true)
    try {
      const r = await fetch('/rapor/api/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({name, nim: pass, member_id: selected?.id || ''}),
      })
      const d = await r.json()
      if (r.ok && d.member_id) {
        document.cookie = `rapor_auth=${d.token};path=/;max-age=2592000`
        navigate(`/rapor/m/${d.member_id}`)
      } else {
        setError(d.error || 'Login gagal')
      }
    } catch { setError('Gagal terhubung') }
    setLoading(false)
  }

  return (
    <div style={{background:'linear-gradient(135deg,#f0fdf4 0%,#ecfdf5 50%,#f0fdf4 100%)',minHeight:'100vh',fontFamily:'Plus Jakarta Sans,sans-serif'}}>
      <div className="max-w-sm mx-auto px-4 pt-16">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur rounded-full px-4 py-2 text-sm text-green-700 font-medium shadow-sm mb-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z"/></svg>
            PKSE UGM
          </div>
          <h1 className="text-2xl font-bold text-green-900">Rapor Beswan</h1>
          <p className="text-sm text-green-600 mt-1">Masuk untuk melihat rapor Anda</p>
        </div>

        <form onSubmit={login} className="bg-white rounded-2xl p-6 shadow-sm">
          <div ref={ref} className="relative mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
            <input value={query} onChange={e => search(e.target.value)} onFocus={() => results.length > 0 && setShowDropdown(true)}
              placeholder="Ketik nama..." className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-200" />
            {showDropdown && (
              <div className="absolute top-full left-0 right-0 z-50 bg-white border rounded-xl mt-1 shadow-lg max-h-48 overflow-y-auto">
                {results.map(r => (
                  <div key={r.id} onClick={() => select(r)} className="px-4 py-3 cursor-pointer hover:bg-green-50 border-b border-gray-50 last:border-0">
                    <div className="text-sm font-medium text-gray-800">{r.name}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selected && (
            <div className="mb-4 p-3 bg-green-50 rounded-xl text-sm text-green-700">
              <span className="font-medium">{selected.name}</span>
              <span className="text-green-500 ml-2">· NIM otomatis terisi</span>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">NIM (password)</label>
            <input type="password" value={nim} onChange={e => setNim(e.target.value)}
              placeholder="Masukkan NIM Anda" className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-200" />
          </div>

          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl py-3 font-semibold text-sm disabled:opacity-50">
            {loading ? 'Memeriksa...' : 'Lihat Rapor'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">Masuk sebagai admin? <a href="/login" className="text-green-600 underline">Klik di sini</a></p>
      </div>
    </div>
  )
}
