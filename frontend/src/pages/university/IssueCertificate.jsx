import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardCopy,
  ExternalLink,
  FilePlus2,
  Hash,
  Loader2,
  RefreshCw,
  ShieldCheck,
  User,
} from 'lucide-react';
import api, { errorMessage } from '../../api/client.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import Stepper from '../../components/ui/Stepper.jsx';
import Dropzone from '../../components/ui/Dropzone.jsx';
import Field from '../../components/ui/Field.jsx';
import Button from '../../components/ui/Button.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import {
  CONTRACT_ADDRESS,
  CHAIN_ID,
  CHAIN_NAME,
  connectWallet,
  shortAddress,
  writeContract,
} from '../../web3/contract.js';
import { formatBytes } from '../../lib/format.js';

/* ── constants ────────────────────────────────────────────────────────── */
const STEPS = [
  { key: 'student',  label: 'Student Info' },
  { key: 'upload',   label: 'Diploma PDF'  },
  { key: 'hash',     label: 'Fingerprint'  },
  { key: 'issue',    label: 'Issue'        },
];

const EMPTY_FORM = { studentName: '', studentEmail: '', program: '', degree: '' };

function validate(form) {
  if (!form.studentName.trim())  return 'Student name is required.';
  if (!form.studentEmail.trim()) return 'Student email is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.studentEmail)) return 'Enter a valid email address.';
  if (!form.program.trim())      return 'Program is required.';
  if (!form.degree.trim())       return 'Degree is required.';
  return '';
}

/* ── CopyLine ─────────────────────────────────────────────────────────── */
function CopyLine({ value, label }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
      <span
        className="mono"
        style={{ flex: 1, fontSize: 'var(--fs-xs)', wordBreak: 'break-all', color: 'var(--accent-light, var(--accent))' }}
      >
        {value}
      </span>
      <button
        type="button"
        className="icon-btn"
        title={copied ? 'Copied!' : `Copy ${label}`}
        onClick={copy}
        style={{ flexShrink: 0, opacity: 0.7 }}
      >
        <ClipboardCopy size={13} />
      </button>
    </div>
  );
}

/* ── InfoRow ──────────────────────────────────────────────────────────── */
function InfoRow({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span className="muted" style={{ fontSize: 'var(--fs-xs)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
        {label}
      </span>
      <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 500 }}>{children}</span>
    </div>
  );
}

/* =========================================================================
   IssueCertificate — 4-step issuance wizard
   ========================================================================= */
export default function IssueCertificate() {
  const { university } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  /* ── step state ───────────────────────────────────────────────────────── */
  const [step, setStep] = useState(0); // 0–3

  /* ── step 1: student info ─────────────────────────────────────────────── */
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');

  /* ── step 2: file ─────────────────────────────────────────────────────── */
  const [file, setFile] = useState(null);

  /* ── step 3: upload / fingerprint ────────────────────────────────────── */
  const [uploading, setUploading] = useState(false);
  const [pending, setPending] = useState(null); // { certificateId, sha256, certIdBytes32, fingerprintBytes32 }

  /* ── step 4: wallet + on-chain ───────────────────────────────────────── */
  const [wallet, setWallet] = useState(null);
  const [connectingWallet, setConnectingWallet] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [txStatus, setTxStatus] = useState(''); // 'signing' | 'mining' | 'confirming'
  const [result, setResult] = useState(null); // { certificateId, txHash, qr }

  /* ── computed ─────────────────────────────────────────────────────────── */
  const walletMismatch = wallet && university &&
    wallet.address.toLowerCase() !== university.ethAddress?.toLowerCase();
  const notAuthorized = university && !university.authorized;

  /* ── Step 1 → 2 ──────────────────────────────────────────────────────── */
  function goToUpload(e) {
    e.preventDefault();
    const err = validate(form);
    if (err) { setFormError(err); return; }
    setFormError('');
    setStep(1);
  }

  /* ── Step 2 → 3 (upload PDF → fingerprint) ───────────────────────────── */
  async function goToFingerprint() {
    if (!file) { toast.error('Select a PDF first.'); return; }
    setUploading(true);
    setPending(null);
    try {
      const body = new FormData();
      Object.entries(form).forEach(([k, v]) => body.append(k, v));
      body.append('pdf', file);
      const { data } = await api.post('/certificates', body);
      setPending(data);
      setStep(2);
    } catch (err) {
      const d = err.response?.data;
      if (d?.error?.code === 'PENDING_EXISTS' && d.existing) {
        // Resume interrupted flow: treat the existing pending record as our pending.
        toast.warn(`Resuming interrupted issuance (existing ID: ${d.existing.certificateId}).`);
        setPending(d.existing);
        setStep(2);
      } else {
        toast.error(errorMessage(err));
      }
    } finally {
      setUploading(false);
    }
  }

  /* ── Step 3 → 4 ──────────────────────────────────────────────────────── */
  function goToIssue() {
    setStep(3);
  }

  /* ── Wallet connect ───────────────────────────────────────────────────── */
  async function onConnect() {
    setConnectingWallet(true);
    try {
      const w = await connectWallet();
      setWallet(w);
      const matches = university && w.address.toLowerCase() === university.ethAddress?.toLowerCase();
      if (matches) {
        toast.success(`Connected ${shortAddress(w.address)} — correct university wallet.`);
      } else {
        toast.warn(`Connected ${shortAddress(w.address)} — this is NOT the registered university wallet.`);
      }
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setConnectingWallet(false);
    }
  }

  /* ── On-chain issuance ────────────────────────────────────────────────── */
  async function onIssue() {
    if (!wallet)   { toast.error('Connect MetaMask first.'); return; }
    if (!pending)  { toast.error('No pending certificate — go back to Step 2.'); return; }
    if (walletMismatch) { toast.error('Wallet mismatch — connect the registered university wallet.'); return; }
    if (notAuthorized)  { toast.error('University is not authorized on-chain.'); return; }

    setIssuing(true);
    setTxStatus('signing');
    setResult(null);

    try {
      const contract = writeContract(wallet.signer);
      const tx = await contract.issue(pending.certIdBytes32, pending.fingerprintBytes32);
      setTxStatus('mining');
      toast.info(`Transaction submitted (${tx.hash.slice(0, 12)}…). Waiting for the block…`);
      await tx.wait();

      setTxStatus('confirming');
      const { data } = await api.post(`/certificates/${pending.certificateId}/confirm`, { txHash: tx.hash });

      setResult({
        certificateId: pending.certificateId,
        txHash: tx.hash,
        qr: data.qr,
      });
      setTxStatus('');
      toast.success('Certificate anchored on-chain ✅');
    } catch (err) {
      setTxStatus('');
      // MetaMask rejection has code 4001
      if (err?.code === 4001 || err?.code === 'ACTION_REJECTED') {
        toast.warn('Transaction rejected in MetaMask.');
      } else {
        toast.error(errorMessage(err));
      }
    } finally {
      setIssuing(false);
    }
  }

  /* ── Reset for a new certificate ─────────────────────────────────────── */
  function resetWizard() {
    setStep(0);
    setForm(EMPTY_FORM);
    setFormError('');
    setFile(null);
    setPending(null);
    setResult(null);
    setTxStatus('');
  }

  /* ======================================================================
     RENDER
     ====================================================================== */
  return (
    <DashboardLayout
      title="Issue Certificate"
      breadcrumbs={[
        { label: 'University', to: '/university' },
        { label: 'Issue Certificate' },
      ]}
      showWallet
    >
      {/* ── Authorization banner ─────────────────────────────────────────── */}
      {notAuthorized && (
        <div className="alert error" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <AlertTriangle size={16} />
          <span>
            This university is <strong>not authorized on-chain</strong>. The contract will reject issuance.
            Ask the platform admin to authorize your wallet.
          </span>
        </div>
      )}

      {/* ── Stepper ──────────────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 24, paddingBottom: 20 }}>
        <Stepper steps={STEPS} current={step} />
      </div>

      {/* ── Step 0 — Student information ─────────────────────────────────── */}
      {step === 0 && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <span className="stat-icon" style={{ width: 36, height: 36, borderRadius: 10 }}>
              <User size={18} />
            </span>
            <div>
              <h2 style={{ margin: 0, fontSize: 'var(--fs-lg)' }}>Student Information</h2>
              <p className="muted small" style={{ margin: 0 }}>
                This data is stored off-chain only — never written to the blockchain.
              </p>
            </div>
          </div>

          <form id="step0-form" onSubmit={goToUpload} noValidate>
            <div className="grid cols-2">
              <Field label="Student name" htmlFor="studentName" required error={formError && !form.studentName.trim() ? 'Required' : ''}>
                <input
                  id="studentName"
                  className="input"
                  value={form.studentName}
                  onChange={(e) => { setForm({ ...form, studentName: e.target.value }); setFormError(''); }}
                  maxLength={120}
                  placeholder="Full legal name"
                  autoFocus
                />
              </Field>
              <Field label="Student email" htmlFor="studentEmail" required error={formError && !form.studentEmail.trim() ? 'Required' : ''}>
                <input
                  id="studentEmail"
                  className="input"
                  type="email"
                  value={form.studentEmail}
                  onChange={(e) => { setForm({ ...form, studentEmail: e.target.value }); setFormError(''); }}
                  placeholder="student@university.edu"
                />
              </Field>
              <Field label="Program" htmlFor="program" required>
                <input
                  id="program"
                  className="input"
                  value={form.program}
                  onChange={(e) => setForm({ ...form, program: e.target.value })}
                  maxLength={150}
                  placeholder="e.g. Computer Science"
                />
              </Field>
              <Field label="Degree" htmlFor="degree" required>
                <input
                  id="degree"
                  className="input"
                  value={form.degree}
                  onChange={(e) => setForm({ ...form, degree: e.target.value })}
                  maxLength={150}
                  placeholder="e.g. Bachelor of Science"
                />
              </Field>
            </div>

            {formError && (
              <div className="alert error" style={{ marginTop: 8 }}>{formError}</div>
            )}

            <div className="btn-row" style={{ marginTop: 24, justifyContent: 'flex-end' }}>
              <Link className="btn ghost" to="/university">
                <ArrowLeft size={15} /> Cancel
              </Link>
              <Button type="submit" iconRight={ArrowRight}>
                Continue to Upload
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ── Step 1 — Diploma PDF upload ───────────────────────────────────── */}
      {step === 1 && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <span className="stat-icon" style={{ width: 36, height: 36, borderRadius: 10 }}>
              <FilePlus2 size={18} />
            </span>
            <div>
              <h2 style={{ margin: 0, fontSize: 'var(--fs-lg)' }}>Diploma PDF</h2>
              <p className="muted small" style={{ margin: 0 }}>
                The PDF is uploaded securely to the backend for hashing. It is never stored on the blockchain.
              </p>
            </div>
          </div>

          {/* Student summary */}
          <div
            className="card"
            style={{ background: 'var(--surface-alt)', marginBottom: 20, padding: '14px 16px' }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
              <InfoRow label="Student">{form.studentName}</InfoRow>
              <InfoRow label="Email">{form.studentEmail}</InfoRow>
              <InfoRow label="Program">{form.program}</InfoRow>
              <InfoRow label="Degree">{form.degree}</InfoRow>
            </div>
          </div>

          <Field label="Diploma PDF" htmlFor="pdf" required>
            <Dropzone
              file={file}
              onChange={setFile}
              disabled={uploading}
              hint="Only PDF files are accepted. Maximum size: 10 MB."
            />
          </Field>

          {uploading && (
            <div className="alert info" style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Loader2 size={16} className="spin-slow" />
              Uploading and computing SHA-256 fingerprint on the server…
            </div>
          )}

          <div className="btn-row" style={{ marginTop: 24, justifyContent: 'space-between' }}>
            <Button variant="ghost" icon={ArrowLeft} onClick={() => setStep(0)} disabled={uploading}>
              Back
            </Button>
            <Button
              iconRight={ArrowRight}
              loading={uploading}
              disabled={!file}
              onClick={goToFingerprint}
            >
              Upload &amp; Compute Hash
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 2 — SHA-256 fingerprint ─────────────────────────────────── */}
      {step === 2 && pending && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <span className="stat-icon ok" style={{ width: 36, height: 36, borderRadius: 10 }}>
              <Hash size={18} />
            </span>
            <div>
              <h2 style={{ margin: 0, fontSize: 'var(--fs-lg)' }}>Document Fingerprint</h2>
              <p className="muted small" style={{ margin: 0 }}>
                The backend computed a SHA-256 fingerprint of your PDF. Only this fingerprint — not the PDF — goes on-chain.
              </p>
            </div>
          </div>

          {/* Fingerprint card */}
          <div
            className="card"
            style={{ background: 'var(--surface-alt)', marginBottom: 20 }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <p className="muted" style={{ fontSize: 'var(--fs-xs)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
                  SHA-256 Fingerprint
                </p>
                <CopyLine value={pending.sha256} label="SHA-256" />
              </div>
              <div>
                <p className="muted" style={{ fontSize: 'var(--fs-xs)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
                  Certificate ID
                </p>
                <CopyLine value={pending.certificateId} label="certificate ID" />
              </div>
              <div>
                <p className="muted" style={{ fontSize: 'var(--fs-xs)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
                  Fingerprint (bytes32, to be anchored)
                </p>
                <CopyLine value={pending.fingerprintBytes32} label="fingerprint bytes32" />
              </div>
            </div>
          </div>

          {/* Privacy note */}
          <div className="alert info" style={{ marginBottom: 20 }}>
            <ShieldCheck size={15} />
            <div>
              <strong>Privacy preserved.</strong> The student's name, email, program and PDF file remain
              off-chain on the CertiChain backend. The blockchain stores only the fingerprint hash,
              the certificate ID, your wallet address, and a timestamp.
            </div>
          </div>

          {/* Summary */}
          <div
            className="card"
            style={{ background: 'var(--surface-alt)', padding: '14px 16px', marginBottom: 20 }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
              <InfoRow label="Student">{form.studentName}</InfoRow>
              <InfoRow label="Program">{form.program}</InfoRow>
              <InfoRow label="Degree">{form.degree}</InfoRow>
              {file && <InfoRow label="File">{file.name} ({formatBytes(file.size)})</InfoRow>}
            </div>
          </div>

          <div className="btn-row" style={{ marginTop: 24, justifyContent: 'space-between' }}>
            <Button variant="ghost" icon={ArrowLeft} onClick={() => setStep(1)}>
              Back
            </Button>
            <Button iconRight={ArrowRight} onClick={goToIssue}>
              Proceed to Blockchain Issuance
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 3 — Blockchain issuance ─────────────────────────────────── */}
      {step === 3 && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <span className={`stat-icon ${result ? 'ok' : ''}`} style={{ width: 36, height: 36, borderRadius: 10 }}>
              {result ? <CheckCircle2 size={18} /> : <ShieldCheck size={18} />}
            </span>
            <div>
              <h2 style={{ margin: 0, fontSize: 'var(--fs-lg)' }}>
                {result ? 'Certificate Issued ✅' : 'Blockchain Issuance'}
              </h2>
              <p className="muted small" style={{ margin: 0 }}>
                {result
                  ? 'The fingerprint is permanently anchored on-chain.'
                  : 'Sign the issue() transaction with your MetaMask wallet.'}
              </p>
            </div>
          </div>

          {/* ── SUCCESS state ─────────────────────────────────────────────── */}
          {result ? (
            <>
              <div className="alert ok" style={{ marginBottom: 20 }}>
                <CheckCircle2 size={16} />
                Certificate successfully anchored on-chain and confirmed by the backend.
              </div>

              <div className="card" style={{ background: 'var(--surface-alt)', marginBottom: 20 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <p className="muted" style={{ fontSize: 'var(--fs-xs)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
                      Certificate ID
                    </p>
                    <CopyLine value={result.certificateId} label="certificate ID" />
                  </div>
                  <div>
                    <p className="muted" style={{ fontSize: 'var(--fs-xs)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
                      Transaction Hash
                    </p>
                    <CopyLine value={result.txHash} label="tx hash" />
                  </div>
                </div>
              </div>

              {result.qr && (
                <div className="card" style={{ background: 'var(--surface-alt)', marginBottom: 20 }}>
                  <h3 style={{ marginBottom: 12, fontSize: 'var(--fs-sm)' }}>Verification QR Code</h3>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
                    <div className="qr">
                      <img src={result.qr.dataUrl} alt="Verification QR code" />
                    </div>
                    <div>
                      <p className="muted small" style={{ marginBottom: 8 }}>Public verification URL:</p>
                      <p className="mono small" style={{ wordBreak: 'break-all', marginBottom: 12 }}>{result.qr.url}</p>
                      <a
                        href={result.qr.url}
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

              <div className="btn-row" style={{ marginTop: 24 }}>
                <Link
                  className="btn ghost"
                  to={`/university/certificate/${result.certificateId}`}
                >
                  View Certificate Detail
                </Link>
                <Button icon={FilePlus2} onClick={resetWizard}>
                  Issue Another Certificate
                </Button>
              </div>
            </>
          ) : (
            /* ── PRE-ISSUE state ──────────────────────────────────────────── */
            <>
              {/* Wallet card */}
              <div className="card" style={{ background: 'var(--surface-alt)', marginBottom: 20 }}>
                <div className="spread" style={{ marginBottom: wallet ? 14 : 0 }}>
                  <div>
                    <h3 style={{ margin: '0 0 2px', fontSize: 'var(--fs-sm)' }}>Signing Wallet</h3>
                    <p className="muted" style={{ margin: 0, fontSize: 'var(--fs-xs)', fontFamily: 'var(--font-mono)' }}>
                      {CONTRACT_ADDRESS} · {CHAIN_NAME} (chainId {CHAIN_ID})
                    </p>
                  </div>
                  <Button
                    variant={wallet ? 'subtle' : 'primary'}
                    size="small"
                    icon={wallet ? RefreshCw : ShieldCheck}
                    loading={connectingWallet}
                    onClick={onConnect}
                  >
                    {wallet ? 'Reconnect' : 'Connect MetaMask'}
                  </Button>
                </div>

                {wallet && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <span
                      className="pill"
                      style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)' }}
                    >
                      {wallet.address}
                    </span>
                    {walletMismatch
                      ? <span className="badge bad"><span className="dot" />Wallet mismatch</span>
                      : <span className="badge ok"><span className="dot" />Correct wallet</span>
                    }
                  </div>
                )}
              </div>

              {/* Mismatch warning */}
              {walletMismatch && (
                <div className="alert warn" style={{ marginBottom: 16 }}>
                  <AlertTriangle size={15} />
                  Connected wallet does not match the registered university wallet
                  ({shortAddress(university?.ethAddress)}). Switch wallets in MetaMask before issuing.
                </div>
              )}

              {/* Not authorized warning */}
              {notAuthorized && (
                <div className="alert error" style={{ marginBottom: 16 }}>
                  <AlertTriangle size={15} />
                  University is not authorized on-chain. Contact the platform admin.
                </div>
              )}

              {/* Pending summary */}
              {pending && (
                <div className="card" style={{ background: 'var(--surface-alt)', marginBottom: 20 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                      <p className="muted" style={{ fontSize: 'var(--fs-xs)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
                        Certificate ID (bytes32 key)
                      </p>
                      <CopyLine value={pending.certIdBytes32} label="cert ID" />
                    </div>
                    <div>
                      <p className="muted" style={{ fontSize: 'var(--fs-xs)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
                        SHA-256 Fingerprint (bytes32)
                      </p>
                      <CopyLine value={pending.fingerprintBytes32} label="fingerprint" />
                    </div>
                  </div>
                </div>
              )}

              {/* Transaction status */}
              {txStatus && (
                <div className="alert info" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Loader2 size={16} className="spin-slow" />
                  {txStatus === 'signing'    && 'Waiting for MetaMask signature…'}
                  {txStatus === 'mining'     && 'Transaction submitted — waiting for the block to be mined…'}
                  {txStatus === 'confirming' && 'Block confirmed — notifying the backend…'}
                </div>
              )}

              <div className="btn-row" style={{ marginTop: 24, justifyContent: 'space-between' }}>
                <Button
                  variant="ghost"
                  icon={ArrowLeft}
                  onClick={() => setStep(2)}
                  disabled={issuing}
                >
                  Back
                </Button>
                <Button
                  icon={ShieldCheck}
                  loading={issuing}
                  disabled={!wallet || walletMismatch || notAuthorized || !pending}
                  onClick={onIssue}
                >
                  Sign &amp; Issue On-Chain
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
