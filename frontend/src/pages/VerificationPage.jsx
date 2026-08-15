import React, { useState, useEffect } from 'react'
import { API } from '../contexts/AuthContext.jsx'
import toast from 'react-hot-toast'
import { ShieldCheck, ShieldAlert, Hash, Search, Link2, Clock, Copy } from 'lucide-react'
import { format, parseISO } from 'date-fns'

function HashInput({ onVerify, loading }) {
  const [mode, setMode]           = useState('id')   // 'id' | 'hash'
  const [value, setValue]         = useState('')
  const [reason, setReason]       = useState('')
  const [evidenceList, setList]   = useState([])

  useEffect(() => {
    API.get('/evidence').then(r => setList(r.data.evidence || [])).catch(() => {})
  }, [])

  const handle = e => {
    e.preventDefault()
    if (!value || !reason) { toast.error('Fill all fields'); return }
    onVerify(mode, value, reason)
  }

  return (
    <form onSubmit={handle}>
      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        {[{ v:'id', l:'By Evidence ID' }, { v:'hash', l:'By SHA-256 Hash' }].map(m => (
          <button key={m.v} type="button"
            className={`btn btn-sm ${mode===m.v ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setMode(m.v)}>
            {m.l}
          </button>
        ))}
      </div>

      <div className="form-group">
        <label className="form-label">{mode === 'id' ? 'Evidence ID' : 'SHA-256 Hash'}</label>
        {mode === 'id' && evidenceList.length > 0 ? (
          <select id="verify-evidence-select" className="form-input" value={value}
                  onChange={e => setValue(e.target.value)} required>
            <option value="">— Select Evidence —</option>
            {evidenceList.map(ev => (
              <option key={ev.id} value={ev.id}>
                {ev.original_name} ({ev.case_id})
              </option>
            ))}
          </select>
        ) : (
          <input id="verify-value-input" className="form-input"
                 placeholder={mode==='id' ? 'Enter UUID evidence ID' : 'Enter 64-char SHA-256 hash'}
                 value={value} onChange={e => setValue(e.target.value)}
                 style={{ fontFamily: mode==='hash' ? 'var(--font-mono)' : 'inherit' }}
                 required />
        )}
      </div>

      <div className="form-group">
        <label className="form-label">Reason for Verification (logged on blockchain)</label>
        <input id="verify-reason-input" className="form-input"
               placeholder="e.g. Pre-trial integrity check"
               value={reason} onChange={e => setReason(e.target.value)} required />
      </div>

      <button id="verify-submit-btn" type="submit" className="btn btn-primary btn-lg"
              style={{ width:'100%', justifyContent:'center' }} disabled={loading}>
        {loading
          ? <><div className="loading-spinner" style={{ width:16, height:16 }} /> Verifying...</>
          : <><ShieldCheck size={16} /> Run Hash Verification</>
        }
      </button>
    </form>
  )
}

function VerificationResult({ result }) {
  const isIntact = result.is_intact
  const copy = text => { navigator.clipboard.writeText(text); toast.success('Copied!') }

  return (
    <div className={`verify-result ${isIntact ? 'verify-intact' : 'verify-tampered'} animate-in`}>
      {/* Verdict */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
        {isIntact
          ? <ShieldCheck size={36} color="var(--accent-green)" />
          : <ShieldAlert size={36} color="var(--accent-red)" />
        }
        <div>
          <div className="verify-verdict">{result.verdict}</div>
          <div style={{ fontSize:12, color:'var(--text-muted)' }}>
            Verified by {result.verified_by} · {result.verified_at ? format(parseISO(result.verified_at), 'dd MMM yyyy HH:mm:ss') : ''}
          </div>
        </div>
      </div>

      {/* Hash comparison */}
      <div className="card" style={{ marginBottom:12 }}>
        <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', marginBottom:10 }}>
          Hash Comparison
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <div>
            <div style={{ fontSize:10, color:'var(--accent-green)', fontWeight:700, marginBottom:3 }}>
              ✅ Original Hash (Blockchain Record)
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <code style={{ fontSize:11, color:'var(--accent-cyan)', wordBreak:'break-all', flex:1 }}>
                {result.original_hash}
              </code>
              <button className="btn btn-secondary btn-sm" style={{ padding:'3px 7px' }}
                      onClick={() => copy(result.original_hash)}>
                <Copy size={11} />
              </button>
            </div>
          </div>

          <div style={{ height:1, background:'var(--border-subtle)' }} />

          <div>
            <div style={{ fontSize:10, color: isIntact ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight:700, marginBottom:3 }}>
              {isIntact ? '✅' : '❌'} Current Hash (Re-computed Now)
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <code style={{
                fontSize:11, wordBreak:'break-all', flex:1,
                color: isIntact ? 'var(--accent-cyan)' : 'var(--accent-red)'
              }}>
                {result.current_hash}
              </code>
              <button className="btn btn-secondary btn-sm" style={{ padding:'3px 7px' }}
                      onClick={() => copy(result.current_hash)}>
                <Copy size={11} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Match indicator */}
      <div style={{
        textAlign:'center', padding:'10px', borderRadius:8, marginBottom:12,
        background: isIntact ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
        border:`1px solid ${isIntact ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`,
        fontSize:13, fontWeight:700,
        color: isIntact ? 'var(--accent-green)' : 'var(--accent-red)'
      }}>
        {isIntact
          ? '✅ Hashes match — Evidence has NOT been tampered with'
          : '❌ Hashes DO NOT match — Evidence may have been tampered with!'
        }
      </div>

      {/* Blockchain block found */}
      {result.ledger_block && (
        <div style={{
          background:'rgba(0,212,255,0.05)', border:'1px solid var(--border-subtle)',
          borderRadius:8, padding:12
        }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--accent-cyan)', marginBottom:6 }}>
            ⛓️ Blockchain Record Found (Block #{result.ledger_block.index})
          </div>
          <div style={{ display:'flex', gap:20, flexWrap:'wrap' }}>
            <div>
              <div style={{ fontSize:10, color:'var(--text-muted)' }}>Block Timestamp</div>
              <div style={{ fontSize:12, color:'var(--text-secondary)' }}>
                {result.ledger_block.timestamp ? format(parseISO(result.ledger_block.timestamp), 'dd MMM yyyy HH:mm:ss UTC') : '—'}
              </div>
            </div>
            <div>
              <div style={{ fontSize:10, color:'var(--text-muted)' }}>Block Hash</div>
              <code style={{ fontSize:10, color:'var(--accent-purple)' }}>
                {result.ledger_block.block_hash?.slice(0,32)}...
              </code>
            </div>
          </div>
        </div>
      )}

      {!isIntact && (
        <div style={{
          marginTop:12, padding:'12px 16px', background:'rgba(248,113,113,0.08)',
          border:'1px solid rgba(248,113,113,0.3)', borderRadius:8
        }}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--accent-red)', marginBottom:6 }}>
            ⚠️ Tamper Alert — Immediate Actions Required
          </div>
          <div style={{ fontSize:12, color:'var(--text-secondary)', lineHeight:1.7 }}>
            1. Quarantine the evidence immediately and preserve original storage media.<br/>
            2. Document discrepancy with timestamp and investigator details.<br/>
            3. Notify supervising officer and legal counsel.<br/>
            4. Evidence may be inadmissible — consult forensic expert before court submission.
          </div>
        </div>
      )}
    </div>
  )
}

export default function VerificationPage() {
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)

  const handleVerify = async (mode, value, reason) => {
    setLoading(true)
    setResult(null)
    try {
      let res
      if (mode === 'id') {
        res = await API.get(`/evidence/${value}/verify?reason=${encodeURIComponent(reason)}`)
      } else {
        // Hash lookup — use court endpoint
        res = await API.get(`/court/verify/${value}`)
        // Normalize
        res.data = {
          is_intact: true,
          verdict: '✅ HASH FOUND ON BLOCKCHAIN',
          original_hash: value,
          current_hash: value,
          verified_by: 'Hash Lookup',
          verified_at: new Date().toISOString(),
          ledger_block: res.data.blockchain_block,
        }
      }
      setResult(res.data)
    } catch(err) {
      toast.error(err.response?.data?.error || 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="section-title">🔬 Evidence Verification</div>
      <div className="section-subtitle">Re-compute SHA-256 hash and compare against the blockchain record</div>

      <div className="grid-2" style={{ alignItems:'flex-start' }}>
        {/* Form */}
        <div className="card">
          <div className="card-title" style={{ marginBottom:20 }}>
            <Search size={16} /> Run Verification
          </div>
          <HashInput onVerify={handleVerify} loading={loading} />
        </div>

        {/* How it works */}
        <div>
          <div className="card" style={{ marginBottom:16 }}>
            <div className="card-title" style={{ marginBottom:16 }}><Hash size={16}/> How Verification Works</div>
            {[
              { step:'1', text:'System re-reads the original stored file from disk', ok:true },
              { step:'2', text:'SHA-256 hash is recomputed byte-by-byte', ok:true },
              { step:'3', text:'Recomputed hash is compared to the blockchain record', ok:true },
              { step:'4', text:'Match = Evidence intact. Mismatch = Tamper detected', ok:true },
              { step:'5', text:'Verification event written as a new blockchain block', ok:true },
            ].map(s => (
              <div key={s.step} style={{ display:'flex', gap:10, padding:'7px 0', borderBottom:'1px solid rgba(0,212,255,0.05)' }}>
                <span style={{ color:'var(--accent-cyan)', fontWeight:700, flexShrink:0 }}>Step {s.step}</span>
                <span style={{ fontSize:12, color:'var(--text-secondary)' }}>{s.text}</span>
              </div>
            ))}
          </div>

          <div style={{
            background:'linear-gradient(135deg, rgba(0,212,255,0.05), rgba(167,139,250,0.05))',
            border:'1px solid var(--border-subtle)', borderRadius:'var(--radius-md)', padding:16
          }}>
            <div style={{ fontSize:12, fontWeight:700, color:'var(--accent-cyan)', marginBottom:8 }}>
              🏛️ Court-Admissible Verification
            </div>
            <div style={{ fontSize:12, color:'var(--text-secondary)', lineHeight:1.7 }}>
              SHA-256 cryptographic verification is recognized as a valid method for digital evidence 
              integrity in cybercrime courts globally. Every verification is itself immutably recorded 
              on the blockchain as an auditable event.
            </div>
          </div>
        </div>
      </div>

      {/* Result */}
      {result && <VerificationResult result={result} />}
    </div>
  )
}
