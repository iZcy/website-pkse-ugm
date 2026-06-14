import { useState, useEffect, createContext, useContext } from 'react'
import { Outlet, Link, useLocation, useSearchParams } from 'react-router-dom'
import { Menu } from 'lucide-react'

export interface AdminContextType { period: string; setPeriod: (p: string) => void; periods: any[] }
export const AdminContext = createContext<AdminContextType>({ period: '', setPeriod: () => {}, periods: [] })
export function usePeriod() { return useContext(AdminContext) }

const SECTIONS = [
  { label: 'Konten', items: [
    { label: 'Pengumuman', href: 'pengumuman' }, { label: 'Artikel', href: 'artikel' },
    { label: 'Program', href: 'program' }, { label: 'Tentang Periode', href: 'tentang' },
    { label: 'Galeri', href: 'galeri' }, { label: 'Statistik', href: 'statistik' },
  ]},
  { label: 'Struktur', items: [{ label: 'Kementerian', href: 'departemen' }] },
  { label: 'Kegiatan', items: [
    { label: 'Kegiatan & Absensi', href: 'activities' }, { label: 'Rapor Beswan', href: 'rapor' },
  ]},
  { label: 'Superadmin', superOnly: true, items: [
    { label: 'Anggota', href: 'anggota' }, { label: 'Pengaturan Global', href: 'global' },
    { label: 'Shortlink', href: 'shortlink' }, { label: 'Broadcast', href: 'broadcast' },
    { label: 'FAQ Global', href: 'faq-global' }, { label: 'Statistik Global', href: 'global-stats' },
    { label: 'Periode', href: 'periode' }, { label: 'Akun', href: 'akun' },
  ]},
]

export default function AdminLayout() {
  const loc = useLocation()
  const [sp, setSP] = useSearchParams()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [role, setRole] = useState('')
  const [periods, setPeriods] = useState<any[]>([])
  const period = sp.get('period') || ''

  useEffect(() => {
    fetch('/api/admin/session', {credentials:'same-origin'}).then(r=>r.json()).then(d=>setRole(d.role||'')).catch(()=>{})
    fetch('/api/cms/periods', {credentials:'same-origin'}).then(r=>r.json()).then((d:any[])=>{
      setPeriods(d)
      if (!sp.get('period') && d.length>0) setSP({period: (d.find((p:any)=>p.is_active)||d[0]).label})
    }).catch(()=>{})
  }, [])

  function setPeriod(p: string) { setSP({period: p}) }

  const visibleSections = SECTIONS.filter(s => !s.superOnly || role === 'superadmin')

  return (
    <AdminContext.Provider value={{period,setPeriod,periods}}>
      <div className="flex min-h-screen bg-slate-50">
        {sidebarOpen && <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={()=>setSidebarOpen(false)} />}
        <aside className={`fixed lg:sticky top-0 h-screen z-50 w-60 bg-white border-r border-slate-200 flex flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform`}>
          <div className="p-4 border-b flex items-center justify-between">
            <Link to="/admin" className="font-bold text-slate-800 text-sm">PKSE UGM</Link>
            <button onClick={()=>setSidebarOpen(!sidebarOpen)} className="lg:hidden"><Menu className="w-5 h-5"/></button>
          </div>
          <div className="px-3 py-2 border-b flex flex-wrap gap-1">
            {periods.map((p:any)=>(
              <button key={p.label} onClick={()=>setPeriod(p.label)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-all ${p.label===period ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'}`}>{p.label}</button>
            ))}
          </div>
          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {visibleSections.map((sec,si)=>(
              <div key={si}>
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 pt-4 pb-1">{sec.label}</div>
                {sec.items.map(item=>(
                  <Link key={item.href} to={`/${item.href}?period=${period}`}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${loc.pathname.includes('/'+item.href) ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'}`}>
                    {item.label}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
        </aside>
        <main className="flex-1 p-6 overflow-auto min-h-screen">
          <button onClick={()=>setSidebarOpen(true)} className="lg:hidden mb-4 p-2 rounded-lg border bg-white"><Menu className="w-5 h-5"/></button>
          <Outlet />
        </main>
      </div>
    </AdminContext.Provider>
  )
}
