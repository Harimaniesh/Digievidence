import React, { useEffect, useState } from 'react'
import { Shield, Clock } from 'lucide-react'
import { API } from '../../contexts/AuthContext.jsx'
import { format } from 'date-fns'

export default function TopBar({ title, subtitle }) {
  const [chainOk, setChainOk] = useState(true)
  const [time, setTime]       = useState(new Date())

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Chain integrity check on mount
  useEffect(() => {
    API.get('/blockchain/verify').then(r => setChainOk(r.data.is_valid)).catch(() => {})
  }, [])

  return (
    <header className="topbar">
      <div>
        <div className="topbar-title">{title}</div>
        {subtitle && <div className="topbar-subtitle">{subtitle}</div>}
      </div>

      <div className="topbar-spacer" />

      {/* Live clock */}
      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
        <Clock size={11} style={{ display:'inline', marginRight:5, verticalAlign:'middle' }} />
        {format(time, 'dd MMM yyyy HH:mm:ss')}
      </div>

      {/* Chain integrity status */}
      <div className={`topbar-badge chain-status`} style={
        chainOk
          ? {}
          : { background:'rgba(248,113,113,0.1)', color:'var(--accent-red)', borderColor:'rgba(248,113,113,0.2)' }
      }>
        <div className="chain-status-dot" style={chainOk ? {} : { background:'var(--accent-red)' }} />
        <Shield size={12} />
        {chainOk ? 'Chain Intact' : 'Chain Alert!'}
      </div>
    </header>
  )
}
