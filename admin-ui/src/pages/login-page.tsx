import { useState, useRef, useEffect } from 'react'
import ReactDOM from 'react-dom/client'

export default function LoginPage() {
  const [query, setQuery] = useState('')
  const [password, setPassword] = useState('')
  const [results, setResults] = useState<{name:string;nim:string;id:string}[]>([])
  const [selected, setSelected] = useState<{name:string;nim:string;id:string}|null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setShowDropdown(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function search(q: string) {
    setQuery(q); setSelected(null)
    if (q.length < 2) { setResults([]); setShowDropdown(false); return }
    try {
      const data = await (await fetch(`/rapor/api/search?q=${encodeURIComponent(q)}`)).json()
      setResults(data || [])
      setShowDropdown((data || []).length > 0)
    } catch { setResults([]) }
  }

  function select(r: typeof results[0]) {
    setSelected(r); setQuery(r.name); setResults([]); setShowDropdown(false); setError('')
  }

  async function doLogin(e: React.FormEvent) {
    e.preventDefault(); setError('')
    const user = selected?.nim || query.trim()
    const pass = password
    if (!user || !pass) { setError('Isi username/NIM dan password'); return }
    setLoading(true)
    const form = new URLSearchParams()
    form.set('username', user); form.set('password', pass)
    try {
      const r = await fetch('/login', { method: 'POST', body: form, redirect: 'follow' })
      if (r.redirected) window.location.href = r.url
      else setError('Login gagal')
    } catch { setError('Gagal terhubung') }
    setLoading(false)
  }

  return (
    <div style={{background:'linear-gradient(135deg,#f0fdf4 0%,#ecfdf5 50%,#f0fdf4 100%)',minHeight:'100vh',fontFamily:'Plus Jakarta Sans,sans-serif'}}
         className="flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur rounded-full px-4 py-2 text-sm text-green-700 font-medium shadow-sm mb-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z"/></svg>
            PKSE UGM
          </div>
          <h1 className="text-2xl font-bold text-green-900">Login</h1>
          <p className="text-sm text-green-600 mt-1">Masuk sebagai anggota atau admin</p>
        </div>

        <form onSubmit={doLogin} className="bg-white rounded-2xl p-6 shadow-sm">
          <div ref={ref} className="relative mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Username / NIM</label>
            <input value={query} onChange={e => search(e.target.value)} onFocus={() => results.length > 0 && setShowDropdown(true)}
              placeholder="Ketik nama atau NIM..." className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-200" />
            {showDropdown && (
              <div className="absolute top-full left-0 right-0 z-50 bg-white border rounded-xl mt-1 shadow-lg max-h-48 overflow-y-auto">
                {results.map(r => (
                  <div key={r.id} onClick={() => select(r)} className="px-4 py-3 cursor-pointer hover:bg-green-50 border-b border-gray-50 last:border-0">
                    <div className="text-sm font-medium text-gray-800">{r.name}</div>
                    <div className="text-xs text-gray-400">{r.nim}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selected && (
            <div className="mb-4 p-3 bg-green-50 rounded-xl text-sm">
              <span className="font-medium text-green-700">{selected.name}</span>
              <span className="text-green-500 ml-2">· NIM: {selected.nim}</span>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Masukkan password" className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-200" />
          </div>

          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl py-3 font-semibold text-sm disabled:opacity-50">
            {loading ? 'Memeriksa...' : 'Masuk'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">Belum punya akun? Login dengan NIM sebagai username &amp; password</p>
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById("root")!).render(<LoginPage />)
