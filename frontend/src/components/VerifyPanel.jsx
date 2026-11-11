import { useState } from 'react';
import api, { errorMessage } from '../api/client.js';
import VerificationResult from './VerificationResult.jsx';

/** Public verification widget — used on the landing page and the /verify/:id page. */
export default function VerifyPanel({ initialId = '' }) {
  const [tab, setTab] = useState('id');
  const [certificateId, setCertificateId] = useState(initialId);
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function verifyById(e) {
    e?.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const { data } = await api.get(`/verify/${certificateId.trim()}`);
      setResult(data);
    } catch (err) {
      if (err.response?.status === 404) setResult(err.response.data);
      else setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function verifyByFile(e) {
    e?.preventDefault();
    setError('');
    setResult(null);
    if (!file) {
      setError('Choose a PDF file first.');
      return;
    }
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

  return (
    <div className="card">
      <div className="row" style={{ gap: 8, marginBottom: 6 }}>
        <button className={`btn small ${tab === 'id' ? '' : 'ghost'}`} onClick={() => setTab('id')} type="button">
          By certificate ID
        </button>
        <button className={`btn small ${tab === 'file' ? '' : 'ghost'}`} onClick={() => setTab('file')} type="button">
          By PDF document
        </button>
      </div>

      {tab === 'id' ? (
        <form onSubmit={verifyById}>
          <label htmlFor="certId">Certificate ID (UUID)</label>
          <input
            id="certId"
            value={certificateId}
            onChange={(e) => setCertificateId(e.target.value)}
            placeholder="e.g. d9700ce3-c6b7-4f84-9b57-6fa64a27ea3a"
            required
          />
          <div className="btn-row">
            <button className="btn" disabled={loading} type="submit">
              {loading ? <span className="spinner" /> : '🔍'} Verify
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={verifyByFile}>
          <label htmlFor="pdf">Diploma PDF</label>
          <input id="pdf" type="file" accept="application/pdf,.pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <div className="btn-row">
            <button className="btn" disabled={loading} type="submit">
              {loading ? <span className="spinner" /> : '🔍'} Verify document
            </button>
          </div>
        </form>
      )}

      {error && <div className="alert error">{error}</div>}
      <VerificationResult result={result} />
    </div>
  );
}
