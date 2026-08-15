import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import toast from 'react-hot-toast'
import { Shield, Lock, User, Eye, EyeOff, AlertCircle } from 'lucide-react'

const DEMO_ACCOUNTS = [
  { username:'admin',    password:'admin123',    role:'System Admin',        badge:'ADM-001', color:'#ff6b6b' },
  { username:'inv001',   password:'invest123',   role:'Investigator',         badge:'INV-001', color:'#00d4ff' },
  { username:'forensic', password:'forensic123', role:'Forensic Analyst',     badge:'FOR-001', color:'#a78bfa' },
  { username:'court',    password:'court123',    role:'Court Viewer',         badge:'CRT-001', color:'#ffd700' },
  { username:'lawfirm',  password:'lawfirm123',  role:'Law Firm',            badge:'LAW-001', color:'#4ade80' },
]

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const { login }  = useAuth()
  const navigate   = useNavigate()

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(username.trim(), password)
      toast.success(`Welcome, ${user.name}!`)
      navigate('/')
    } catch (err) {
      const msg = err.response?.data?.error || 'Login failed. Check credentials.'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (acc) => {
    setUsername(acc.username)
    setPassword(acc.password)
    setError('')
  }

  return (
    <div className="login-page">
      {/* Background glows */}
      <div style={{
        position:'fixed', width:500, height:500, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(0,212,255,0.06) 0%, transparent 70%)',
        top:-100, left:-100, pointerEvents:'none'
      }} />
      <div style={{
        position:'fixed', width:400, height:400, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(167,139,250,0.06) 0%, transparent 70%)',
        bottom:-100, right:-100, pointerEvents:'none'
      }} />

      <div style={{ width:'100%', maxWidth: 920, display:'flex', gap:32, alignItems:'flex-start', zIndex:1 }}>
        {/* Left: Demo accounts */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ marginBottom:8 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:12 }}>
              Demo Accounts
            </div>
            {DEMO_ACCOUNTS.map(acc => (
              <button
                key={acc.username}
                onClick={() => fillDemo(acc)}
                style={{
                  width:'100%', display:'flex', alignItems:'center', gap:12,
                  padding:'10px 14px', borderRadius:8,
                  background:'var(--bg-card)', border:`1px solid rgba(255,255,255,0.07)`,
                  cursor:'pointer', marginBottom:8, transition:'all 0.2s', textAlign:'left'
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor=acc.color+'55'; e.currentTarget.style.background='var(--bg-card-hover)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(255,255,255,0.07)'; e.currentTarget.style.background='var(--bg-card)' }}
              >
                <div style={{
                  width:34, height:34, borderRadius:'50%',
                  background:`linear-gradient(135deg, ${acc.color}, ${acc.color}44)`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:14, fontWeight:700, color:'var(--bg-primary)', flexShrink:0
                }}>
                  {acc.role.charAt(0)}
                </div>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>{acc.role}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>
                    {acc.username} / {acc.password}
                  </div>
                </div>
                <span className="badge" style={{ background:`${acc.color}18`, color:acc.color, border:`1px solid ${acc.color}33`, fontSize:9 }}>
                  {acc.badge}
                </span>
              </button>
            ))}
          </div>

          {/* Feature tags */}
          <div className="card" style={{ padding:16 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:10 }}>
              System Features
            </div>
            {[
              '⛓️ Blockchain-Immutable Ledger',
              '🔐 SHA-256 Cryptographic Hashing',
              '🤖 AI Evidence Summarization',
              '📱 QR Code Court Verification',
              '👁️ Complete Access Audit Trail',
              '⚖️ Role-Based Access Control',
            ].map(f => (
              <div key={f} style={{ fontSize:12, color:'var(--text-secondary)', padding:'4px 0', borderBottom:'1px solid rgba(0,212,255,0.05)' }}>
                {f}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Login form */}
        <div className="login-card" style={{ flexShrink:0 }}>
          <div className="login-logo">
            <div style={{ fontSize:44, marginBottom:8 }}>⛓️</div>
            <div className="login-brand">CYBERFORENSICS</div>
            <div style={{ fontSize:12, color:'var(--accent-cyan)', letterSpacing:1, marginTop:2, fontWeight:600 }}>
              Evidence Chain of Custody
            </div>
            <div className="login-subtitle">Secure access for authorized personnel only</div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Badge / Username</label>
              <div style={{ position:'relative' }}>
                <User size={15} style={{
                  position:'absolute', left:12, top:'50%', transform:'translateY(-50%)',
                  color:'var(--text-muted)', pointerEvents:'none'
                }} />
                <input
                  id="login-username"
                  type="text"
                  className="form-input"
                  style={{ paddingLeft:36 }}
                  placeholder="Enter username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position:'relative' }}>
                <Lock size={15} style={{
                  position:'absolute', left:12, top:'50%', transform:'translateY(-50%)',
                  color:'var(--text-muted)', pointerEvents:'none'
                }} />
                <input
                  id="login-password"
                  type={showPw ? 'text' : 'password'}
                  className="form-input"
                  style={{ paddingLeft:36, paddingRight:40 }}
                  placeholder="Enter password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  style={{
                    position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
                    background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)'
                  }}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                display:'flex', alignItems:'center', gap:7, padding:'10px 12px',
                background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.3)',
                borderRadius:6, marginBottom:16, fontSize:13, color:'var(--accent-red)'
              }}>
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            <button id="login-submit" type="submit" className="btn btn-primary btn-lg" style={{ width:'100%', justifyContent:'center' }} disabled={loading}>
              {loading ? <><div className="loading-spinner" style={{ width:16, height:16 }} /> Authenticating...</> : <><Shield size={16} /> Secure Login</>}
            </button>
          </form>

          <div style={{ marginTop:20, textAlign:'center' }}>
            <span style={{ fontSize:12, color:'var(--text-muted)' }}>
              Court verification? &nbsp;
            </span>
            <a href="/court" style={{ fontSize:12, color:'var(--accent-cyan)', textDecoration:'none', fontWeight:600 }}>
              Public Portal →
            </a>
          </div>

          <div style={{ marginTop:20, padding:'12px', background:'rgba(0,212,255,0.04)', borderRadius:8, border:'1px solid var(--border-subtle)' }}>
            <div style={{ fontSize:10, color:'var(--text-muted)', textAlign:'center', lineHeight:1.5 }}>
              🔒 All access is logged on the blockchain ledger.<br />
              Unauthorized access is a criminal offence.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
