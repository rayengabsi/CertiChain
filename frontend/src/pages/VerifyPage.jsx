import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import api, { errorMessage } from '../api/client.js';
import VerificationResult from '../components/VerificationResult.jsx';

/**
 * VerifyPage — deep-link certificate result page.
 * Automatically verifies the certificate ID from the URL param.
 * Route: /verify/:certificateId
 */
export default function VerifyPage() {
  const { certificateId } = useParams();
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError('');
      setResult(null);
      try {
        const { data } = await api.get(`/verify/${certificateId}`);
        if (active) setResult(data);
      } catch (err) {
        if (!active) return;
        if (err.response?.status === 404) setResult(err.response.data);
        else setError(errorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [certificateId]);

  return (
    <div className="container" style={{ padding: '48px 24px 80px' }}>
      {/* ── Back link ──────────────────────────────────────────────────────── */}
      <Link
        to="/verify/lookup"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 'var(--fs-sm)',
          color: 'var(--text-muted)',
          textDecoration: 'none',
          marginBottom: 32,
          transition: 'color 0.15s',
        }}
        onMouseOver={(e) => { e.currentTarget.style.color = 'var(--text)'; }}
        onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
      >
        <ArrowLeft size={15} /> Verify another certificate
      </Link>

      {/* ── Page heading ───────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 32 }}>
        <h1
          style={{
            fontSize: 'clamp(22px, 3vw, 30px)',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            marginBottom: 8,
          }}
        >
          Certificate Verification
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--fs-xs)',
            color: 'var(--text-dim)',
            wordBreak: 'break-all',
          }}
        >
          {certificateId}
        </p>
      </div>

      {/* ── Loading state ──────────────────────────────────────────────────── */}
      {loading && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '20px 24px',
            borderRadius: 'var(--r-md)',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            color: 'var(--text-muted)',
            fontSize: 'var(--fs-sm)',
          }}
        >
          <Loader2 size={20} className="spin-slow" style={{ color: 'var(--accent)', flexShrink: 0 }} />
          Querying the blockchain…
        </div>
      )}

      {/* ── Error state ────────────────────────────────────────────────────── */}
      {error && !loading && (
        <div className="alert error">{error}</div>
      )}

      {/* ── Result ─────────────────────────────────────────────────────────── */}
      {!loading && result && (
        <VerificationResult result={result} />
      )}
    </div>
  );
}
