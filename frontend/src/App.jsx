import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx'

import LoginPage       from './pages/LoginPage.jsx'
import DashboardPage   from './pages/DashboardPage.jsx'
import EvidenceUploadPage from './pages/EvidenceUploadPage.jsx'
import LedgerPage      from './pages/LedgerPage.jsx'
import AccessLogsPage  from './pages/AccessLogsPage.jsx'
import VerificationPage from './pages/VerificationPage.jsx'
import CourtPortalPage from './pages/CourtPortalPage.jsx'
import EvidenceListPage from './pages/EvidenceListPage.jsx'

import Sidebar from './components/Layout/Sidebar.jsx'
import TopBar  from './components/Layout/TopBar.jsx'

function ProtectedLayout({ children, title, subtitle }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}>
      <div className="loading-spinner" style={{ width:40, height:40 }} />
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <TopBar title={title} subtitle={subtitle} />
        <div className="page-body animate-in">
          {children}
        </div>
      </div>
    </div>
  )
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />

      {/* Public court portal */}
      <Route path="/court" element={<CourtPortalPage />} />
      <Route path="/court/verify/:hash" element={<CourtPortalPage />} />

      {/* Protected routes */}
      <Route path="/" element={
        <ProtectedLayout title="Investigator Dashboard" subtitle="Evidence Chain of Custody System">
          <DashboardPage />
        </ProtectedLayout>
      } />
      <Route path="/upload" element={
        <ProtectedLayout title="Upload Evidence" subtitle="Secure evidence submission with blockchain registration">
          <EvidenceUploadPage />
        </ProtectedLayout>
      } />
      <Route path="/evidence" element={
        <ProtectedLayout title="Evidence Registry" subtitle="All registered digital evidence">
          <EvidenceListPage />
        </ProtectedLayout>
      } />
      <Route path="/ledger" element={
        <ProtectedLayout title="Blockchain Ledger" subtitle="Immutable tamper-proof chain of blocks">
          <LedgerPage />
        </ProtectedLayout>
      } />
      <Route path="/access-logs" element={
        <ProtectedLayout title="Access Tracking" subtitle="Complete audit trail of evidence access">
          <AccessLogsPage />
        </ProtectedLayout>
      } />
      <Route path="/verify" element={
        <ProtectedLayout title="Verification Module" subtitle="Hash re-calculation and integrity verification">
          <VerificationPage />
        </ProtectedLayout>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#111827',
              color: '#f0f4ff',
              border: '1px solid rgba(0,212,255,0.2)',
              fontFamily: 'Inter, sans-serif',
              fontSize: '13px',
            },
            success: { iconTheme: { primary: '#4ade80', secondary: '#111827' } },
            error:   { iconTheme: { primary: '#f87171', secondary: '#111827' } },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  )
}
