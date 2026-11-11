import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../../api/client.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import {
  CONTRACT_ADDRESS,
  connectWallet,
  shortAddress,
  writeContract,
} from '../../web3/contract.js';

const EMPTY_FORM = { studentName: '', studentEmail: '', program: '', degree: '' };
const formatDate = (v) => (v ? new Date(v).toLocaleString() : '—');

/**
 * University dashboard — the issuance surface.
 *
 * The crucial design point: the PDF is uploaded to the backend FIRST (which computes
 * SHA-256 server-side and stores the bytes), and only THEN is the fingerprint anchored
 * on-chain by a MetaMask-signed issue() transaction. The backend verifies the resulting
 * CertificateIssued event before flipping the record to "issued".
 */
export default function UniversityDashboard() {
  const { user, university, refreshMe } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [certificates, setCertificates] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [file, setFile] = useState(null);
  const [pending, setPending] = useState(null); // upload result awaiting on-chain confirmation
  const [qr, setQr] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadCertificates = useCallback(async () => {
    try {
      const { data } = await api.get('/certificates');
      setCertificates(data.certificates);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    loadCertificates();
  }, [loadCertificates]);

  async function onConnect() {
    setError('');
    setNotice('');
    setBusy('connect');
    try {
      const w = await connectWallet();
      setWallet(w);
      const matches = university && w.address.toLowerCase() === university.ethAddress.toLowerCase();
      setNotice(
        matches
          ? `Connected ${shortAddress(w.address)} — matches this university's registered wallet.`
          : `Connected ${shortAddress(w.address)} — WARNING: this is not the wallet registered for ${university?.name || 'this university'}.`
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy('');
    }
  }

  /** Step 1: upload the PDF. The backend validates it, hashes it and returns the bytes32 values. */
  async function onUpload(e) {
    e.preventDefault();
    setError('');
    setNotice('');
    setQr(null);
    setPending(null);
    if (!file) {
      setError('Choose a PDF file first.');
      return;
    }
    setBusy('upload');
    try {
      const body = new FormData();
      Object.entries(form).forEach(([k, v]) => body.append(k, v));
      body.append('pdf', file);
      const { data } = await api.post('/certificates', body);
      setPending(data);
      setNotice(
        `PDF hashed server-side. SHA-256 = ${data.sha256.slice(0, 16)}… Now sign issue() with MetaMask to anchor it on-chain.`
      );
      setForm(EMPTY_FORM);
      setFile(null);
      await loadCertificates();
    } catch (err) {
      const data = err.response?.data;
      if (data?.error?.code === 'PENDING_EXISTS' && data.existing) {
        // Resume an interrupted issuance instead of re-uploading.
        setError(`${data.error.message} (existing ID: ${data.existing.certificateId})`);
      } else {
        setError(errorMessage(err));
      }
    } finally {
      setBusy('');
    }
  }

  /** Step 2: sign issue(certIdBytes32, fingerprintBytes32) with MetaMask, then confirm with the backend. */
  async function onConfirmIssue() {
    setError('');
    setNotice('');
    if (!wallet) {
      setError('Connect MetaMask first.');
      return;
    }
    if (!pending) return;
    setBusy('issue');
    try {
      const contract = writeContract(wallet.signer);
      const tx = await contract.issue(pending.certIdBytes32, pending.fingerprintBytes32);
      setNotice(`issue() submitted (${tx.hash.slice(0, 12)}…). Waiting for the transaction to be mined…`);
      await tx.wait();

      const { data } = await api.post(`/certificates/${pending.certificateId}/confirm`, { txHash: tx.hash });
      setQr(data.qr);
      setNotice('Certificate anchored on-chain and confirmed by the backend. ✅');
      setPending(null);
      await loadCertificates();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy('');
    }
  }

  const notAuthorized = university && !university.authorized;

  return (
    <div className="container">
      <h1 className="page-title">{university?.name || 'University dashboard'}</h1>
      <p className="page-sub">
        Signed in as <strong>{user?.email}</strong>
        {university && (
          <>
            {' '}· registered wallet <span className="mono">{shortAddress(university.ethAddress)}</span>{' '}
            <StatusBadge status={university.authorized ? 'authorized' : 'unauthorized'} />
          </>
        )}
      </p>

      {notAuthorized && (
        <div className="alert error">
          This university is <strong>not authorized on-chain</strong>, so the contract will reject any
          issuance. Ask the platform admin to authorize your wallet.{' '}
          <button className="btn ghost small" onClick={refreshMe} style={{ marginLeft: 8 }}>
            ↻ Re-check
          </button>
        </div>
      )}

      {/* ── wallet ────────────────────────────────────────────────────────── */}
      <div className="card">
        <div className="spread">
          <div>
            <h3 style={{ marginBottom: 4 }}>Signing wallet (MetaMask)</h3>
            <p className="muted small" style={{ margin: 0 }}>
              Contract <span className="mono">{CONTRACT_ADDRESS}</span>
            </p>
          </div>
          <button className="btn" onClick={onConnect} disabled={busy === 'connect'}>
            {busy === 'connect' ? <span className="spinner" /> : '🦊'}{' '}
            {wallet ? 'Reconnect wallet' : 'Connect wallet'}
          </button>
        </div>
        {wallet && (
          <dl className="kv mt">
            <dt>Connected</dt>
            <dd className="mono">{wallet.address}</dd>
          </dl>
        )}
      </div>

      {error && <div className="alert error">{error}</div>}
      {notice && <div className="alert info">{notice}</div>}

      {/* ── issuance ──────────────────────────────────────────────────────── */}
      <div className="card">
        <h2>Issue a certificate</h2>
        <p className="muted small">
          One PDF = one certificate. The backend computes the SHA-256; the blockchain stores only the
          fingerprint, the certificate ID, your wallet and a timestamp — never student personal data.
        </p>
        <form onSubmit={onUpload}>
          <div className="grid cols-2">
            <div>
              <label htmlFor="studentName">Student name</label>
              <input id="studentName" value={form.studentName} onChange={(e) => setForm({ ...form, studentName: e.target.value })} required maxLength={120} />
            </div>
            <div>
              <label htmlFor="studentEmail">Student email</label>
              <input id="studentEmail" type="email" value={form.studentEmail} onChange={(e) => setForm({ ...form, studentEmail: e.target.value })} required />
            </div>
            <div>
              <label htmlFor="program">Program</label>
              <input id="program" value={form.program} onChange={(e) => setForm({ ...form, program: e.target.value })} required maxLength={150} />
            </div>
            <div>
              <label htmlFor="degree">Degree</label>
              <input id="degree" value={form.degree} onChange={(e) => setForm({ ...form, degree: e.target.value })} required maxLength={150} />
            </div>
          </div>
          <label htmlFor="pdf">Diploma PDF</label>
          <input id="pdf" type="file" accept="application/pdf,.pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} required />
          <div className="btn-row">
            <button className="btn" type="submit" disabled={busy === 'upload'}>
              {busy === 'upload' ? <span className="spinner" /> : '⬆️'} Upload &amp; hash
            </button>
          </div>
        </form>

        {pending && (
          <div className="alert ok">
            <div className="spread">
              <div>
                <strong>Ready to anchor on-chain</strong>
                <div className="small mono">certificateId: {pending.certificateId}</div>
                <div className="small mono">SHA-256: {pending.sha256}</div>
              </div>
              <button className="btn" onClick={onConfirmIssue} disabled={busy === 'issue' || !wallet}>
                {busy === 'issue' ? <span className="spinner" /> : '⛓'} Sign issue() with MetaMask
              </button>
            </div>
          </div>
        )}

        {qr && (
          <div className="card mt">
            <h3>Certificate anchored ✅</h3>
            <div className="row" style={{ alignItems: 'flex-start', gap: 20 }}>
              <div className="qr">
                <img src={qr.dataUrl} alt="Verification QR code" />
              </div>
              <div>
                <p className="muted small">Scan to verify, or share the public link:</p>
                <p className="mono">{qr.url}</p>
                <Link className="btn ghost small" to={`/university/certificate/${qr.certificateId}`}>
                  Open certificate detail →
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── certificate list ──────────────────────────────────────────────── */}
      <div className="card">
        <div className="spread">
          <h2 style={{ margin: 0 }}>Certificates</h2>
          <button className="btn ghost small" onClick={loadCertificates}>
            ↻ Refresh
          </button>
        </div>
        <div className="table-wrap mt">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Program</th>
                <th>Status</th>
                <th>Issued</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {certificates.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted">
                    No certificates yet.
                  </td>
                </tr>
              )}
              {certificates.map((c) => (
                <tr key={c.certificateId}>
                  <td>
                    <strong>{c.studentName}</strong>
                    <div className="muted small mono">{c.certificateId.slice(0, 8)}…</div>
                  </td>
                  <td>
                    {c.program}
                    <div className="muted small">{c.degree}</div>
                  </td>
                  <td>
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="small">{formatDate(c.issuedAt || c.createdAt)}</td>
                  <td>
                    <Link className="btn ghost small" to={`/university/certificate/${c.certificateId}`}>
                      Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
