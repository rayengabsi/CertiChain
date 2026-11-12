import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ClipboardCopy,
  ExternalLink,
  ShieldCheck,
  ShieldOff,
  XCircle,
} from 'lucide-react';
import api, { errorMessage } from '../../api/client.js';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import Button from '../../components/ui/Button.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { connectWallet, writeContract } from '../../web3/contract.js';

const fmtDate = (v) => (v ? new Date(v).toLocaleString() : '—');

function CopyField({ value, label }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
      <span className="mono" style={{ fontSize: 'var(--fs-xs)', wordBreak: 'break-all', flex: 1 }}>
        {value || '—'}
      </span>
      {value && (
        <button
          className="icon-btn"
          type="button"
          title={copied ? 'Copied!' : `Copy ${label}`}
          onClick={copy}
          style={{ opacity: 0.65, flexShrink: 0 }}
        >
          <ClipboardCopy size={13} />
        </button>
      )}
    </div>
  );
}

/**
 * Certificate detail + revocation — Stage 4 redesign.
 *
 * Preserves the existing revoke(certIdBytes32) on-chain flow and backend confirm call.
 * Adds a professional confirmation dialog before the irreversible revoke action.
 */
export default function CertificateDetail() {
  const { certificateId } = useParams();
  const toast = useToast();

  const [cert, setCert] = useState(null);
  const [qr, setQr] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState('');
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/certificates/${certificateId}`);
      setCert(data.certificate);
      setQr(data.qr);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [certificateId, toast]);

  useEffect(() => { load(); }, [load]);

  async function onConnect() {
    setBusy('connect');
    try {
      setWallet(await connectWallet());
      toast.success('Wallet connected.');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy('');
    }
  }

  async function onRevoke() {
    setConfirmOpen(false);
    if (!wallet) { toast.error('Connect MetaMask first.'); return; }
    setBusy('revoke');
    try {
      const contract = writeContract(wallet.signer);
      const tx = await contract.revoke(cert.certIdBytes32);
      toast.info(`revoke() submitted (${tx.hash.slice(0, 12)}…). Waiting for confirmation…`);
      await tx.wait();
      const { data } = await api.post(`/certificates/${certificateId}/revoke`, {
        txHash: tx.hash,
        reason: reason || undefined,
      });
      setCert((c) => ({ ...c, ...data.certificate }));
      toast.success('Certificate revoked on-chain and confirmed. ✅');
      setReason('');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy('');
    }
  }

  /* ── Loading skeleton ─────────────────────────────────────────────────── */
  if (loading) {
    return (
      <DashboardLayout
        title="Certificate Detail"
        breadcrumbs={[{ label: 'University', to: '/university' }, { label: 'Certificate' }]}
        showWallet
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="card">
              <div className="skeleton row" style={{ marginBottom: 10 }} />
              <div className="skeleton row" style={{ width: '70%' }} />
            </div>
          ))}
        </div>
      </DashboardLayout>
    );
  }

  /* ── Not found ────────────────────────────────────────────────────────── */
  if (!cert) {
    return (
      <DashboardLayout
        title="Certificate Not Found"
        breadcrumbs={[{ label: 'University', to: '/university' }, { label: 'Not found' }]}
        showWallet
      >
        <div className="alert error">Certificate not found.</div>
        <Link className="btn ghost" to="/university" style={{ marginTop: 12, display: 'inline-flex' }}>
          <ArrowLeft size={15} /> Back to dashboard
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
      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="spread" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <StatusBadge status={cert.status} />
          <span className="mono muted" style={{ fontSize: 'var(--fs-xs)' }}>
            {cert.certificateId}
          </span>
        </div>
        <Link className="btn ghost small" to="/university">
          <ArrowLeft size={14} /> Back to dashboard
        </Link>
      </div>

      {/* ── Main content grid ──────────────────────────────────────────────── */}
      <div className="grid cols-2" style={{ marginBottom: 24, alignItems: 'start' }}>

        {/* Student & certificate data */}
        <div className="card" style={{ height: '100%' }}>
          <h3 style={{ marginBottom: 14, fontSize: 'var(--fs-md)' }}>Certificate Data</h3>
          <dl className="kv">
            <dt>Student name</dt>
            <dd>{cert.studentName}</dd>
            <dt>Student email</dt>
            <dd>{cert.studentEmail}</dd>
            <dt>Program</dt>
            <dd>{cert.program}</dd>
            <dt>Degree</dt>
            <dd>{cert.degree}</dd>
            <dt>Original file</dt>
            <dd>{cert.fileName || '—'}</dd>
            <dt>Created</dt>
            <dd>{fmtDate(cert.createdAt)}</dd>
            <dt>Issued</dt>
            <dd>{fmtDate(cert.issuedAt)}</dd>
            {isRevoked && (
              <>
                <dt>Revoked</dt>
                <dd>{fmtDate(cert.revokedAt)}</dd>
                <dt>Revocation reason</dt>
                <dd>{cert.revokeReason || '—'}</dd>
              </>
            )}
          </dl>
        </div>

        {/* On-chain anchor */}
        <div className="card" style={{ height: '100%' }}>
          <h3 style={{ marginBottom: 14, fontSize: 'var(--fs-md)' }}>On-Chain Anchor</h3>
          <dl className="kv">
            <dt>Certificate ID (bytes32)</dt>
            <dd><CopyField value={cert.certIdBytes32} label="cert ID" /></dd>
            <dt>SHA-256 fingerprint</dt>
            <dd><CopyField value={cert.sha256} label="SHA-256" /></dd>
            <dt>Fingerprint (bytes32)</dt>
            <dd><CopyField value={cert.fingerprintBytes32} label="fingerprint" /></dd>
            <dt>Issuing wallet</dt>
            <dd>
              <span className="mono" style={{ fontSize: 'var(--fs-xs)' }}>
                {cert.issuerAddress || '—'}
              </span>
            </dd>
            <dt>Issue tx</dt>
            <dd><CopyField value={cert.issueTxHash} label="tx hash" /></dd>
            <dt>Issue block</dt>
            <dd>{cert.issueBlock ?? '—'}</dd>
            {isRevoked && (
              <>
                <dt>Revoke tx</dt>
                <dd><CopyField value={cert.revokeTxHash} label="revoke tx" /></dd>
              </>
            )}
          </dl>

          {/* QR code */}
          {qr && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <p className="muted small" style={{ marginBottom: 8 }}>Public verification link:</p>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <div className="qr">
                  <img src={qr.dataUrl} alt="Verification QR code" />
                </div>
                <div>
                  <p className="mono small" style={{ wordBreak: 'break-all', marginBottom: 8 }}>{qr.url}</p>
                  <a
                    href={qr.url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn ghost small"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
                  >
                    Open link <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Revocation card ───────────────────────────────────────────────── */}
      <div className="card">
        <h2 style={{ marginBottom: 6, fontSize: 'var(--fs-lg)' }}>Revocation</h2>

        {isRevoked ? (
          <div className="alert error" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <XCircle size={16} />
            This certificate has been permanently revoked. Public verification now reports REVOKED.
          </div>
        ) : !isIssued ? (
          <p className="muted small">
            This certificate is not yet anchored on-chain and cannot be revoked. Complete the
            issuance flow from the dashboard first.
          </p>
        ) : (
          <>
            <p className="muted small" style={{ marginBottom: 16 }}>
              Revoking writes a permanent, MetaMask-signed record on-chain. The diploma PDF is
              never deleted — verification simply reports the certificate as revoked.
            </p>

            <div className="alert warn" style={{ marginBottom: 16 }}>
              <AlertTriangle size={15} />
              This action is <strong>irreversible</strong>. The revocation will be permanently
              recorded on the blockchain.
            </div>

            <div className="field" style={{ maxWidth: 500 }}>
              <label htmlFor="reason">Reason (optional)</label>
              <input
                id="reason"
                className="input"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
                placeholder="e.g. issued in error"
                disabled={busy === 'revoke'}
              />
            </div>

            <div className="btn-row">
              {wallet ? (
                <Button
                  variant="danger"
                  icon={ShieldOff}
                  loading={busy === 'revoke'}
                  onClick={() => setConfirmOpen(true)}
                >
                  Revoke Certificate
                </Button>
              ) : (
                <Button
                  icon={ShieldCheck}
                  loading={busy === 'connect'}
                  onClick={onConnect}
                >
                  Connect Wallet to Revoke
                </Button>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Confirm revoke dialog ─────────────────────────────────────────── */}
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={onRevoke}
        title="Revoke Certificate"
        description={`Sign revoke() with MetaMask to permanently revoke this certificate for ${cert.studentName}. This action cannot be undone — the revocation is recorded on-chain forever.`}
        confirmLabel="Sign & Revoke"
        variant="danger"
        icon={XCircle}
        iconVariant="danger"
        busy={busy === 'revoke'}
      />
    </DashboardLayout>
  );
}
