import StatusBadge from './StatusBadge.jsx';

const HEADINGS = {
  valid: '✅ Certificate is VALID',
  revoked: '⛔ Certificate has been REVOKED',
  not_found: '⚠️ No matching certificate found',
  invalid_or_modified: '⚠️ Document does not match the on-chain record',
  pending: '⏳ Not anchored on-chain yet',
};

const formatDate = (v) => (v ? new Date(v).toLocaleString() : '—');

/** Renders the public verification result (never contains student personal data). */
export default function VerificationResult({ result }) {
  if (!result) return null;
  const { status } = result;

  return (
    <div className={`result ${status}`}>
      <div className="spread">
        <h2>{HEADINGS[status] || 'Verification result'}</h2>
        <StatusBadge status={status} />
      </div>
      {result.message && <p className="muted">{result.message}</p>}

      {status !== 'not_found' && (
        <dl className="kv mt">
          <dt>Certificate ID</dt>
          <dd className="mono">{result.certificateId}</dd>
          <dt>University</dt>
          <dd>{result.university?.name || '—'}</dd>
          <dt>Program</dt>
          <dd>{result.program || '—'}</dd>
          <dt>Degree</dt>
          <dd>{result.degree || '—'}</dd>
          <dt>Issued at</dt>
          <dd>{formatDate(result.issuedAt)}</dd>
          {result.revokedAt && (
            <>
              <dt>Revoked at</dt>
              <dd>{formatDate(result.revokedAt)}</dd>
            </>
          )}
          {result.sha256 && (
            <>
              <dt>SHA-256</dt>
              <dd className="mono">{result.sha256}</dd>
            </>
          )}
          {result.issueTxHash && (
            <>
              <dt>Issue tx</dt>
              <dd className="mono">{result.issueTxHash}</dd>
            </>
          )}
        </dl>
      )}

      <p className="muted small mt">
        This result is read from the blockchain (source of truth). Student personal data is never
        published. A modified PDF produces a completely different SHA-256 fingerprint, so it can never
        verify as VALID.
      </p>
    </div>
  );
}
