import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { API } from '../contexts/AuthContext.jsx'
import toast from 'react-hot-toast'
import {
  Upload, FileCheck, AlertCircle, Hash, Link2,
  Download, Cpu, Tag, Shield, ChevronDown, ChevronUp, Copy
} from 'lucide-react'

const EVIDENCE_TYPES_HINT = [
  { icon:'📱', label:'Mobile Data', exts:'.db .sqlite .backup .ab' },
  { icon:'💬', label:'WhatsApp',    exts:'.txt .zip .html' },
  { icon:'📹', label:'CCTV/Video',  exts:'.mp4 .avi .mkv .mov' },
  { icon:'💾', label:'Disk Image',  exts:'.img .dd .iso .e01' },
  { icon:'📧', label:'Email',       exts:'.eml .msg .pst .mbox' },
  { icon:'📋', label:'Log Files',   exts:'.log .evtx .pcap .har' },
]

function CopyBtn({ text }) {
  const copy = () => { navigator.clipboard.writeText(text); toast.success('Copied!') }
  return (
    <button onClick={copy} className="btn btn-secondary btn-sm" title="Copy to clipboard" style={{ padding:'4px 8px' }}>
      <Copy size={12} />
    </button>
  )
}

function ResultPanel({ result }) {
  const [showAI, setShowAI] = useState(true)
  const [showQR, setShowQR] = useState(false)
  const ai = result.ai_summary || {}

  return (
    <div className="animate-in" style={{ marginTop:24 }}>
      {/* Success header */}
      <div style={{
        display:'flex', alignItems:'center', gap:12,
        background:'rgba(74,222,128,0.08)', border:'1px solid rgba(74,222,128,0.3)',
        borderRadius:'var(--radius-md)', padding:'16px 20px', marginBottom:16
      }}>
        <FileCheck size={28} color="var(--accent-green)" />
        <div>
          <div style={{ fontSize:16, fontWeight:800, color:'var(--accent-green)' }}>
            Evidence Successfully Recorded on Blockchain
          </div>
          <div style={{ fontSize:12, color:'var(--text-muted)' }}>
            Block #{result.block_index} · {new Date().toLocaleString()}
          </div>
        </div>
      </div>

      {/* Hash + Block info */}
      <div className="grid-2" style={{ marginBottom:16 }}>
        <div className="card" style={{ padding:16 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:8 }}>
            SHA-256 Hash
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <Hash size={14} color="var(--accent-cyan)" />
            <code style={{ fontSize:11, color:'var(--accent-cyan)', wordBreak:'break-all', flex:1 }}>
              {result.sha256_hash}
            </code>
            <CopyBtn text={result.sha256_hash} />
          </div>
        </div>
        <div className="card" style={{ padding:16 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:8 }}>
            Block Hash
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <Link2 size={14} color="var(--accent-purple)" />
            <code style={{ fontSize:11, color:'var(--accent-purple)', wordBreak:'break-all', flex:1 }}>
              {result.block_hash}
            </code>
            <CopyBtn text={result.block_hash} />
          </div>
        </div>
      </div>

      {/* AI Summary */}
      <div className="card" style={{ marginBottom:16 }}>
        <div
          style={{ display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer' }}
          onClick={() => setShowAI(!showAI)}
        >
          <div className="card-title">
            <Cpu size={16} color="var(--accent-purple)" />
            AI Forensic Analysis
            <span className="badge badge-purple" style={{ marginLeft:8 }}>
              {ai.evidence_type}
            </span>
            <span className={`risk-badge risk-${ai.risk_level}`} style={{ marginLeft:4 }}>
              {ai.risk_level} RISK
            </span>
          </div>
          {showAI ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
        </div>

        {showAI && (
          <div style={{ marginTop:16 }}>
            <div className="ai-panel" style={{ marginBottom:12 }}>
              <div className="ai-label"><Cpu size={11} /> AI Forensic Summary</div>
              <div className="ai-text">{ai.summary}</div>
            </div>

            {ai.recommended_actions?.length > 0 && (
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:'var(--text-secondary)', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.8px' }}>
                  Recommended Actions
                </div>
                {ai.recommended_actions.map((a, i) => (
                  <div key={i} style={{
                    display:'flex', alignItems:'flex-start', gap:8,
                    fontSize:13, color:'var(--text-secondary)', padding:'5px 0',
                    borderBottom:'1px solid rgba(0,212,255,0.05)'
                  }}>
                    <span style={{ color:'var(--accent-cyan)', fontWeight:700, flexShrink:0 }}>{i+1}.</span>
                    {a}
                  </div>
                ))}
              </div>
            )}

            {ai.forensic_tags?.length > 0 && (
              <div style={{ marginTop:12 }}>
                {ai.forensic_tags.map(t => <span key={t} className="tag">{t}</span>)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* QR Code */}
      {result.qr_code && (
        <div className="card">
          <div
            style={{ display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer' }}
            onClick={() => setShowQR(!showQR)}
          >
            <div className="card-title">
              📱 Court Verification QR Code
            </div>
            {showQR ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
          </div>
          {showQR && (
            <div style={{ marginTop:16, display:'flex', alignItems:'flex-start', gap:24, flexWrap:'wrap' }}>
              <div className="qr-container">
                <img src={`data:image/png;base64,${result.qr_code}`} alt="Verification QR" />
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.7 }}>
                  Scan this QR code to instantly verify evidence authenticity. Share with courts, law firms, 
                  and investigators for secure verification without system access.
                </div>
                <div style={{ marginTop:12 }}>
                  <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>Evidence ID:</div>
                  <code style={{ fontSize:12, color:'var(--accent-cyan)' }}>{result.evidence_id}</code>
                </div>
                <a
                  href={`data:image/png;base64,${result.qr_code}`}
                  download={`qr-${result.evidence_id?.slice(0,8)}.png`}
                  className="btn btn-secondary btn-sm"
                  style={{ marginTop:12, textDecoration:'none' }}
                >
                  <Download size={13} /> Download QR PNG
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function EvidenceUploadPage() {
  const [file, setFile]         = useState(null)
  const [caseId, setCaseId]     = useState('')
  const [caseName, setCaseName] = useState('')
  const [desc, setDesc]         = useState('')
  const [reason, setReason]     = useState('')
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress]   = useState(0)
  const [result, setResult]       = useState(null)
  const [error, setError]         = useState('')

  const onDrop = useCallback(accepted => {
    if (accepted.length > 0) {
      setFile(accepted[0])
      setResult(null)
      setError('')
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, multiple: false, maxSize: 500 * 1024 * 1024
  })

  const handleUpload = async e => {
    e.preventDefault()
    if (!file)   { toast.error('Please select a file'); return }
    if (!caseId) { toast.error('Case ID is required'); return }
    if (!reason) { toast.error('Access reason is required'); return }

    setUploading(true)
    setProgress(0)
    setError('')
    setResult(null)

    const fd = new FormData()
    fd.append('file',          file)
    fd.append('case_id',       caseId)
    fd.append('case_name',     caseName)
    fd.append('description',   desc)
    fd.append('access_reason', reason)

    try {
      const res = await API.post('/evidence/upload', fd, {
        onUploadProgress: e => setProgress(Math.round(e.loaded * 100 / e.total)),
      })
      setResult(res.data)
      toast.success('Evidence recorded on blockchain!')
      // Reset form
      setFile(null); setCaseId(''); setCaseName(''); setDesc(''); setReason(''); setProgress(0)
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Upload failed'
      if (err.response?.status === 409) {
        setError(`Duplicate detected: ${msg}`)
        toast.error('Duplicate evidence detected')
      } else {
        setError(msg)
        toast.error(msg)
      }
    } finally {
      setUploading(false)
    }
  }

  const formatBytes = bytes => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024*1024) return `${(bytes/1024).toFixed(1)} KB`
    return `${(bytes/1024/1024).toFixed(2)} MB`
  }

  return (
    <div>
      <div className="section-title">🔐 Evidence Submission</div>
      <div className="section-subtitle">Upload digital evidence for SHA-256 hashing and blockchain registration</div>

      {/* Evidence type hints */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:24 }}>
        {EVIDENCE_TYPES_HINT.map(t => (
          <div key={t.label} style={{
            display:'flex', alignItems:'center', gap:6, padding:'6px 12px',
            background:'var(--bg-card)', border:'1px solid var(--border-subtle)',
            borderRadius:20, fontSize:12, color:'var(--text-secondary)'
          }}>
            <span>{t.icon}</span>
            <span style={{ fontWeight:600 }}>{t.label}</span>
            <span style={{ color:'var(--text-muted)', fontFamily:'var(--font-mono)', fontSize:10 }}>{t.exts}</span>
          </div>
        ))}
      </div>

      <div className="grid-2">
        {/* Upload form */}
        <div>
          <form onSubmit={handleUpload}>
            {/* Dropzone */}
            <div
              {...getRootProps()}
              className={`dropzone ${isDragActive ? 'active' : ''}`}
              style={{ marginBottom:20 }}
            >
              <input {...getInputProps()} id="evidence-file-input" />
              {file ? (
                <div>
                  <div style={{ fontSize:40, marginBottom:8 }}>📁</div>
                  <div style={{ fontSize:15, fontWeight:700, color:'var(--accent-cyan)' }}>{file.name}</div>
                  <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:4 }}>{formatBytes(file.size)}</div>
                  <div style={{ fontSize:12, color:'var(--text-secondary)', marginTop:8 }}>Click or drop to change file</div>
                </div>
              ) : (
                <div>
                  <div className="dropzone-icon">📤</div>
                  <div className="dropzone-title">{isDragActive ? 'Drop evidence here' : 'Drag & Drop Evidence File'}</div>
                  <div className="dropzone-subtitle">or click to browse · Max 500MB</div>
                </div>
              )}
            </div>

            {/* Form fields */}
            <div className="grid-2" style={{ marginBottom:0, gap:12 }}>
              <div className="form-group">
                <label className="form-label">Case ID *</label>
                <input id="case-id-input" className="form-input" placeholder="e.g. CASE-2024-001"
                       value={caseId} onChange={e => setCaseId(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Case Name</label>
                <input id="case-name-input" className="form-input" placeholder="e.g. Operation Blackwater"
                       value={caseName} onChange={e => setCaseName(e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Evidence Description</label>
              <textarea id="evidence-desc" className="form-input" placeholder="Describe the evidence, source, and collection method..."
                        value={desc} onChange={e => setDesc(e.target.value)} style={{ minHeight:80 }} />
            </div>

            <div className="form-group">
              <label className="form-label">Access Reason (Logged on Blockchain) *</label>
              <input id="access-reason-input" className="form-input" placeholder="e.g. Initial evidence intake and registration"
                     value={reason} onChange={e => setReason(e.target.value)} required />
            </div>

            {/* Progress */}
            {uploading && progress > 0 && (
              <div style={{ marginBottom:16 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4, fontSize:12, color:'var(--text-muted)' }}>
                  <span>Uploading & hashing...</span>
                  <span>{progress}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width:`${progress}%` }} />
                </div>
              </div>
            )}

            {error && (
              <div style={{
                display:'flex', alignItems:'center', gap:8, padding:'10px 14px',
                background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.3)',
                borderRadius:8, marginBottom:16, fontSize:13, color:'var(--accent-red)'
              }}>
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <button id="upload-submit-btn" type="submit" className="btn btn-primary btn-lg"
                    style={{ width:'100%', justifyContent:'center' }} disabled={uploading}>
              {uploading
                ? <><div className="loading-spinner" style={{ width:16, height:16 }} /> Processing...</>
                : <><Shield size={16} /> Register on Blockchain</>
              }
            </button>
          </form>
        </div>

        {/* Info panel */}
        <div>
          <div className="card" style={{ marginBottom:16 }}>
            <div className="card-title" style={{ marginBottom:14 }}><Hash size={15}/> What happens on upload?</div>
            {[
              { step:'1', text:'File is received and stored securely', icon:'📥' },
              { step:'2', text:'SHA-256 cryptographic hash is computed', icon:'🔐' },
              { step:'3', text:'AI forensic analysis is generated', icon:'🤖' },
              { step:'4', text:'Hash + metadata written to blockchain', icon:'⛓️' },
              { step:'5', text:'QR code generated for court verification', icon:'📱' },
              { step:'6', text:'Access event logged permanently', icon:'👁️' },
            ].map(s => (
              <div key={s.step} style={{
                display:'flex', alignItems:'center', gap:10, padding:'7px 0',
                borderBottom:'1px solid rgba(0,212,255,0.05)'
              }}>
                <span>{s.icon}</span>
                <span style={{ fontSize:12, color:'var(--text-secondary)' }}>
                  <strong style={{ color:'var(--accent-cyan)' }}>Step {s.step}:</strong> {s.text}
                </span>
              </div>
            ))}
          </div>

          <div style={{
            background:'linear-gradient(135deg, rgba(251,191,36,0.06), rgba(248,113,113,0.04))',
            border:'1px solid rgba(251,191,36,0.2)', borderRadius:'var(--radius-md)', padding:16
          }}>
            <div style={{ fontSize:12, fontWeight:700, color:'var(--accent-amber)', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.8px' }}>
              ⚠️ Legal Notice
            </div>
            <div style={{ fontSize:12, color:'var(--text-secondary)', lineHeight:1.7 }}>
              All uploaded evidence is permanently recorded on an immutable blockchain ledger.
              Ensure you have proper legal authority to submit this evidence. 
              Your identity, badge ID, and timestamp will be cryptographically bound to this submission.
            </div>
          </div>
        </div>
      </div>

      {/* Result panel */}
      {result && <ResultPanel result={result} />}
    </div>
  )
}
