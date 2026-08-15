import React, { useEffect, useState } from 'react'
import { API } from '../contexts/AuthContext.jsx'
import { useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { RefreshCw, Search, Shield, ShieldCheck, Eye, QrCode, Filter } from 'lucide-react'
import toast from 'react-hot-toast'

const RISK_ORDER = { CRITICAL:0, HIGH:1, MEDIUM:2, LOW:3 }

function EvidenceRow({ ev, onVerify, onQR }) {
  const ai = ev.ai_summary || {}
  return (
    <tr>
      <td>
        <span style={{ fontSize:20 }}>{ai.evidence_icon || '📁'}</span>
      </td>
      <td>
        <div style={{ fontWeight:600, fontSize:13 }}>{ev.original_name}</div>
        <div style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>
          {ev.id?.slice(0,16)}...
        </div>
      </td>
      <td>
        <span className="badge badge-cyan" style={{ fontSize:10 }}>{ev.case_id}</span>
      </td>
      <td style={{ fontSize:12, color:'var(--text-secondary)' }}>
        {ai.evidence_type || '—'}
      </td>
      <td>
        {ai.risk_level && (
          <span className={`risk-badge risk-${ai.risk_level}`}>{ai.risk_level}</span>
        )}
      </td>
      <td className="hash-cell">{ev.sha256_hash?.slice(0,20)}...</td>
      <td style={{ fontSize:11, color:'var(--text-secondary)' }}>
        {ev.uploader_name}
      </td>
      <td style={{ fontSize:11, color:'var(--text-muted)', whiteSpace:'nowrap' }}>
        {ev.uploaded_at ? format(parseISO(ev.uploaded_at), 'dd MMM yyyy HH:mm') : '—'}
      </td>
      <td>
        <div style={{ display:'flex', gap:6 }}>
          <button className="btn btn-success btn-sm" onClick={() => onVerify(ev)} title="Verify integrity">
            <ShieldCheck size={12} />
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => onQR(ev)} title="Show QR code">
            <QrCode size={12} />
          </button>
        </div>
      </td>
    </tr>
  )
}

function QRModal({ evidence, onClose }) {
  const [qr, setQR] = useState(null)
  useEffect(() => {
    API.get(`/evidence/${evidence.id}/qr`).then(r => setQR(r.data.qr_code)).catch(() => {})
  }, [evidence.id])

  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex',
      alignItems:'center', justifyContent:'center', zIndex:1000, padding:24
    }} onClick={onClose}>
      <div className="card" style={{ maxWidth:360, width:'100%' }} onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
          <div className="card-title">📱 Court Verification QR</div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:20 }}>×</button>
        </div>
        {qr ? (
          <div style={{ textAlign:'center' }}>
            <div className="qr-container" style={{ display:'inline-block' }}>
              <img src={`data:image/png;base64,${qr}`} alt="QR Code" style={{ width:200, height:200 }} />
            </div>
            <div style={{ marginTop:12, fontSize:12, color:'var(--text-muted)' }}>
              {evidence.original_name}
            </div>
            <code style={{ fontSize:10, color:'var(--accent-cyan)', wordBreak:'break-all', display:'block', marginTop:6 }}>
              {evidence.sha256_hash}
            </code>
            <a
              href={`data:image/png;base64,${qr}`}
              download={`qr-${evidence.id?.slice(0,8)}.png`}
              className="btn btn-primary btn-sm"
              style={{ marginTop:12, textDecoration:'none' }}
            >
              Download QR
            </a>
          </div>
        ) : (
          <div style={{ textAlign:'center', padding:32 }}>
            <div className="loading-spinner" style={{ width:32, height:32, margin:'0 auto' }} />
          </div>
        )}
      </div>
    </div>
  )
}

export default function EvidenceListPage() {
  const [evidence, setEvidence] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [riskFilter, setRisk]   = useState('ALL')
  const [qrTarget, setQRTarget] = useState(null)
  const navigate = useNavigate()

  const fetchEvidence = () => {
    setLoading(true)
    API.get('/evidence').then(r => {
      setEvidence(r.data.evidence || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { fetchEvidence() }, [])

  const handleVerify = async ev => {
    try {
      const res = await API.get(`/evidence/${ev.id}/verify?reason=Evidence registry integrity check`)
      if (res.data.is_intact) toast.success('✅ Evidence intact!')
      else toast.error('❌ Evidence may be tampered!')
    } catch { toast.error('Verification failed') }
  }

  const filtered = evidence
    .filter(ev => {
      const ai = ev.ai_summary || {}
      const matchSearch = !search || (
        ev.original_name?.toLowerCase().includes(search.toLowerCase()) ||
        ev.case_id?.toLowerCase().includes(search.toLowerCase()) ||
        ev.uploader_name?.toLowerCase().includes(search.toLowerCase()) ||
        ai.evidence_type?.toLowerCase().includes(search.toLowerCase())
      )
      const matchRisk = riskFilter === 'ALL' || (ev.ai_summary?.risk_level === riskFilter)
      return matchSearch && matchRisk
    })
    .sort((a, b) => {
      const ra = RISK_ORDER[a.ai_summary?.risk_level] ?? 99
      const rb = RISK_ORDER[b.ai_summary?.risk_level] ?? 99
      return ra - rb
    })

  return (
    <div>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <div className="section-title">🗂️ Evidence Registry</div>
          <div className="section-subtitle">{evidence.length} evidence items registered on blockchain</div>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button className="btn btn-secondary btn-sm" onClick={fetchEvidence}><RefreshCw size={13}/> Refresh</button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/upload')}><Shield size={13}/> Upload New</button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ position:'relative', flex:'1 1 280px', maxWidth:400 }}>
          <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }} />
          <input id="evidence-search" className="form-input" style={{ paddingLeft:36 }}
                 placeholder="Search files, cases, types..." value={search}
                 onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display:'flex', gap:6 }}>
          {['ALL','CRITICAL','HIGH','MEDIUM','LOW'].map(r => (
            <button key={r} onClick={() => setRisk(r)}
                    className={`btn btn-sm ${riskFilter===r ? 'btn-primary' : 'btn-secondary'}`}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:60 }}>
          <div className="loading-spinner" style={{ width:36, height:36 }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🗂️</div>
          <div className="empty-text">{search || riskFilter !== 'ALL' ? 'No matching evidence' : 'No evidence registered yet'}</div>
          <button className="btn btn-primary btn-sm" style={{ marginTop:12 }} onClick={() => navigate('/upload')}>
            Upload First Evidence
          </button>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th></th>
                <th>File Name</th>
                <th>Case ID</th>
                <th>Type</th>
                <th>Risk</th>
                <th>SHA-256 Hash</th>
                <th>Uploaded By</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(ev => (
                <EvidenceRow key={ev.id} ev={ev} onVerify={handleVerify} onQR={setQRTarget} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {qrTarget && <QRModal evidence={qrTarget} onClose={() => setQRTarget(null)} />}
    </div>
  )
}
