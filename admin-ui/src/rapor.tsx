import './index.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import MemberRaporPage from './pages/MemberRaporPage'
import EntryDetailPage from './pages/EntryDetailPage'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename="/rapor">
      <Routes>
        <Route index element={<Navigate to="/login" replace />} />
        <Route path="m/:id" element={<MemberRaporPage />} />
        <Route path="t/:token" element={<EntryDetailPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
