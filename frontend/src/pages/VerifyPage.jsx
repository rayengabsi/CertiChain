import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { errorMessage } from '../api/client.js';
import VerificationResult from '../components/VerificationResult.jsx';

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
    return () => {
      active = false;
    };
  }, [certificateId]);

  return (
    <div className="container">
      <h1 className="page-title">Certificate verification</h1>
      <p className="page-sub mono">{certificateId}</p>

      {loading && (
        <div className="card">
          <span className="spinner" /> Querying the blockchain…
        </div>
      )}
      {error && <div className="alert error">{error}</div>}
      {!loading && <VerificationResult result={result} />}

      <p className="muted small mt">
        <Link to="/">← Verify another document</Link>
      </p>
    </div>
  );
}
