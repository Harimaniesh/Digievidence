import React, { useEffect, useState } from 'react'
import { API } from '../contexts/AuthContext.jsx'
import { format, parseISO } from 'date-fns'
import { Link2, RefreshCw, ChevronLeft, ChevronRight, ShieldCheck, ShieldAlert } from 'lucide-react'

const BLOCK_TYPE_COLORS = {
  GENESIS:         '#a78bfa',
  EVIDENCE_UPLOAD: '#00d4ff',
  ACCESS_LOG:      '#fbbf24',
  VERIFICATION:    '#4ade80',
}

const BLOCK_TYPE_ICONS = {
  GENESIS:         '🌟',
  EVIDENCE_UPLOAD: '📁',
  ACCESS_LOG:      '👁️',
  VERIFICATION:    '✅',
}

function BlockCard({ block }) {
  const [expanded, setExpanded] = useState(false)
  const btype   = block.data?.type || 'UNKNOWN'
  const bcolor  = BLOCK_TYPE_COLORS[btype] || '#6b7280'
  const bicon   = BLOCK_TYPE_ICONS[btype]  || '🔷'

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: `1px solid ${bcolor}33`,
      borderRadius: 'var(--radius-md)',
      marginBottom: 10,
      overflow: 'hidden',
      transition: 'var(--transition)',
    }}>
      {/* Block header */}
      <div
        style={{ padding:'14px 18px', cursor:'pointer', display:'flex', alignItems:'center', gap:14 }}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Index badge */}
        <div style={{
          width:44, height:44, borderRadius:8, flexShrink:0,
          background:`${bcolor}18`, border:`1px solid ${bcolor}44`,
          display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column'
        }}>
          <div style={{ fontSize:8, color:'var(--text-muted)', fontWeight:700 }}>BLOCK</div>
          <div style={{ fontSize:13, fontWeight:800, color:bcolor, fontFamily:'var(--font-mono)' }}>
            #{block.index}
          </div>
        </div>

        {/* Info */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
            <span style={{ fontSize:15 }}>{bicon}</span>
            <span style={{ fontSize:13, fontWeight:700, color:bcolor }}>{btype.replace('_',' ')}</span>
            {block.data?.risk_level && (
              <span className={`risk-badge risk-${block.data.risk_level}`}>{block.data.risk_level}</span>
            )}
          </div>
          <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>
            {block.block_hash?.slice(0,32)}...
          </div>
        </div>

        {/* Timestamp */}
        <div style={{ textAlign:'right', flexShrink:0 }}>
          <div style={{ fontSize:12, color:'var(--text-secondary)' }}>
            {block.timestamp ? format(parseISO(block.timestamp), 'dd MMM yyyy') : '—'}
          </div>
          <div style={{ fontSize:11, color:'var(--text-muted)' }}>
            {block.timestamp ? format(parseISO(block.timestamp), 'HH:mm:ss') : '—'}
          </div>
        </div>

        <div style={{ color:'var(--text-muted)', marginLeft:8 }}>
          {expanded ? '▲' : '▼'}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{
          borderTop:`1px solid ${bcolor}22`, padding:'16px 18px',
          background:`${bcolor}05`
        }}>
          <div className="grid-2">
            {/* Hashes */}
            <div>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:6 }}>
                Block Hash
              </div>
              <code style={{ fontSize:10, color:bcolor, wordBreak:'break-all', display:'block' }}>
                {block.block_hash}
              </code>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.8px', marginTop:12, marginBottom:6 }}>
                Previous Hash
              </div>
              <code style={{ fontSize:10, color:'var(--text-muted)', wordBreak:'break-all', display:'block' }}>
                {block.previous_hash}
              </code>
            </div>

            {/* Block data */}
            <div>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:6 }}>
                Block Data
              </div>
              <pre style={{
                fontSize:10, color:'var(--text-secondary)', fontFamily:'var(--font-mono)',
                background:'var(--bg-secondary)', borderRadius:6, padding:10,
                overflow:'auto', maxHeight:180
              }}>
                {JSON.stringify(block.data, null, 2)}
              </pre>
            </div>
          </div>

          <div style={{ display:'flex', gap:16, marginTop:12, flexWrap:'wrap' }}>
            <div>
              <span style={{ fontSize:10, color:'var(--text-muted)' }}>Nonce: </span>
              <code style={{ fontSize:10, color:'var(--text-secondary)' }}>{block.nonce}</code>
            </div>
            <div>
              <span style={{ fontSize:10, color:'var(--text-muted)' }}>Chain Height: </span>
              <code style={{ fontSize:10, color:'var(--text-secondary)' }}>{block.index}</code>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function LedgerPage() {
  const [data, setData]     = useState({ blocks:[], total:0, stats:{}, total_pages:1 })
  const [page, setPage]     = useState(1)
  const [loading, setLoading] = useState(true)
  const [chainOk, setChainOk] = useState(null)
  const [verifying, setVerifying] = useState(false)

  const fetchLedger = (p = page) => {
    setLoading(true)
    API.get(`/blockchain/ledger?page=${p}&limit=15`).then(r => {
      setData(r.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  const verifyChain = async () => {
    setVerifying(true)
    try {
      const r = await API.get('/blockchain/verify')
      setChainOk(r.data.is_valid)
    } finally {
      setVerifying(false)
    }
  }

  useEffect(() => { fetchLedger(page) }, [page])

  const s = data.stats || {}

  return (
    <div>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <div className="section-title">⛓️ Blockchain Ledger</div>
          <div className="section-subtitle">
            {s.total_blocks ?? 0} blocks · Chain height {s.chain_height ?? 0}
          </div>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => fetchLedger(page)}>
            <RefreshCw size={13} /> Refresh
          </button>
          <button className="btn btn-primary btn-sm" onClick={verifyChain} disabled={verifying}>
            {verifying ? <div className="loading-spinner" style={{ width:13, height:13 }} /> : <ShieldCheck size={13} />}
            Verify Chain
          </button>
        </div>
      </div>

      {/* Chain integrity banner */}
      {chainOk !== null && (
        <div className="animate-in" style={{
          display:'flex', alignItems:'center', gap:12, padding:'14px 20px',
          borderRadius:'var(--radius-md)', marginBottom:20,
          background: chainOk ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)',
          border:`1px solid ${chainOk ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`,
        }}>
          {chainOk
            ? <ShieldCheck size={22} color="var(--accent-green)" />
            : <ShieldAlert size={22} color="var(--accent-red)" />
          }
          <div>
            <div style={{ fontWeight:700, color: chainOk ? 'var(--accent-green)' : 'var(--accent-red)' }}>
              {chainOk ? '✅ Blockchain Integrity Verified' : '❌ Chain Integrity Compromised!'}
            </div>
            <div style={{ fontSize:12, color:'var(--text-muted)' }}>
              {chainOk
                ? 'All blocks hash correctly. Evidence has not been tampered with.'
                : 'One or more blocks have invalid hashes. Immediate investigation required!'
              }
            </div>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap' }}>
        {[
          { label:'Total Blocks',        value:s.total_blocks       ?? 0, color:'#00d4ff' },
          { label:'Evidence Blocks',     value:s.evidence_blocks    ?? 0, color:'#00d4ff' },
          { label:'Access Log Blocks',   value:s.access_log_blocks  ?? 0, color:'#fbbf24' },
          { label:'Verification Blocks', value:s.verification_blocks ?? 0, color:'#4ade80' },
        ].map(st => (
          <div key={st.label} className="card" style={{ padding:'12px 18px', flex:'1 1 140px' }}>
            <div style={{ fontSize:22, fontWeight:800, fontFamily:'var(--font-mono)', color:st.color }}>{st.value}</div>
            <div style={{ fontSize:11, color:'var(--text-muted)' }}>{st.label}</div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div style={{ display:'flex', gap:12, marginBottom:16, flexWrap:'wrap' }}>
        {Object.entries(BLOCK_TYPE_COLORS).map(([type, color]) => (
          <div key={type} style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'var(--text-secondary)' }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:color }} />
            {BLOCK_TYPE_ICONS[type]} {type.replace('_',' ')}
          </div>
        ))}
      </div>

      {/* Blocks list */}
      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:60 }}>
          <div className="loading-spinner" style={{ width:36, height:36 }} />
        </div>
      ) : data.blocks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">⛓️</div>
          <div className="empty-text">No blocks yet</div>
          <div className="empty-sub">Upload evidence to start the chain</div>
        </div>
      ) : (
        data.blocks.map(b => <BlockCard key={b.index} block={b} />)
      )}

      {/* Pagination */}
      {data.total_pages > 1 && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12, marginTop:20 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}>
            <ChevronLeft size={14} />
          </button>
          <span style={{ fontSize:13, color:'var(--text-muted)' }}>
            Page {page} of {data.total_pages}
          </span>
          <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.min(data.total_pages,p+1))} disabled={page===data.total_pages}>
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
