import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AdminLayout from './components/AdminLayout'
import ActivitiesPage from './pages/ActivitiesPage'
import RaporPage from './pages/RaporPage'
import RaporEntriesPage from './pages/RaporEntriesPage'
import PengumumanPage from './pages/PengumumanPage'
import ArtikelPage from './pages/ArtikelPage'
import DepartemenPage from './pages/DepartemenPage'
import ProgramPage from './pages/ProgramPage'
import TentangPage from './pages/TentangPage'
import GaleriPage from './pages/GaleriPage'
import StatistikPage from './pages/StatistikPage'
import AnggotaPage from './pages/AnggotaPage'
import GlobalPage from './pages/GlobalPage'
import ShortlinkPage from './pages/ShortlinkPage'
import BroadcastPage from './pages/BroadcastPage'
import FAQPage from './pages/FAQPage'
import GlobalStatsPage from './pages/GlobalStatsPage'
import PeriodePage from './pages/PeriodePage'
import AkunPage from './pages/AkunPage'

export default function App() {
  return (
    <BrowserRouter basename="/admin">
      <Routes>
        <Route path="" element={<AdminLayout />}>
          <Route index element={<Navigate to="pengumuman" replace />} />
          <Route path="pengumuman" element={<PengumumanPage />} />
          <Route path="artikel" element={<ArtikelPage />} />
          <Route path="departemen" element={<DepartemenPage />} />
          <Route path="program" element={<ProgramPage />} />
          <Route path="tentang" element={<TentangPage />} />
          <Route path="galeri" element={<GaleriPage />} />
          <Route path="statistik" element={<StatistikPage />} />
          <Route path="anggota" element={<AnggotaPage />} />
          <Route path="activities" element={<ActivitiesPage />} />
          <Route path="rapor" element={<RaporPage />} />
          <Route path="rapor/entries" element={<RaporEntriesPage />} />
          <Route path="global" element={<GlobalPage />} />
          <Route path="shortlink" element={<ShortlinkPage />} />
          <Route path="broadcast" element={<BroadcastPage />} />
          <Route path="faq-global" element={<FAQPage />} />
          <Route path="global-stats" element={<GlobalStatsPage />} />
          <Route path="periode" element={<PeriodePage />} />
          <Route path="akun" element={<AkunPage />} />
          <Route path="*" element={<Navigate to="pengumuman" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
