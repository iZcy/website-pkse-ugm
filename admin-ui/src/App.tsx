import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AdminLayout from './components/AdminLayout'
import ActivitiesPage from './pages/ActivitiesPage'
import RaporPage from './pages/RaporPage'
import RaporEntriesPage from './pages/RaporEntriesPage'
import Placeholder from './pages/Placeholder'

export default function App() {
  const titles: Record<string, string> = {
    pengumuman: 'Pengumuman', artikel: 'Artikel', departemen: 'Kementerian', program: 'Program',
    tentang: 'Tentang Periode', galeri: 'Galeri', statistik: 'Statistik', anggota: 'Anggota',
    global: 'Pengaturan Global', shortlink: 'Shortlink', broadcast: 'WhatsApp Broadcast',
    'faq-global': 'FAQ Global', 'global-stats': 'Template Statistik', periode: 'Manajemen Periode',
    akun: 'Manajemen Akun',
  }

  return (
    <BrowserRouter basename="/admin">
      <Routes>
        <Route path="" element={<AdminLayout />}>
          <Route index element={<Navigate to="pengumuman" replace />} />
          <Route path="activities" element={<ActivitiesPage />} />
          <Route path="rapor" element={<RaporPage />} />
          <Route path="rapor/entries" element={<RaporEntriesPage />} />
          {Object.entries(titles).map(([path, title]) => {
            const P = Placeholder({ title })
            return <Route key={path} path={path} element={<P />} />
          })}
        </Route>
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
