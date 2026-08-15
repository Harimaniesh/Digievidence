import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext.jsx'
import {
  LayoutDashboard, Upload, Database, Link2, Eye,
  ShieldCheck, Scale, LogOut, FileSearch
} from 'lucide-react'

const NAV_ITEMS = [
  { label: 'Dashboard',      to: '/',            icon: LayoutDashboard,  section: 'main' },
  { label: 'Upload Evidence', to: '/upload',      icon: Upload,           section: 'main' },
  { label: 'Evidence Registry', to: '/evidence', icon: FileSearch,        section: 'main' },
  { label: 'Blockchain Ledger', to: '/ledger',   icon: Link2,            section: 'analysis' },
  { label: 'Access Tracking',   to: '/access-logs', icon: Eye,           section: 'analysis' },
  { label: 'Verification',      to: '/verify',   icon: ShieldCheck,      section: 'analysis' },
  { label: 'Court Portal',      to: '/court',    icon: Scale,            section: 'public' },
]

const SECTIONS = {
  main:     'Investigation',
  analysis: 'Analysis & Audit',
  public:   'Public Access',
}

const ROLE_COLORS = {
  admin:            '#ff6b6b',
  investigator:     '#00d4ff',
  forensic_analyst: '#a78bfa',
  court_viewer:     '#ffd700',
  law_firm:         '#4ade80',
}

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const sections = [...new Set(NAV_ITEMS.map(i => i.section))]

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: 'linear-gradient(135deg, #00d4ff, #a78bfa)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, flexShrink: 0
          }}>⛓️</div>
          <div>
            <div className="sidebar-brand">CyberForensics</div>
            <div className="sidebar-tagline">Evidence Chain v1.0</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {sections.map(section => (
          <div key={section}>
            <div className="nav-section-label">{SECTIONS[section]}</div>
            {NAV_ITEMS.filter(i => i.section === section).map(item => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <Icon className="nav-icon" size={17} />
                  {item.label}
                </NavLink>
              )
            })}
          </div>
        ))}
      </nav>

      {/* User footer */}
      {user && (
        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-avatar" style={{
              background: `linear-gradient(135deg, ${ROLE_COLORS[user.role] || '#00d4ff'}, #0a0e1a)`
            }}>
              {user.name?.charAt(0) || 'U'}
            </div>
            <div className="user-info">
              <div className="user-name">{user.name}</div>
              <div className="user-role">{user.role_info?.label || user.role}</div>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', padding: 4, borderRadius: 4,
                display: 'flex', alignItems: 'center',
                transition: 'color 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              <LogOut size={15} />
            </button>
          </div>

          {/* Badge ID */}
          {user.badge_id && (
            <div style={{ marginTop: 8, textAlign: 'center' }}>
              <span className="badge badge-cyan" style={{ fontSize: 10 }}>
                🪪 {user.badge_id}
              </span>
            </div>
          )}
        </div>
      )}
    </aside>
  )
}
