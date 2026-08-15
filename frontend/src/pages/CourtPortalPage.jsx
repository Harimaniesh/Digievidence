import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { ShieldCheck, ShieldAlert, Search, Scale, Hash } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import axios from 'axios'

const PUBLIC_API = axios.create({ baseURL: '/api' })

export default function CourtPortalPage() {
  const { hash: urlHash } = useParams()
  const [hashInput, setHashInput] = useState(urlHash || '')
  const [result, setResult]       = useState(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  useEffect(() => {
    if (urlHash) handleVerify(null, urlHash)
  }, [urlHash])

  const handleVerify = async (e, overrideHash) => {
    e?.preventDefault()
    const h = overrideHash || hashInput.trim()
    if (!h) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await PUBLIC_API.get(`/court/verify/${h}`)
      setResult(res.data)
    } catch (err) {
      setError(err.response?.data?.message || 'No evidence found with this hash.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight:'100vh', background:'var(--bg-primary)',
      padding:'40px 24px', display:'flex', flexDirection:'column', alignItems:'center'
    }}>
      {/* Header */}
      <div className="court-header" style={{ width:'100%', maxWidth:800 }}>
        <div className="court-seal">⚖️</div>
        <div className="court-title">COURT EVIDENCE VERIFICATION PORTAL</div>
        <div className="court-subtitle">
          Secure, public verification of digital evidence authenticity via blockchain
        </div>
        <div style={{ marginTop:12 }}>
          <span className="badge badge-amber">🔒 No Login Required</span>
          <span className="badge badge-cyan" style={{ marginLeft:8 }}>⛓️ Blockchain Verified</span>
        </div>
      </div>

      {/* Search box */}
      <div style={{ width:'100%', maxWidth:800, marginBottom:28 }}>
        <div className="card">
          <div className="card-title" style={{ marginBottom:18 }}>
            <Hash size={16} /> Enter SHA-256 Evidence Hash
          </div>
          <form onSubmit={handleVerify} style={{ display:'flex', gap:10 }}>
            <input
              id="court-hash-input"
              className="form-input"
              style={{ flex:1, fontFamily:'var(--font-mono)', fontSize:13 }}
              placeholder="Enter 64-character SHA-256 hash (e.g. a3f9d2...)"
              value={hashInput}
              onChange={e => setHashInput(e.target.value)}
              maxLength={64}
              spellCheck={false}
            />
            <button id="court-verify-btn" type="submit" className="btn btn-primary" disabled={loading || !hashInput}>
              {loading ? <div className="loading-spinner" style={{ width:16, height:16 }} /> : <><Search size={14}/> Verify</>}
            </button>
          </form>

          <div style={{ marginTop:12, fontSize:12, color:'var(--text-muted)' }}>
            💡 Scan the QR code on the evidence label to auto-fill this field, or paste the hash from the forensic report.
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          width:'100%', maxWidth:800, marginBottom:20,
          display:'flex', alignItems:'center', gap:10,
          padding:'16px 20px', borderRadius:'var(--radius-md)',
          background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.3)'
        }}>
          <ShieldAlert size={22} color="var(--accent-red)" />
          <div>
            <div style={{ fontWeight:700, color:'var(--accent-red)' }}>Evidence Not Found</div>
            <div style={{ fontSize:12, color:'var(--text-muted)' }}>{error}</div>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div style={{ width:'100%', maxWidth:800 }} className="animate-in">
          {/* Verdict banner */}
          <div style={{
            display:'flex', alignItems:'center', gap:16, padding:'20px 24px',
            borderRadius:'var(--radius-lg)', marginBottom:20,
            background: result.found ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)',
            border:`1px solid ${result.found ? 'rgba(74,222,128,0.35)' : 'rgba(248,113,113,0.35)'}`,
          }}>
            {result.found
              ? <ShieldCheck size={40} color="var(--accent-green)" />
              : <ShieldAlert size={40} color="var(--accent-red)" />
            }
            <div>
              <div style={{ fontSize:20, fontWeight:900, color: result.found ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                {result.found ? '✅ AUTHENTIC EVIDENCE CONFIRMED' : '❌ EVIDENCE NOT VERIFIED'}
              </div>
              <div style={{ fontSize:13, color:'var(--text-muted)', marginTop:3 }}>
                {result.found
                  ? `SHA-256 hash found on blockchain ledger · Chain integrity: ${result.chain_integrity ? 'INTACT' : 'ALERT'}`
                  : 'This hash does not match any registered evidence on this blockchain ledger'
                }
              </div>
            </div>
          </div>

          {result.found && (
            <>
              {/* Evidence details */}
              <div className="grid-2" style={{ marginBottom:20 }}>
                <div className="card">
                  <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', marginBottom:12 }}>
                    Evidence Details
                  </div>
                  {[
                    { label:'Case ID',        value:result.case_id },
                    { label:'Case Name',      value:result.case_name },
                    { label:'File Name',      value:result.original_filename },
                    { label:'Evidence Type',  value:result.evidence_type },
                    { label:'Risk Level',     value:result.risk_level },
                    { label:'File Size',      value:result.filesize ? `${(result.filesize/1024/1024).toFixed(2)} MB` : '—' },
                    { label:'Status',         value:result.status },
                  ].map(row => (
                    <div key={row.label} style={{
                      display:'flex', justifyContent:'space-between', alignItems:'center',
                      padding:'7px 0', borderBottom:'1px solid rgba(0,212,255,0.05)',
                      fontSize:13
                    }}>
                      <span style={{ color:'var(--text-muted)' }}>{row.label}</span>
                      <span style={{ fontWeight:600 }}>
                        {row.label === 'Risk Level'
                          ? <span className={`risk-badge risk-${row.value}`}>{row.value}</span>
                          : row.label === 'Status'
                          ? <span className="badge badge-green">{row.value}</span>
                          : row.value || '—'
                        }
                      </span>
                    </div>
                  ))}
                </div>

                <div className="card">
                  <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', marginBottom:12 }}>
                    Chain of Custody
                  </div>
                  {[
                    { label:'Uploaded By',       value:result.uploaded_by },
                    { label:'Upload Date',        value:result.uploaded_at ? format(parseISO(result.uploaded_at), 'dd MMM yyyy HH:mm') : '—' },
                    { label:'Verifications',      value:result.verification_count },
                    { label:'Last Verified',      value:result.last_verified ? format(parseISO(result.last_verified), 'dd MMM yyyy HH:mm') : 'Never' },
                    { label:'Chain Block',        value:result.blockchain_block ? `#${result.blockchain_block.index}` : '—' },
                    { label:'Chain Integrity',    value:result.chain_integrity ? '✅ Intact' : '❌ Alert' },
                    { label:'Verified At',        value:result.verified_at ? format(parseISO(result.verified_at), 'dd MMM yyyy HH:mm:ss') : '—' },
                  ].map(row => (
                    <div key={row.label} style={{
                      display:'flex', justifyContent:'space-between', alignItems:'center',
                      padding:'7px 0', borderBottom:'1px solid rgba(0,212,255,0.05)',
                      fontSize:13
                    }}>
                      <span style={{ color:'var(--text-muted)' }}>{row.label}</span>
                      <span style={{ fontWeight:600 }}>{row.value ?? '—'}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hash display */}
              <div className="card" style={{ marginBottom:20 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', marginBottom:8 }}>
                  SHA-256 Cryptographic Fingerprint
                </div>
                <code style={{ fontSize:12, color:'var(--accent-cyan)', wordBreak:'break-all', display:'block', lineHeight:1.8 }}>
                  {result.sha256_hash}
                </code>
              </div>

              {/* Certificate */}
              <div className="certificate-banner">
                <div style={{ display:'flex', alignItems:'flex-start', gap:16 }}>
                  <div style={{ fontSize:36, flexShrink:0 }}>🏛️</div>
                  <div>
                    <div style={{ fontSize:14, fontWeight:800, color:'var(--accent-amber)', marginBottom:4 }}>
                      Digital Evidence Certificate
                    </div>
                    <div style={{ fontSize:12, color:'var(--text-secondary)', lineHeight:1.7 }}>
                      {result.certificate?.statement}
                    </div>
                    <div style={{ marginTop:10, fontSize:11, color:'var(--text-muted)' }}>
                      Issued by: {result.certificate?.issued_by} · Standard: {result.certificate?.standard}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop:48, textAlign:'center', color:'var(--text-muted)', fontSize:12 }}>
        <div>CyberForensics Evidence Chain of Custody System v1.0</div>
        <div style={{ marginTop:4 }}>Powered by SHA-256 Cryptography + Blockchain Immutable Ledger</div>
        <div style={{ marginTop:8 }}>
          <a href="/login" style={{ color:'var(--accent-cyan)', textDecoration:'none' }}>Investigator Login →</a>
        </div>
      </div>
    </div>
  )
}
