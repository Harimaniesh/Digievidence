import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API } from '../contexts/AuthContext.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import {
  Database, Link2, Eye, ShieldCheck, Upload,
  TrendingUp, AlertTriangle, Clock, ArrowRight
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'

const RISK_COLORS = { CRITICAL:'#f87171', HIGH:'#fbbf24', MEDIUM:'#60a5fa', LOW:'#4ade80', UNKNOWN:'#6b7280' }
const CHART_COLORS = ['#00d4ff','#a78bfa','#4ade80','#fbbf24','#f87171','#60a5fa','#fb923c']

function StatCard({ number, label, icon, color, to }) {
  const navigate = useNavigate()
  return (
    <div className="stat-card" style={{ '--accent-line': color, cursor: to ? 'pointer' : 'default' }}
         onClick={() => to && navigate(to)}>
      <div className="stat-icon" style={{ color }}>{icon}</div>
      <div className="stat-number" style={{ color }}>{number}</div>
      <div className="stat-label">{label}</div>
      {to && (
        <div style={{ marginTop:8, fontSize:11, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:4 }}>
          View all <ArrowRight size={10} />
        </div>
      )}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-subtle)', borderRadius:8, padding:'8px 14px', fontSize:12 }}>
      <div style={{ color:'var(--text-muted)', marginBottom:2 }}>{label}</div>
      <div style={{ color:'var(--accent-cyan)', fontWeight:700 }}>{payload[0].value}</div>
    </div>
  )
}

export default function DashboardPage() {
  const [stats, setStats]   = useState(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    API.get('/dashboard/stats').then(r => {
      setStats(r.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:400 }}>
      <div className="loading-spinner" style={{ width:40, height:40 }} />
    </div>
  )

  const { totals = {}, evidence_by_type = {}, evidence_by_risk = {}, chain_stats = {},
          recent_uploads = [], recent_access = [] } = stats || {}

  const typeChartData = Object.entries(evidence_by_type).map(([name, value]) => ({ name: name.replace(' / ',' / \n'), value }))
  const riskChartData = Object.entries(evidence_by_risk).map(([name, value]) => ({ name, value, fill: RISK_COLORS[name] || '#6b7280' }))

  return (
    <div>
      {/* Welcome banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(0,212,255,0.08) 0%, rgba(167,139,250,0.06) 100%)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px 24px',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize:18, fontWeight:800 }}>
            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {user?.name?.split(' ').pop() || 'Officer'} 👋
          </div>
          <div style={{ fontSize:13, color:'var(--text-muted)', marginTop:3 }}>
            {user?.role_info?.label} · Badge: {user?.badge_id} · {format(new Date(), 'EEEE, dd MMMM yyyy')}
          </div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div className="badge badge-green" style={{ fontSize:12 }}>🛡️ Session Secure</div>
          <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:4 }}>
            All activity logged on blockchain
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <StatCard number={totals.evidence_items ?? 0}    label="Evidence Items"      icon={<Database size={28}/>}    color="#00d4ff" to="/evidence" />
        <StatCard number={totals.blockchain_blocks ?? 0} label="Blockchain Blocks"   icon={<Link2 size={28}/>}       color="#a78bfa" to="/ledger" />
        <StatCard number={totals.access_events ?? 0}     label="Access Events"       icon={<Eye size={28}/>}         color="#fbbf24" to="/access-logs" />
        <StatCard number={totals.active_cases ?? 0}      label="Active Cases"        icon={<TrendingUp size={28}/>}  color="#4ade80" />
      </div>

      {/* Charts Row */}
      <div className="grid-2" style={{ marginBottom:24 }}>
        {/* Evidence by Type */}
        <div className="card">
          <div className="card-header">
            <div className="card-title"><Database size={16}/> Evidence by Type</div>
          </div>
          {typeChartData.length === 0 ? (
            <div className="empty-state" style={{ padding:40 }}>
              <div className="empty-icon">📁</div>
              <div className="empty-text">No evidence yet</div>
              <button className="btn btn-primary btn-sm" style={{ marginTop:12 }} onClick={() => navigate('/upload')}>
                Upload First Evidence
              </button>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={typeChartData} margin={{ left:-20 }}>
                <XAxis dataKey="name" tick={{ fill:'var(--text-muted)', fontSize:10 }} />
                <YAxis tick={{ fill:'var(--text-muted)', fontSize:10 }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[4,4,0,0]}>
                  {typeChartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Risk distribution */}
        <div className="card">
          <div className="card-header">
            <div className="card-title"><AlertTriangle size={16}/> Risk Distribution</div>
          </div>
          {riskChartData.length === 0 ? (
            <div className="empty-state" style={{ padding:40 }}>
              <div className="empty-icon">🎯</div>
              <div className="empty-text">No data yet</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={riskChartData} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                     dataKey="value" nameKey="name" paddingAngle={3}>
                  {riskChartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize:12, color:'var(--text-secondary)' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid-2">
        {/* Recent uploads */}
        <div className="card">
          <div className="card-header">
            <div className="card-title"><Upload size={16}/> Recent Uploads</div>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/evidence')}>View All</button>
          </div>
          {recent_uploads.length === 0 ? (
            <div className="empty-state" style={{ padding:32 }}>
              <div className="empty-icon">📤</div>
              <div className="empty-text">No uploads yet</div>
              <button className="btn btn-primary btn-sm" style={{ marginTop:10 }} onClick={() => navigate('/upload')}>
                Upload Evidence
              </button>
            </div>
          ) : (
            <div>
              {recent_uploads.map(ev => (
                <div key={ev.id} style={{
                  display:'flex', alignItems:'center', gap:12,
                  padding:'10px 0', borderBottom:'1px solid rgba(0,212,255,0.05)'
                }}>
                  <div style={{ fontSize:22, flexShrink:0 }}>
                    {ev.evidence_type_icon || '📁'}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {ev.original_name}
                    </div>
                    <div style={{ fontSize:11, color:'var(--text-muted)' }}>
                      {ev.case_id} · {ev.uploader_name}
                    </div>
                  </div>
                  <div style={{ fontSize:11, color:'var(--text-muted)', flexShrink:0 }}>
                    {ev.uploaded_at ? format(parseISO(ev.uploaded_at), 'dd MMM HH:mm') : '—'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent access */}
        <div className="card">
          <div className="card-header">
            <div className="card-title"><Clock size={16}/> Recent Access Events</div>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/access-logs')}>View All</button>
          </div>
          {recent_access.length === 0 ? (
            <div className="empty-state" style={{ padding:32 }}>
              <div className="empty-icon">👁️</div>
              <div className="empty-text">No access events</div>
            </div>
          ) : (
            <div>
              {recent_access.map((log, i) => (
                <div key={i} style={{
                  display:'flex', alignItems:'center', gap:12,
                  padding:'8px 0', borderBottom:'1px solid rgba(0,212,255,0.05)'
                }}>
                  <div style={{
                    width:28, height:28, borderRadius:'50%',
                    background:'linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:11, fontWeight:700, color:'var(--bg-primary)', flexShrink:0
                  }}>
                    {log.name?.charAt(0) || 'S'}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:600 }}>{log.name}</div>
                    <div style={{ fontSize:11, color:'var(--text-muted)' }}>{log.action} · {log.role}</div>
                  </div>
                  <div style={{ fontSize:10, color:'var(--text-muted)', flexShrink:0 }}>
                    {log.timestamp ? format(parseISO(log.timestamp), 'HH:mm') : '—'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chain stats footer */}
      <div className="card" style={{ marginTop:20 }}>
        <div className="card-title" style={{ marginBottom:16 }}><Link2 size={16}/> Blockchain Health</div>
        <div style={{ display:'flex', gap:32, flexWrap:'wrap' }}>
          {[
            { label:'Total Blocks',         value: chain_stats.total_blocks ?? 0 },
            { label:'Evidence Blocks',       value: chain_stats.evidence_blocks ?? 0 },
            { label:'Access Log Blocks',     value: chain_stats.access_log_blocks ?? 0 },
            { label:'Verification Blocks',   value: chain_stats.verification_blocks ?? 0 },
            { label:'Chain Height',          value: chain_stats.chain_height ?? 0 },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontSize:22, fontWeight:800, fontFamily:'var(--font-mono)', color:'var(--accent-cyan)' }}>{s.value}</div>
              <div style={{ fontSize:11, color:'var(--text-muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
