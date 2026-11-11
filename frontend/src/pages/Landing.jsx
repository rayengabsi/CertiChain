import { Link } from 'react-router-dom';
import {
  ArrowRight,
  FileCheck2,
  Hash,
  Link2,
  Lock,
  Search,
  ShieldCheck,
  University,
  WalletCards,
  Zap,
} from 'lucide-react';

const HOW_IT_WORKS = [
  {
    num: '01',
    icon: University,
    title: 'Universities issue certificates',
    text: 'Authorised institutions upload a diploma PDF. The backend computes its SHA-256 fingerprint.',
  },
  {
    num: '02',
    icon: Link2,
    title: 'Blockchain records the fingerprint',
    text: 'The university signs an on-chain transaction with MetaMask. The fingerprint, certificate ID and issuer wallet are permanently written to the smart contract.',
  },
  {
    num: '03',
    icon: Search,
    title: 'Anyone can verify instantly',
    text: 'Paste a certificate ID or upload the original PDF. The result is read directly from the blockchain — no need to trust any database.',
  },
  {
    num: '04',
    icon: ShieldCheck,
    title: 'Tampering is detectable',
    text: 'One modified byte changes the entire SHA-256 hash. A modified document can never produce a VALID result.',
  },
];

const SECURITY = [
  {
    icon: Hash,
    title: 'SHA-256 fingerprinting',
    text: 'Each PDF is reduced to a unique 256-bit digest. The original document never leaves the secured backend.',
  },
  {
    icon: Link2,
    title: 'Blockchain-based verification',
    text: 'The fingerprint is anchored on a public blockchain. It is immutable and readable by anyone, forever.',
  },
  {
    icon: Lock,
    title: 'Student data stays off-chain',
    text: 'No personal data is written on-chain. The blockchain stores only the fingerprint hash and a certificate ID.',
  },
  {
    icon: WalletCards,
    title: 'Authorised university wallets',
    text: 'Only wallets granted the ISSUER_ROLE by the platform admin can issue or revoke certificates.',
  },
];

export default function Landing() {
  return (
    <div>
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section
        style={{
          position: 'relative',
          overflow: 'hidden',
          padding: '96px 0 80px',
          textAlign: 'center',
        }}
      >
        {/* Background glow */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '-120px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '800px',
            height: '500px',
            background:
              'radial-gradient(ellipse at center, rgba(121,92,255,0.18) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div className="container" style={{ position: 'relative' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '5px 14px',
              borderRadius: 'var(--r-full)',
              border: '1px solid rgba(121,92,255,0.4)',
              background: 'var(--accent-soft)',
              color: '#d3caff',
              fontSize: 'var(--fs-xs)',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: 24,
            }}
          >
            <Zap size={12} /> Blockchain-anchored academic credentials
          </div>

          <h1
            style={{
              fontSize: 'clamp(32px, 5vw, 52px)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
              maxWidth: 780,
              margin: '0 auto 20px',
            }}
          >
            Verify Academic Credentials{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, var(--accent-hover), var(--blue))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              with Confidence
            </span>
          </h1>

          <p
            style={{
              maxWidth: 560,
              margin: '0 auto 36px',
              color: 'var(--text-muted)',
              fontSize: 'var(--fs-lg)',
              lineHeight: 1.6,
            }}
          >
            A secure and transparent way to verify academic certificates using blockchain
            technology.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              to="/verify/lookup"
              className="btn"
              style={{
                fontSize: 'var(--fs-md)',
                padding: '12px 24px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <FileCheck2 size={17} /> Verify a Certificate
            </Link>
            <Link
              to="/login"
              className="btn ghost"
              style={{
                fontSize: 'var(--fs-md)',
                padding: '12px 24px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              University Login <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section style={{ padding: '72px 0', background: 'var(--bg-elev)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2
              style={{
                fontSize: 'var(--fs-3xl)',
                fontWeight: 750,
                letterSpacing: '-0.02em',
                marginBottom: 10,
              }}
            >
              How CertiChain Works
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-md)', maxWidth: 500, margin: '0 auto' }}>
              A four-step process that makes academic fraud impossible.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
              gap: 20,
            }}
          >
            {HOW_IT_WORKS.map(({ num, icon: Icon, title, text }) => (
              <div
                key={num}
                className="card"
                style={{
                  borderTop: '2px solid var(--accent)',
                  position: 'relative',
                  paddingTop: 24,
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: 16,
                    right: 20,
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: '0.1em',
                    color: 'var(--text-dim)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {num}
                </span>
                <span
                  style={{
                    display: 'grid',
                    placeItems: 'center',
                    width: 40,
                    height: 40,
                    borderRadius: 'var(--r-sm)',
                    background: 'var(--accent-soft)',
                    color: 'var(--accent-hover)',
                    marginBottom: 14,
                  }}
                >
                  <Icon size={20} strokeWidth={2} />
                </span>
                <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 650, marginBottom: 8 }}>
                  {title}
                </h3>
                <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', lineHeight: 1.65 }}>
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Security & Privacy ───────────────────────────────────────────── */}
      <section style={{ padding: '72px 0' }}>
        <div className="container">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.4fr)',
              gap: 60,
              alignItems: 'center',
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: 'var(--fs-3xl)',
                  fontWeight: 750,
                  letterSpacing: '-0.02em',
                  marginBottom: 14,
                }}
              >
                Built on security{' '}
                <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                  &amp; privacy
                </span>
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-md)', lineHeight: 1.65, marginBottom: 28 }}>
                CertiChain holds <strong>zero private keys</strong>. Every issuance and
                revocation is signed by the university's own MetaMask wallet. Verification does
                not depend on trusting CertiChain's servers.
              </p>
              <Link
                to="/verify/lookup"
                className="btn"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
              >
                <Search size={15} /> Verify a Certificate
              </Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {SECURITY.map(({ icon: Icon, title, text }) => (
                <div
                  key={title}
                  className="card"
                  style={{ padding: 20 }}
                >
                  <span
                    style={{
                      display: 'grid',
                      placeItems: 'center',
                      width: 36,
                      height: 36,
                      borderRadius: 'var(--r-sm)',
                      background: 'var(--blue-soft)',
                      color: 'var(--blue)',
                      marginBottom: 12,
                    }}
                  >
                    <Icon size={17} strokeWidth={2.1} />
                  </span>
                  <h4 style={{ fontSize: 'var(--fs-sm)', fontWeight: 650, marginBottom: 6 }}>
                    {title}
                  </h4>
                  <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    {text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA footer strip ──────────────────────────────────────────────── */}
      <section
        style={{
          padding: '56px 0',
          background: 'var(--bg-elev)',
          borderTop: '1px solid var(--border)',
        }}
      >
        <div className="container" style={{ textAlign: 'center' }}>
          <h2
            style={{
              fontSize: 'var(--fs-2xl)',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              marginBottom: 10,
            }}
          >
            Are you a university?
          </h2>
          <p
            style={{
              color: 'var(--text-muted)',
              fontSize: 'var(--fs-md)',
              marginBottom: 24,
            }}
          >
            Log in to issue and revoke certificates on-chain using your authorised wallet.
          </p>
          <Link
            to="/login"
            className="btn ghost"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            Institution Login <ArrowRight size={15} />
          </Link>
        </div>
      </section>
    </div>
  );
}
