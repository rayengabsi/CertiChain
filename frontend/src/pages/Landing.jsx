import { Link } from 'react-router-dom';
import VerifyPanel from '../components/VerifyPanel.jsx';

export default function Landing() {
  return (
    <div className="container">
      <section className="hero">
        <span className="badge brand">Blockchain-anchored academic credentials</span>
        <h1>Verify a diploma in seconds — without trusting anyone's database.</h1>
        <p>
          CertiChain stores a SHA-256 fingerprint of each diploma on a public blockchain. Anyone can
          verify a certificate or a PDF; nobody can silently alter it afterwards. Student personal data
          stays off-chain.
        </p>
      </section>

      <div className="grid cols-2">
        <VerifyPanel />

        <div className="grid">
          <div className="card">
            <h3>How it works</h3>
            <ol className="muted small" style={{ lineHeight: 1.7, paddingLeft: 18 }}>
              <li>A university uploads the diploma PDF; the <strong>backend</strong> computes its SHA-256.</li>
              <li>The university signs an <span className="mono">issue()</span> transaction with <strong>MetaMask</strong> — only authorized universities hold the on-chain <span className="mono">ISSUER_ROLE</span>.</li>
              <li>The certificate ID, fingerprint, issuer and timestamp are written on-chain.</li>
              <li>Verification recomputes the hash and compares it with the on-chain anchor.</li>
            </ol>
          </div>
          <div className="card">
            <h3>Why the blockchain?</h3>
            <p className="muted small" style={{ lineHeight: 1.7 }}>
              A database can be edited by whoever runs it. Once a fingerprint is confirmed on-chain, changing
              it would require rewriting the chain. Verification therefore does not depend on trusting
              CertiChain's servers — and one changed byte in a PDF changes the hash completely
              (avalanche effect).
            </p>
            <p className="muted small">
              CertiChain holds <strong>zero private keys</strong>: every issuance and revocation is signed by the
              university's own MetaMask wallet.
            </p>
          </div>
          <div className="card">
            <h3>Are you a university?</h3>
            <p className="muted small">Log in to issue and revoke certificates on-chain.</p>
            <Link className="btn ghost small" to="/login">
              Institution login →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
