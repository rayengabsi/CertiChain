import { useState } from 'react';
import { FileSearch, Hash, Loader2, Search } from 'lucide-react';
import api, { errorMessage } from '../api/client.js';
import Dropzone from './ui/Dropzone.jsx';
import VerificationResult from './VerificationResult.jsx';

/**
 * VerifyPanel — public verification widget used on the landing page and /verify/lookup.
 *
 * Method A: verify by Certificate ID → GET /verify/:id
 * Method B: verify by PDF upload   → POST /verify/file
 *
 * API endpoints are preserved exactly as they exist.
 */
export default function VerifyPanel({ initialId = '' }) {
  const [tab, setTab] = useState('id');
  const [certificateId, setCertificateId] = useState(initialId);
  const [idError, setIdError] = useState('');
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  /* ── Verify by ID ─────────────────────────────────────────────────────── */
  async function verifyById(e) {
    e?.preventDefault();
    const id = certificateId.trim();
    if (!id) { setIdError('Please enter a certificate ID.'); return; }
    setIdError('');
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const { data } = await api.get(`/verify/${id}`);
      setResult(data);
    } catch (err) {
      if (err.response?.status === 404) setResult(err.response.data);
      else setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  /* ── Verify by PDF ────────────────────────────────────────────────────── */
  async function verifyByFile(e) {
    e?.preventDefault();
    if (!file) { setError('Select a PDF document first.'); return; }
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const form = new FormData();
      form.append('pdf', file);
      const { data } = await api.post('/verify/file', form);
      setResult(data);
    } catch (err) {
      if (err.response?.status === 404) setResult(err.response.data);
      else setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setResult(null);
    setError('');
    setIdError('');
    setCertificateId('');
    setFile(null);
  }

  return (
    <div>
      {/* ── Tab selector ────────────────────────────────────────────────── */}
      {!result && (
        <div
          style={{
            display: 'inline-flex',
            padding: 4,
            borderRadius: 'var(--r-md)',
            background: 'var(--surface-2)',
            gap: 4,
            marginBottom: 20,
          }}
        >
          <button
            type="button"
            onClick={() => { setTab('id'); setResult(null); setError(''); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '9px 18px',
              borderRadius: 'var(--r-sm)',
              border: 'none',
              background: tab === 'id' ? 'var(--surface)' : 'transparent',
              color: tab === 'id' ? 'var(--text)' : 'var(--text-muted)',
              fontSize: 'var(--fs-sm)',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: tab === 'id' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            <Hash size={15} /> By Certificate ID
          </button>
          <button
            type="button"
            onClick={() => { setTab('file'); setResult(null); setError(''); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '9px 18px',
              borderRadius: 'var(--r-sm)',
              border: 'none',
              background: tab === 'file' ? 'var(--surface)' : 'transparent',
              color: tab === 'file' ? 'var(--text)' : 'var(--text-muted)',
              fontSize: 'var(--fs-sm)',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: tab === 'file' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            <FileSearch size={15} /> By PDF Document
          </button>
        </div>
      )}

      {/* ── Tab: Certificate ID ──────────────────────────────────────────── */}
      {tab === 'id' && !result && (
        <form onSubmit={verifyById} noValidate>
          <div style={{ marginBottom: 16 }}>
            <label
              htmlFor="certId"
              style={{ display: 'block', fontSize: 'var(--fs-sm)', fontWeight: 600, marginBottom: 8, color: 'var(--text-muted)' }}
            >
              Certificate ID
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                id="certId"
                className="input"
                style={{ flex: 1 }}
                value={certificateId}
                onChange={(e) => { setCertificateId(e.target.value); setIdError(''); }}
                placeholder="e.g. d9700ce3-c6b7-4f84-9b57-6fa64a27ea3a"
                autoComplete="off"
                spellCheck={false}
                disabled={loading}
              />
              <button
                type="submit"
                className="btn"
                disabled={loading || !certificateId.trim()}
                style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}
              >
                {loading
                  ? <Loader2 size={15} className="spin-slow" />
                  : <Search size={15} />
                }
                {loading ? 'Verifying…' : 'Verify'}
              </button>
            </div>
            {idError && (
              <p style={{ color: 'var(--danger-text)', fontSize: 'var(--fs-xs)', marginTop: 6 }} role="alert">
                {idError}
              </p>
            )}
          </div>
        </form>
      )}

      {/* ── Tab: PDF document ───────────────────────────────────────────── */}
      {tab === 'file' && !result && (
        <form onSubmit={verifyByFile}>
          <div style={{ marginBottom: 16 }}>
            <label
              style={{ display: 'block', fontSize: 'var(--fs-sm)', fontWeight: 600, marginBottom: 8, color: 'var(--text-muted)' }}
            >
              Diploma PDF
            </label>
            <Dropzone
              file={file}
              onChange={setFile}
              disabled={loading}
              hint="Upload the original diploma PDF to check if its fingerprint matches the blockchain record."
            />
          </div>
          <button
            type="submit"
            className="btn"
            disabled={loading || !file}
            style={{ display: 'flex', alignItems: 'center', gap: 7 }}
          >
            {loading
              ? <Loader2 size={15} className="spin-slow" />
              : <FileSearch size={15} />
            }
            {loading ? 'Verifying document…' : 'Verify Document'}
          </button>
        </form>
      )}

      {/* ── Loading ─────────────────────────────────────────────────────── */}
      {loading && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '16px 20px',
            borderRadius: 'var(--r-md)',
            background: 'var(--surface-2)',
            marginTop: 16,
            color: 'var(--text-muted)',
            fontSize: 'var(--fs-sm)',
          }}
        >
          <Loader2 size={18} className="spin-slow" style={{ color: 'var(--accent)' }} />
          Querying the blockchain…
        </div>
      )}

      {/* ── Error ───────────────────────────────────────────────────────── */}
      {error && !loading && (
        <div className="alert error" style={{ marginTop: 16 }}>
          {error}
        </div>
      )}

      {/* ── Result ──────────────────────────────────────────────────────── */}
      {result && !loading && (
        <div style={{ marginTop: result ? 0 : 16 }}>
          <VerificationResult result={result} onReset={reset} />
        </div>
      )}
    </div>
  );
}
