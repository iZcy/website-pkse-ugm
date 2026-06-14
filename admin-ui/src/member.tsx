import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import MemberDashboard from './pages/MemberDashboard'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename="/member">
      <Routes>
        <Route index element={<MemberDashboard />} />
        <Route path="*" element={<Navigate to="/member" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
