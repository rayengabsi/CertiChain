import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { errorMessage } from '../../api/client.js';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { connectWallet, writeContract } from '../../web3/contract.js';

const formatDate = (v) => (v ? new Date(v).toLocaleString() : '—');

/**
 * Certificate detail + revocation.
 *
 * Revocation is a MetaMask-signed revoke(certIdBytes32) transaction. The backend verifies
 * the CertificateRevoked event AND the live on-chain revoked state before updating its mirror.
 * A university that has since been deauthorized can still revoke its own past certificates.
 */
export default function CertificateDetail() {
  const { certificateId } = useParams();
  const [cert, setCert] = useState(null);
  const [qr, setQr] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/certificates/${certificateId}`);
      setCert(data.certificate);
      setQr(data.qr);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [certificateId]);

  useEffect(() => {
    load();
  }, [load]);

  async function onConnect() {
    setError('');
    setBusy('connect');
    try {
      setWallet(await connectWallet());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy('');
    }
  }

  async function onRevoke() {
    setError('');
    setNotice('');
    if (!wallet) {
      setError('Connect MetaMask first.');
      return;
    }
    setBusy('revoke');
    try {
      const contract = writeContract(wallet.signer);
      const tx = await contract.revoke(cert.certIdBytes32);
      setNotice(`revoke() submitted (${tx.hash.slice(0, 12)}…). Waiting for confirmation…`);
      await tx.wait();

      const { data } = await api.post(`/certificates/${certificateId}/revoke`, {
        txHash: tx.hash,
        reason: reason || undefined,
      });
      setCert((c) => ({ ...c, ...data.certificate }));
      setNotice('Certificate revoked on-chain and confirmed. ✅');
      setReason('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy('');
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="Certificate Detail" breadcrumbs={[{ label: 'University', to: '/university' }, { label: 'Certificate' }]} showWallet>
        <div className="card loading-block">
          <span className="spinner spinner-lg" /> Loading certificate…
        </div>
      </DashboardLayout>
    );
  }

  if (!cert) {
    return (
      <DashboardLayout title="Certificate Detail" breadcrumbs={[{ label: 'University', to: '/university' }, { label: 'Not found' }]} showWallet>
        <div className="alert error">{error || 'Certificate not found.'}</div>
        <Link className="btn ghost" to="/university">
          ← Back to dashboard
        </Link>
      </DashboardLayout>
    );
  }

  const isIssued = cert.status === 'issued';
  const isRevoked = cert.status === 'revoked';

  return (
    <DashboardLayout
      title={cert.studentName}
      breadcrumbs={[{ label: 'University', to: '/university' }, { label: 'Certificate Detail' }]}
      showWallet
    >
      <div>
        <div className="spread" style={{ marginBottom: 10 }}>
          <StatusBadge status={cert.status} />
          <Link className="btn ghost small" to="/university">← Back to dashboard</Link>
        </div>
        <p className="muted small" style={{ fontFamily: 'var(--font-mono)', marginBottom: 16 }}>{cert.certificateId}</p>

        {error && <div className="alert error">{error}</div>}
        {notice && <div className="alert info">{notice}</div>}

        <div className="grid cols-2">
          <div className="card">
            <h3>Certificate data (off-chain)</h3>
            <dl className="kv">
              <dt>Student</dt>
              <dd>{cert.studentName}</dd>
              <dt>Email</dt>
              <dd>{cert.studentEmail}</dd>
              <dt>Program</dt>
              <dd>{cert.program}</dd>
              <dt>Degree</dt>
              <dd>{cert.degree}</dd>
              <dt>Original file</dt>
              <dd>{cert.fileName}</dd>
              <dt>Created</dt>
              <dd>{formatDate(cert.createdAt)}</dd>
              <dt>Issued</dt>
              <dd>{formatDate(cert.issuedAt)}</dd>
              {isRevoked && (
                <>
                  <dt>Revoked</dt>
                  <dd>{formatDate(cert.revokedAt)}</dd>
                  <dt>Reason</dt>
                  <dd>{cert.revokeReason || '—'}</dd>
                </>
              )}
            </dl>
          </div>

          <div className="card">
            <h3>On-chain anchor</h3>
            <dl className="kv">
              <dt>certId (bytes32)</dt>
              <dd className="mono">{cert.certIdBytes32}</dd>
              <dt>SHA-256</dt>
              <dd className="mono">{cert.sha256}</dd>
              <dt>Fingerprint (bytes32)</dt>
              <dd className="mono">{cert.fingerprintBytes32}</dd>
              <dt>Issue tx</dt>
              <dd className="mono">{cert.issueTxHash || '—'}</dd>
              <dt>Issue block</dt>
              <dd>{cert.issueBlock ?? '—'}</dd>
              {isRevoked && (
                <>
                  <dt>Revoke tx</dt>
                  <dd className="mono">{cert.revokeTxHash || '—'}</dd>
                </>
              )}
            </dl>
            {qr && (
              <div className="mt">
                <p className="muted small">Public verification link:</p>
                <p className="mono small">{qr.url}</p>
                <div className="qr mt">
                  <img src={qr.dataUrl} alt="Verification QR code" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── revocation ──────────────────────────────────────────────────── */}
        <div className="card">
          <h2>Revocation</h2>
          {isRevoked ? (
            <p className="muted">This certificate has already been revoked. Public verification now reports REVOKED.</p>
          ) : !isIssued ? (
            <p className="muted">
              This certificate is not yet anchored on-chain, so it cannot be revoked. Complete the issuance
              flow from the dashboard first.
            </p>
          ) : (
            <>
              <p className="muted small">
                Revoking writes a permanent, MetaMask-signed record on-chain. The document is never deleted —
                verification simply reports it as revoked.
              </p>
              <label htmlFor="reason">Reason (optional)</label>
              <input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="e.g. issued in error" />
              <div className="btn-row">
                {wallet ? (
                  <button className="btn danger" onClick={onRevoke} disabled={busy === 'revoke'}>
                    {busy === 'revoke' ? <span className="spinner" /> : '⛔'} Sign revoke() with MetaMask
                  </button>
                ) : (
                  <button className="btn" onClick={onConnect} disabled={busy === 'connect'}>
                    {busy === 'connect' ? <span className="spinner" /> : '🦊'} Connect wallet to revoke
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
