import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCopy,
  ExternalLink,
  HelpCircle,
  ShieldOff,
  XCircle,
} from 'lucide-react';

const fmtDate = (v) => (v ? new Date(v).toLocaleString() : '—');

function CopyBtn({ value, label = 'value' }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <button
      type="button"
      onClick={copy}
      title={copied ? 'Copied!' : `Copy ${label}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 'var(--r-xs)',
        border: '1px solid var(--border)',
        background: 'var(--surface-2)',
        color: copied ? 'var(--success-text)' : 'var(--text-muted)',
        fontSize: 'var(--fs-xs)',
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'color 0.15s',
        flexShrink: 0,
      }}
    >
      <ClipboardCopy size={11} />
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

function MonoRow({ label, value, copyable = false }) {
  if (!value) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 8, alignItems: 'start', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em', paddingTop: 2 }}>
        {label}
      </span>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, minWidth: 0 }}>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--fs-xs)',
            color: 'var(--text-muted)',
            wordBreak: 'break-all',
            flex: 1,
          }}
        >
          {value}
        </span>
        {copyable && <CopyBtn value={value} label={label} />}
      </div>
    </div>
  );
}

function TextRow({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 8, alignItems: 'start', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em', paddingTop: 2 }}>
        {label}
      </span>
      <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

/* =========================================================================
   Status-specific header configs
   ========================================================================= */
const STATUS_CONFIG = {
  valid: {
    icon: CheckCircle2,
    iconColor: 'var(--success)',
    iconBg: 'var(--success-soft)',
    badgeClass: 'badge ok',
    badgeLabel: 'VALID',
    borderColor: 'var(--success)',
    heading: 'Certificate Verified',
    message:
      'This certificate matches the record registered on the blockchain and has not been revoked.',
  },
  revoked: {
    icon: ShieldOff,
    iconColor: 'var(--danger)',
    iconBg: 'var(--danger-soft)',
    badgeClass: 'badge bad',
    badgeLabel: 'REVOKED',
    borderColor: 'var(--danger)',
    heading: 'Certificate Revoked',
    message:
      'This certificate exists but has been revoked by its issuing university. It is no longer considered valid.',
  },
  not_found: {
    icon: HelpCircle,
    iconColor: 'var(--warning)',
    iconBg: 'var(--warning-soft)',
    badgeClass: 'badge warn',
    badgeLabel: 'NOT FOUND',
    borderColor: 'var(--warning)',
    heading: 'Certificate Not Found',
    message:
      'No matching certificate was found on the blockchain. The ID may be incorrect or the certificate may not have been issued through CertiChain.',
  },
  invalid_or_modified: {
    icon: XCircle,
    iconColor: 'var(--danger)',
    iconBg: 'var(--danger-soft)',
    badgeClass: 'badge bad',
    badgeLabel: 'INVALID / MODIFIED',
    borderColor: 'var(--danger)',
    heading: 'Document Does Not Match',
    message:
      'No matching certificate was found. The uploaded document may have been modified or may not have been issued through CertiChain.',
  },
  pending: {
    icon: AlertTriangle,
    iconColor: 'var(--warning)',
    iconBg: 'var(--warning-soft)',
    badgeClass: 'badge warn',
    badgeLabel: 'PENDING',
    borderColor: 'var(--warning)',
    heading: 'Not Yet Anchored On-Chain',
    message:
      'This certificate has been uploaded but the on-chain issuance transaction has not been confirmed yet. Try again in a few minutes.',
  },
};

/**
 * VerificationResult — premium public result display.
 * Renders distinct designs for: valid, revoked, not_found, invalid_or_modified, pending.
 * Only displays fields actually present in the API response.
 */
export default function VerificationResult({ result, onReset }) {
  if (!result) return null;

  const { status } = result;
  const cfg = STATUS_CONFIG[status] || {
    icon: HelpCircle,
    iconColor: 'var(--text-dim)',
    iconBg: 'var(--surface-3)',
    badgeClass: 'badge',
    badgeLabel: String(status).toUpperCase(),
    borderColor: 'var(--border)',
    heading: 'Verification Result',
    message: result.message || '',
  };

  const Icon = cfg.icon;
  const hasDetails = status !== 'not_found' && status !== 'invalid_or_modified';

  return (
    <div
      style={{
        borderRadius: 'var(--r-lg)',
        border: `1px solid var(--border)`,
        borderTop: `3px solid ${cfg.borderColor}`,
        background: 'var(--surface)',
        overflow: 'hidden',
        animation: 'rise 0.3s var(--ease)',
      }}
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ padding: '24px 28px', display: 'flex', alignItems: 'flex-start', gap: 18 }}>
        <span
          style={{
            display: 'grid',
            placeItems: 'center',
            width: 48,
            height: 48,
            borderRadius: 'var(--r-md)',
            background: cfg.iconBg,
            color: cfg.iconColor,
            flexShrink: 0,
          }}
        >
          <Icon size={24} strokeWidth={2} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
            <h2 style={{ fontSize: 'var(--fs-xl)', fontWeight: 700, letterSpacing: '-0.01em', margin: 0 }}>
              {cfg.heading}
            </h2>
            <span className={cfg.badgeClass} style={{ flexShrink: 0 }}>
              {cfg.badgeLabel}
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)', margin: 0, lineHeight: 1.6 }}>
            {cfg.message}
          </p>
        </div>
      </div>

      {/* ── Details ─────────────────────────────────────────────────────── */}
      {hasDetails && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '20px 28px' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <TextRow label="University" value={result.university?.name} />
            <TextRow label="Program" value={result.program} />
            <TextRow label="Degree" value={result.degree} />
            <TextRow label="Issued" value={fmtDate(result.issuedAt)} />
            {status === 'revoked' && (
              <TextRow label="Revoked" value={fmtDate(result.revokedAt)} />
            )}
            <MonoRow label="Certificate ID" value={result.certificateId} copyable />
            {result.sha256 && (
              <MonoRow label="SHA-256 Fingerprint" value={result.sha256} copyable />
            )}
            {result.onChain?.fingerprintMatchesRecord !== undefined && (
              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 8, alignItems: 'start', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em', paddingTop: 2 }}>
                  Fingerprint Match
                </span>
                <span>
                  {result.onChain.fingerprintMatchesRecord
                    ? <span className="badge ok">✓ Matches on-chain record</span>
                    : <span className="badge bad">✗ Does not match</span>
                  }
                </span>
              </div>
            )}
            {result.onChain?.issuer && (
              <MonoRow label="Issuer Wallet" value={result.onChain.issuer} />
            )}
            {result.university?.wallet && !result.onChain?.issuer && (
              <MonoRow label="Issuer Wallet" value={result.university.wallet} />
            )}
            {result.issueTxHash && (
              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 8, alignItems: 'start', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em', paddingTop: 2 }}>
                  Issue Tx
                </span>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, minWidth: 0 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', wordBreak: 'break-all', flex: 1 }}>
                    {result.issueTxHash}
                  </span>
                  <CopyBtn value={result.issueTxHash} label="tx hash" />
                </div>
              </div>
            )}
            {status === 'revoked' && result.revokeTxHash && (
              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 8, alignItems: 'start', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em', paddingTop: 2 }}>
                  Revoke Tx
                </span>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, minWidth: 0 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', wordBreak: 'break-all', flex: 1 }}>
                    {result.revokeTxHash}
                  </span>
                  <CopyBtn value={result.revokeTxHash} label="revoke tx" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <div
        style={{
          borderTop: '1px solid var(--border)',
          padding: '16px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          background: 'var(--bg-elev)',
        }}
      >
        <p style={{ margin: 0, fontSize: 'var(--fs-xs)', color: 'var(--text-dim)', flex: 1, minWidth: 200 }}>
          This result is read from the blockchain — the immutable source of truth.
          Student personal data is never published on-chain.
        </p>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {result.issueTxHash && (
            <a
              href={`https://etherscan.io/tx/${result.issueTxHash}`}
              target="_blank"
              rel="noreferrer"
              className="btn ghost small"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
            >
              Explorer <ExternalLink size={12} />
            </a>
          )}
          {onReset && (
            <button type="button" className="btn ghost small" onClick={onReset}>
              Verify another
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
