import { useState, useEffect, createContext, useContext } from 'react'
import { Outlet, Link, useLocation, useSearchParams } from 'react-router-dom'
import { Menu, GraduationCap } from 'lucide-react'

export interface AdminContextType {
  period: string
  setPeriod: (p: string) => void
  periods: any[]
}

export const AdminContext = createContext<AdminContextType>({
  period: '',
  setPeriod: () => {},
  periods: [],
})

export function usePeriod() {
  return useContext(AdminContext)
}

const navSections = [
  {
    label: 'Konten Periode',
    items: [
      { label: 'Pengumuman', href: '/admin/pengumuman', icon: '11' },
      { label: 'Artikel', href: '/admin/artikel', icon: '12' },
      { label: 'Kementerian', href: '/admin/departemen', icon: '17' },
      { label: 'Program', href: '/admin/program', icon: '13' },
      { label: 'Tentang Periode', href: '/admin/tentang', icon: '21' },
      { label: 'Galeri', href: '/admin/galeri', icon: '14' },
      { label: 'Statistik', href: '/admin/statistik', icon: '15' },
    ],
  },
  {
    label: 'Superadmin',
    items: [
      { label: 'Anggota', href: '/admin/anggota', icon: '16' },
      { label: 'Kegiatan & Absensi', href: '/admin/activities', icon: 'checklist' },
      { label: 'Rapor Beswan', href: '/admin/rapor', icon: 'file' },
      { label: 'Pengaturan Global', href: '/admin/global', icon: '18' },
      { label: 'Shorten Link', href: '/admin/shortlink', icon: '19' },
      { label: 'WhatsApp Broadcast', href: '/admin/broadcast', icon: '20' },
      { label: 'FAQ Global', href: '/admin/faq-global', icon: '21' },
      { label: 'Template Statistik', href: '/admin/global-stats', icon: '22' },
      { label: 'Manajemen Periode', href: '/admin/periode', icon: '23' },
      { label: 'Manajemen Akun', href: '/admin/akun', icon: '24' },
    ],
  },
]

const iconPaths: Record<string, string> = {
  '11': 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z',
  '12': 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  '13': 'M5 13l4 4L19 7',
  '14': 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
  '15': 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  '16': 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  '17': 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  '18': 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  '19': 'M13.828 10.172a4 4 0 010 5.656l-3 3a4 4 0 11-5.656-5.656l1.5-1.5m6.328-1.328a4 4 0 010-5.656l3-3a4 4 0 015.656 5.656l-1.5 1.5M8 16l8-8',
  '20': 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-9V12a9 9 0 0118 0v4.118c0 3.057-1.85 5.755-4.255 8.005z',
  '21': 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  '22': 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  '23': 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  '24': 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  'checklist': 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  'file': 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
}

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [periods, setPeriods] = useState<any[]>([])
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const period = searchParams.get('period') || ''

  useEffect(() => {
    fetch('/api/cms/periods', { credentials: 'same-origin' })
      .then(r => r.json())
      .then(data => {
        const items = data.items || data || []
        setPeriods(items)
        if (!period && items.length) {
          const active = items.find((p: any) => p.is_active)
          setSearchParams({ period: active?.label || items[0]?.label })
        }
      })
      .catch(() => {})
  }, [])

  function isActive(href: string) {
    const path = location.pathname
    // Match exact or prefix (for nested routes like /admin/rapor/entries)
    if (href === '/admin/rapor') return path.startsWith('/admin/rapor')
    if (href === '/admin/activities') return path === '/admin/activities'
    return path === href
  }

  return (
    <AdminContext.Provider value={{ period, setPeriod: (p) => setSearchParams({ period: p }), periods }}>
      <div className="bg-slate-100 h-screen flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-blue-900 text-white px-6 py-3 flex items-center justify-between shadow-lg flex-shrink-0 sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden">
              <Menu className="w-6 h-6" />
            </button>
            <GraduationCap className="w-8 h-8" />
            <span className="font-bold text-lg">PKSE UGM — Admin</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/" className="bg-blue-700 hover:bg-blue-600 text-white text-sm px-3 py-1.5 rounded-lg transition">Web Utama</a>
            <a href="/admin/logout" className="bg-blue-800 hover:bg-red-700 text-white text-sm px-3 py-1.5 rounded-lg transition">Keluar</a>
          </div>
        </header>

        {/* Period bar */}
        <div className="bg-blue-800 px-6 py-2 flex items-center gap-4 flex-shrink-0 text-white text-sm">
          <span className="text-blue-200 flex-shrink-0">Periode:</span>
          <select
            value={period}
            onChange={e => setSearchParams({ period: e.target.value })}
            className="px-3 py-1.5 rounded-md text-sm font-medium bg-white text-blue-900 border border-blue-300"
          >
            {periods.map(p => (
              <option key={p.label} value={p.label}>{p.display_name}{p.is_active ? ' \u2606' : ''}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <aside className="w-56 bg-blue-900 text-blue-100 flex-shrink-0 overflow-y-auto">
            <nav className="p-3 space-y-1">
              {navSections.map((section, si) => (
                <div key={si}>
                  <div className="px-3 py-2 text-xs font-semibold text-blue-400 uppercase tracking-wider">{section.label}</div>
                  {section.items.map((item, ii) => (
                    <Link
                      key={ii}
                      to={`${item.href}?period=${period}`}
                      className={`sidebar-item w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${isActive(item.href) ? 'active' : ''}`}
                    >
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={iconPaths[item.icon] || ''} />
                      </svg>
                      {item.label}
                    </Link>
                  ))}
                </div>
              ))}
            </nav>
          </aside>

          {/* Main content */}
          <main className="flex-1 overflow-y-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </AdminContext.Provider>
  )
}
