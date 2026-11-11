import { ShieldCheck } from 'lucide-react';
import VerifyPanel from '../components/VerifyPanel.jsx';

/**
 * VerifyLookupPage — the public certificate verification page.
 * Hosts the VerifyPanel widget (verify by ID or by PDF upload).
 * Route: /verify/lookup
 */
export default function VerifyLookupPage() {
  return (
    <div className="container" style={{ padding: '64px 24px 80px' }}>
      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 680, margin: '0 auto 40px', textAlign: 'center' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            padding: '5px 14px',
            borderRadius: 'var(--r-full)',
            border: '1px solid rgba(121,92,255,0.4)',
            background: 'var(--accent-soft)',
            color: '#d3caff',
            fontSize: 'var(--fs-xs)',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: 20,
          }}
        >
          <ShieldCheck size={12} /> Blockchain Verification
        </span>

        <h1
          style={{
            fontSize: 'clamp(26px, 4vw, 40px)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            lineHeight: 1.15,
            marginBottom: 14,
          }}
        >
          Verify a Certificate
        </h1>
        <p
          style={{
            color: 'var(--text-muted)',
            fontSize: 'var(--fs-md)',
            lineHeight: 1.65,
            maxWidth: 520,
            margin: '0 auto',
          }}
        >
          Enter a certificate ID or upload the original diploma PDF. Results are
          read directly from the blockchain.
        </p>
      </div>

      {/* ── VerifyPanel card ───────────────────────────────────────────────── */}
      <div
        className="card"
        style={{
          maxWidth: 680,
          margin: '0 auto',
          padding: '32px 36px',
        }}
      >
        <VerifyPanel />
      </div>
    </div>
  );
}
