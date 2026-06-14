import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import MemberRaporPage from './pages/MemberRaporPage'
import EntryDetailPage from './pages/EntryDetailPage'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename="/rapor">
      <Routes>
        <Route index element={<LoginPage />} />
        <Route path="m/:id" element={<MemberRaporPage />} />
        <Route path="t/:token" element={<EntryDetailPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
