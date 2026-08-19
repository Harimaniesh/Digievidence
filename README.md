#  CyberForensics Evidence Chain of Custody System.

A blockchain-based digital evidence management platform for cybercrime investigations. Built with React, Python Flask, and a cryptographically-chained ledger.

---

## 🚀 Quick Start.

### 1. Backend Setup.

```powershell
cd backend
pip install -r requirements.txt
python app.py
# API running at http://localhost:5000
```

### 2. Frontend Setup

```powershell
cd frontend
npm install
npm run dev
# App running at http://localhost:3000
```

---

## 🔑 Default Login Accounts

| Role               | Username   | Password      | Badge   |
|--------------------|-----------|---------------|---------|
| System Admin       | admin      | admin123      | ADM-001 |
| Investigator       | inv001     | invest123     | INV-001 |
| Forensic Analyst   | forensic   | forensic123   | FOR-001 |
| Court Viewer       | court      | court123      | CRT-001 |
| Law Firm           | lawfirm    | lawfirm123    | LAW-001 |

---

## 📦 Features

### 🔐 Evidence Upload
- Drag-and-drop file upload (up to 500MB)
- SHA-256 cryptographic hashing on every file
- Duplicate detection via hash comparison
- Blockchain block creation on every upload
- QR code generation for court verification

### ⛓️ Blockchain Ledger
- Append-only cryptographically-chained block structure
- Block types: GENESIS, EVIDENCE_UPLOAD, ACCESS_LOG, VERIFICATION
- Full chain integrity verification
- JSON-persisted ledger (`backend/blockchain_ledger.json`)

### 🤖 AI Evidence Analysis
- Automatic evidence type classification
- Risk level assessment (CRITICAL / HIGH / MEDIUM / LOW)
- Forensic summary generation for all evidence types
- Recommended forensic actions per evidence type
- Forensic tag extraction

### 👁️ Access Tracking
- Every view, upload, verify, and court access is logged
- Access logs written to blockchain as ACCESS_LOG blocks
- Filterable audit trail with role, timestamp, IP, reason

### ✅ Verification Module
- Re-computes SHA-256 hash from stored file
- Compares against original blockchain record
- Tamper-evident detection with detailed diff
- Court-admissible verification certificates

### ⚖️ Court Portal (Public, No Login)
- Hash-based evidence lookup
- Full chain-of-custody display
- Digital evidence certificate
- Accessible at `/court` or via QR code scan

### 📱 QR Code Verification
- Generated for every evidence item on upload
- Contains evidence ID + SHA-256 hash + verification URL
- Downloadable PNG for printed evidence labels

---

## 🏗️ Architecture

```
frontend/          → React + Vite (port 3000)
  src/
    pages/         → All UI pages
    components/    → Sidebar, TopBar
    contexts/      → AuthContext (JWT)

backend/           → Python Flask (port 5000)
  app.py           → Main API routes
  blockchain.py    → Cryptographic block chain ledger
  auth.py          → JWT + RBAC
  ai_summary.py    → Evidence analysis engine
  qr_generator.py  → QR code generation
  uploads/         → Stored evidence files
  blockchain_ledger.json  → Persisted blockchain
```

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Current user info |
| POST | `/api/evidence/upload` | Upload + hash + blockchain write |
| GET | `/api/evidence` | List all evidence |
| GET | `/api/evidence/:id` | Evidence detail + blocks + logs |
| GET | `/api/evidence/:id/verify` | Re-hash and compare |
| GET | `/api/evidence/:id/qr` | Get QR code |
| GET | `/api/blockchain/ledger` | Paginated block list |
| GET | `/api/blockchain/verify` | Full chain integrity check |
| GET | `/api/access-logs` | Audit trail (admin/investigator only) |
| GET | `/api/court/verify/:hash` | **Public** hash verification |
| GET | `/api/dashboard/stats` | Dashboard metrics |

---

## 🔒 Role Permissions

| Permission | Admin | Investigator | Forensic Analyst | Court Viewer | Law Firm |
|---|:---:|:---:|:---:|:---:|:---:|
| Upload Evidence | ✅ | ✅ | ✅ | ❌ | ❌ |
| View Evidence | ✅ | ✅ | ✅ | ✅ | ✅ |
| View Ledger | ✅ | ✅ | ✅ | ✅ | ✅ |
| Verify Evidence | ✅ | ✅ | ✅ | ✅ | ✅ |
| View Access Logs | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete Evidence | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage Users | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 💾 Database

- **MongoDB** (optional): Connects to `mongodb://localhost:27017/evidence_chain_db`
- **Fallback**: In-memory stores if MongoDB is unavailable — app works without MongoDB
- **Blockchain**: JSON file (`blockchain_ledger.json`) — always persists to disk

---

## 🏭 Production Deployment Notes

### Real Hyperledger Fabric Integration
The `blockchain.py` module uses a local JSON-persisted ledger that mirrors Fabric's block structure.
For production, replace `write_block()` and `get_chain()` in `blockchain.py` with:
```python
from hfc.fabric import Client
# Fabric gateway calls here
```

### Security Hardening
- Change `JWT_SECRET_KEY` in `app.py` to a strong random value
- Use HTTPS in production
- Store evidence files on encrypted storage
- Enable MongoDB authentication

---

*Built for cybercrime forensics, court-admissible evidence handling, and digital investigation teams.*
