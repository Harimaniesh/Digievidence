import React, { useEffect, useState } from 'react'
import { API } from '../contexts/AuthContext.jsx'
import { format, parseISO } from 'date-fns'
import { RefreshCw, Filter, Eye, Upload, ShieldCheck, Scale, Search } from 'lucide-react'

const ACTION_ICONS = {
  UPLOAD:       '📤',
  VIEW:         '👁️',
  VERIFY:       '✅',
  COURT_VERIFY: '⚖️',
  DELETE:       '🗑️',
  LOGIN:        '🔑',
}

const ACTION_COLORS = {
  UPLOAD:       '#00d4ff',
  VIEW:         '#fbbf24',
  VERIFY:       '#4ade80',
  COURT_VERIFY: '#a78bfa',
  DELETE:       '#f87171',
}

const ROLE_COLORS = {
  admin:            '#f87171',
  investigator:     '#00d4ff',
  forensic_analyst: '#a78bfa',
  court_viewer:     '#ffd700',
  law_firm:         '#4ade80',
  court_public:     '#a78bfa',
}

export default function AccessLogsPage() {
  const [logs, setLogs]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('')
  const [actionFilter, setActionFilter] = useState('ALL')

  const fetchLogs = () => {
    setLoading(true)
    API.get('/access-logs').then(r => {
      setLogs(r.data.access_logs || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { fetchLogs() }, [])

  const filtered = logs.filter(l => {
    const matchesText = !filter || (
      l.name?.toLowerCase().includes(filter.toLowerCase()) ||
      l.username?.toLowerCase().includes(filter.toLowerCase()) ||
      l.evidence_id?.toLowerCase().includes(filter.toLowerCase()) ||
      l.reason?.toLowerCase().includes(filter.toLowerCase())
    )
    const matchesAction = actionFilter === 'ALL' || l.action === actionFilter
    return matchesText && matchesAction
  })

  const actionCounts = logs.reduce((acc, l) => {
    acc[l.action] = (acc[l.action] || 0) + 1
    return acc
  }, {})

  return (
    <div>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <div className="section-title">👁️ Access Tracking</div>
          <div className="section-subtitle">Complete audit trail — every access event permanently logged</div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchLogs}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Action filter pills */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:16 }}>
        {['ALL', 'UPLOAD', 'VIEW', 'VERIFY', 'COURT_VERIFY'].map(action => (
          <button
            key={action}
            onClick={() => setActionFilter(action)}
            className={`btn btn-sm ${actionFilter === action ? 'btn-primary' : 'btn-secondary'}`}
          >
            {action === 'ALL' ? '🔎 All' : `${ACTION_ICONS[action] || '·'} ${action}`}
            {action !== 'ALL' && actionCounts[action] ? ` (${actionCounts[action]})` : ''}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ position:'relative', marginBottom:20, maxWidth:400 }}>
        <Search size={14} style={{
          position:'absolute', left:12, top:'50%', transform:'translateY(-50%)',
          color:'var(--text-muted)', pointerEvents:'none'
        }} />
        <input
          id="access-log-search"
          className="form-input"
          style={{ paddingLeft:36 }}
          placeholder="Search by name, user, evidence ID, reason..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
      </div>

      {/* Stats */}
      <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap' }}>
        <div className="card" style={{ padding:'10px 16px', flex:'1 1 120px' }}>
          <div style={{ fontSize:20, fontWeight:800, color:'var(--accent-cyan)', fontFamily:'var(--font-mono)' }}>{logs.length}</div>
          <div style={{ fontSize:11, color:'var(--text-muted)' }}>Total Events</div>
        </div>
        {Object.entries(actionCounts).map(([action, count]) => (
          <div key={action} className="card" style={{ padding:'10px 16px', flex:'1 1 120px' }}>
            <div style={{ fontSize:20, fontWeight:800, color:ACTION_COLORS[action]||'var(--accent-cyan)', fontFamily:'var(--font-mono)' }}>{count}</div>
            <div style={{ fontSize:11, color:'var(--text-muted)' }}>{ACTION_ICONS?.[action] || ''} {action}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:60 }}>
          <div className="loading-spinner" style={{ width:36, height:36 }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👁️</div>
          <div className="empty-text">No access events found</div>
          <div className="empty-sub">Events appear here as evidence is uploaded and accessed</div>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Action</th>
                <th>User</th>
                <th>Role</th>
                <th>Evidence ID</th>
                <th>Reason</th>
                <th>IP Address</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log, i) => (
                <tr key={log.id || i}>
                  <td style={{ color:'var(--text-muted)', fontFamily:'var(--font-mono)', fontSize:11 }}>{i+1}</td>
                  <td>
                    <span style={{
                      display:'inline-flex', alignItems:'center', gap:5,
                      padding:'3px 8px', borderRadius:20, fontSize:11, fontWeight:700,
                      background: `${ACTION_COLORS[log.action]||'#6b7280'}15`,
                      color: ACTION_COLORS[log.action] || 'var(--text-secondary)',
                      border:`1px solid ${ACTION_COLORS[log.action]||'#6b7280'}33`
                    }}>
                      {ACTION_ICONS[log.action] || '·'} {log.action}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight:600, fontSize:13 }}>{log.name}</div>
                    <div style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>{log.username}</div>
                  </td>
                  <td>
                    <span className="badge" style={{
                      background:`${ROLE_COLORS[log.role]||'#6b7280'}18`,
                      color:ROLE_COLORS[log.role]||'var(--text-muted)',
                      border:`1px solid ${ROLE_COLORS[log.role]||'#6b7280'}33`
                    }}>
                      {log.role}
                    </span>
                  </td>
                  <td>
                    <code style={{ fontSize:10, color:'var(--accent-cyan)' }}>
                      {log.evidence_id?.slice(0,12)}...
                    </code>
                  </td>
                  <td style={{ fontSize:12, color:'var(--text-secondary)', maxWidth:200 }}>
                    <span title={log.reason}>
                      {log.reason?.length > 40 ? log.reason.slice(0,40)+'…' : log.reason || '—'}
                    </span>
                  </td>
                  <td style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-muted)' }}>
                    {log.ip_address}
                  </td>
                  <td style={{ fontSize:11, color:'var(--text-secondary)', whiteSpace:'nowrap' }}>
                    {log.timestamp ? format(parseISO(log.timestamp), 'dd MMM yyyy HH:mm:ss') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Blockchain notice */}
      <div style={{
        marginTop:20, padding:'12px 16px',
        background:'rgba(0,212,255,0.04)', border:'1px solid var(--border-subtle)',
        borderRadius:'var(--radius-md)', fontSize:12, color:'var(--text-muted)',
        display:'flex', alignItems:'center', gap:8
      }}>
        <span>⛓️</span>
        All access events are permanently written to the blockchain ledger as ACCESS_LOG blocks.
        They cannot be deleted or modified.
      </div>
    </div>
  )
}
