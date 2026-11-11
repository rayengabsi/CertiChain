import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCopy,
  Clock,
  ExternalLink,
  FilePlus2,
  RefreshCw,
  Search,
  ShieldCheck,
  ShieldOff,
  X,
  XCircle,
} from 'lucide-react';
import api, { errorMessage } from '../../api/client.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import Button from '../../components/ui/Button.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import {
  CONTRACT_ADDRESS,
  CHAIN_ID,
  CHAIN_NAME,
  connectWallet,
  shortAddress,
  writeContract,
} from '../../web3/contract.js';

const EMPTY_FORM = { studentName: '', studentEmail: '', program: '', degree: '' };
const fmtDate = (v) => (v ? new Date(v).toLocaleString() : '—');
const fmtDateShort = (v) => (v ? new Date(v).toLocaleDateString() : '—');
const PAGE_SIZE = 10;

/* ── Sort icon ────────────────────────────────────────────────────────── */
function SortIcon({ col, sortKey, sortAsc }) {
  if (sortKey !== col) return <ChevronDown size={13} style={{ opacity: 0.3 }} />;
  return sortAsc ? <ChevronUp size={13} /> : <ChevronDown size={13} />;
}

/**
 * University dashboard — premium redesign (Stage 4).
 *
 * Preserves all existing API calls and MetaMask signing flows.
 * The issuance form is intentionally kept here but visually deprioritised
 * (Stage 5 will extract it into a dedicated page/modal).
 */
export default function UniversityDashboard() {
  const { user, university, refreshMe } = useAuth();
  const toast = useToast();

  /* ── data ─────────────────────────────────────────────────────────────── */
  const [certificates, setCertificates] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  /* ── wallet ───────────────────────────────────────────────────────────── */
  const [wallet, setWallet] = useState(null);
  const [connectingWallet, setConnectingWallet] = useState(false);

  /* ── issuance state (kept from original) ─────────────────────────────── */
  const [form, setForm] = useState(EMPTY_FORM);
  const [file, setFile] = useState(null);
  const [pending, setPending] = useState(null);
  const [qr, setQr] = useState(null);
  const [busy, setBusy] = useState('');

  /* ── table UI ─────────────────────────────────────────────────────────── */
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortKey, setSortKey] = useState('issuedAt');
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);
  const [copiedId, setCopiedId] = useState(null);

  /* ── load ─────────────────────────────────────────────────────────────── */
  const loadCertificates = useCallback(async () => {
    setLoadingData(true);
    try {
      const { data } = await api.get('/certificates');
      setCertificates(data.certificates);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoadingData(false);
    }
  }, [toast]);

  useEffect(() => { loadCertificates(); }, [loadCertificates]);

  /* ── computed stats ───────────────────────────────────────────────────── */
  const stats = useMemo(() => {
    const issued = certificates.filter((c) => c.status === 'issued').length;
    const revoked = certificates.filter((c) => c.status === 'revoked').length;
    const pending_count = certificates.filter((c) => c.status === 'pending').length;
    return { total: certificates.length, issued, revoked, pending: pending_count };
  }, [certificates]);

  /* ── filtered + sorted + paginated list ───────────────────────────────── */
  const filtered = useMemo(() => {
    let list = certificates;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.studentName?.toLowerCase().includes(q) ||
          c.certificateId?.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') list = list.filter((c) => c.status === statusFilter);

    list = [...list].sort((a, b) => {
      let va = a[sortKey] ?? '';
      let vb = b[sortKey] ?? '';
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortAsc ? -1 : 1;
      if (va > vb) return sortAsc ? 1 : -1;
      return 0;
    });
    return list;
  }, [certificates, search, statusFilter, sortKey, sortAsc]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  function toggleSort(key) {
    if (sortKey === key) setSortAsc((a) => !a);
    else { setSortKey(key); setSortAsc(true); }
  }

  function copyId(id) {
    navigator.clipboard?.writeText(id).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  }

  /* ── wallet connect ───────────────────────────────────────────────────── */
  async function onConnect() {
    setConnectingWallet(true);
    try {
      const w = await connectWallet();
      setWallet(w);
      const matches = university && w.address.toLowerCase() === university.ethAddress?.toLowerCase();
      if (matches) {
        toast.success(`Connected ${shortAddress(w.address)} — matches registered wallet.`);
      } else {
        toast.warn(`Connected ${shortAddress(w.address)} — WARNING: not the registered wallet for ${university?.name || 'this university'}.`);
      }
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setConnectingWallet(false);
    }
  }

  /* ── issuance (Step 1: upload) ────────────────────────────────────────── */
  async function onUpload(e) {
    e.preventDefault();
    if (!file) { toast.error('Choose a PDF file first.'); return; }
    setBusy('upload');
    setQr(null);
    setPending(null);
    try {
      const body = new FormData();
      Object.entries(form).forEach(([k, v]) => body.append(k, v));
      body.append('pdf', file);
      const { data } = await api.post('/certificates', body);
      setPending(data);
      toast.info(`PDF hashed. SHA-256 = ${data.sha256.slice(0, 16)}… Sign issue() to anchor on-chain.`);
      setForm(EMPTY_FORM);
      setFile(null);
      await loadCertificates();
    } catch (err) {
      const data = err.response?.data;
      if (data?.error?.code === 'PENDING_EXISTS' && data.existing) {
        toast.error(`${data.error.message} (existing ID: ${data.existing.certificateId})`);
      } else {
        toast.error(errorMessage(err));
      }
    } finally {
      setBusy('');
    }
  }

  /* ── issuance (Step 2: sign on-chain) ────────────────────────────────── */
  async function onConfirmIssue() {
    if (!wallet) { toast.error('Connect MetaMask first.'); return; }
    if (!pending) return;
    setBusy('issue');
    try {
      const contract = writeContract(wallet.signer);
      const tx = await contract.issue(pending.certIdBytes32, pending.fingerprintBytes32);
      toast.info(`issue() submitted (${tx.hash.slice(0, 12)}…). Waiting for the transaction to be mined…`);
      await tx.wait();
      const { data } = await api.post(`/certificates/${pending.certificateId}/confirm`, { txHash: tx.hash });
      setQr(data.qr);
      toast.success('Certificate anchored on-chain and confirmed. ✅');
      setPending(null);
      await loadCertificates();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy('');
    }
  }

  const walletMismatch = wallet && university &&
    wallet.address.toLowerCase() !== university.ethAddress?.toLowerCase();
  const notAuthorized = university && !university.authorized;
  const pageTitle = university?.name || 'University Dashboard';

  /* ── recent activity (last 5) ─────────────────────────────────────────── */
  const recentCerts = useMemo(() =>
    [...certificates]
      .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
      .slice(0, 5),
    [certificates]
  );

  return (
    <DashboardLayout
      title={pageTitle}
      breadcrumbs={[{ label: 'University' }, { label: 'Dashboard' }]}
      showWallet
      actions={
        <Button icon={FilePlus2} onClick={() => document.getElementById('issue-section')?.scrollIntoView({ behavior: 'smooth' })}>
          Issue Certificate
        </Button>
      }
    >
      {/* ── Authorization banner ─────────────────────────────────────────── */}
      {notAuthorized && (
        <div className="alert error" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <ShieldOff size={16} />
          <span>
            This university is <strong>not authorized on-chain</strong>. The contract will reject any issuance.
            Ask the platform admin to authorize your wallet.
          </span>
          <Button variant="ghost" size="small" onClick={refreshMe} style={{ marginLeft: 'auto' }}>
            ↻ Re-check
          </Button>
        </div>
      )}

      {/* ── KPI row ─────────────────────────────────────────────────────── */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <StatCard
          label="Total Certificates"
          value={loadingData ? '…' : stats.total}
          icon={Award}
        />
        <StatCard
          label="Valid (Issued)"
          value={loadingData ? '…' : stats.issued}
          icon={CheckCircle2}
          tone="ok"
        />
        <StatCard
          label="Revoked"
          value={loadingData ? '…' : stats.revoked}
          icon={XCircle}
          tone="bad"
        />
        <StatCard
          label="Pending On-Chain"
          value={loadingData ? '…' : stats.pending}
          icon={Clock}
          tone="warn"
        />
      </div>

      {/* ── Two-column info row ─────────────────────────────────────────── */}
      <div className="grid cols-2" style={{ marginBottom: 24, alignItems: 'start' }}>

        {/* University Info */}
        <div className="card" style={{ height: '100%' }}>
          <h3 style={{ marginBottom: 14, fontSize: 'var(--fs-md)' }}>University Information</h3>
          <dl className="kv">
            <dt>Name</dt>
            <dd>{university?.name || '—'}</dd>
            <dt>Registered wallet</dt>
            <dd className="mono" style={{ fontSize: 'var(--fs-xs)', wordBreak: 'break-all' }}>
              {university?.ethAddress || '—'}
            </dd>
            <dt>Authorization</dt>
            <dd>
              {university?.authorized
                ? <span className="badge ok"><span className="dot" />Authorized on-chain</span>
                : <span className="badge warn"><span className="dot" />Not authorized</span>
              }
            </dd>
            <dt>Contract</dt>
            <dd className="mono" style={{ fontSize: 'var(--fs-xs)' }}>{CONTRACT_ADDRESS}</dd>
          </dl>
        </div>

        {/* Wallet Status Card */}
        <div className="card" style={{ height: '100%' }}>
          <div className="spread" style={{ marginBottom: 14 }}>
            <h3 style={{ fontSize: 'var(--fs-md)', margin: 0 }}>Signing Wallet (MetaMask)</h3>
            <Button
              variant={wallet ? 'subtle' : 'primary'}
              size="small"
              icon={wallet ? RefreshCw : ShieldCheck}
              loading={connectingWallet}
              onClick={onConnect}
            >
              {wallet ? 'Reconnect' : 'Connect Wallet'}
            </Button>
          </div>

          {wallet ? (
            <>
              <dl className="kv">
                <dt>Connected address</dt>
                <dd className="mono" style={{ fontSize: 'var(--fs-xs)', wordBreak: 'break-all' }}>
                  {wallet.address}
                </dd>
                <dt>Network</dt>
                <dd>{CHAIN_NAME}</dd>
                <dt>Chain ID</dt>
                <dd>{CHAIN_ID}</dd>
                <dt>Status</dt>
                <dd>
                  {walletMismatch ? (
                    <span className="badge bad"><span className="dot" />Wallet mismatch</span>
                  ) : (
                    <span className="badge ok"><span className="dot" />Correct wallet</span>
                  )}
                </dd>
              </dl>
              {walletMismatch && (
                <div className="alert warn" style={{ marginTop: 12 }}>
                  <AlertTriangle size={15} />
                  Connected wallet does not match the registered university wallet.
                  Certificate issuance will be rejected by the contract.
                  Please switch to <span className="mono" style={{ fontSize: 'var(--fs-xs)' }}>{shortAddress(university?.ethAddress)}</span>.
                </div>
              )}
            </>
          ) : (
            <p className="muted small">
              Connect the university MetaMask wallet to sign <code>issue()</code> and <code>revoke()</code> transactions.
              CertiChain holds <strong>no private keys</strong>.
            </p>
          )}
        </div>
      </div>

      {/* ── Recent Activity ──────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 14, fontSize: 'var(--fs-md)' }}>Recent Activity</h3>
        {loadingData ? (
          <div>
            {[1, 2, 3].map((i) => <div key={i} className="skeleton row" style={{ marginBottom: 8 }} />)}
          </div>
        ) : recentCerts.length === 0 ? (
          <p className="muted small">No certificates yet.</p>
        ) : (
          <div className="table-wrap plain">
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Program / Degree</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentCerts.map((c) => (
                  <tr key={c.certificateId}>
                    <td>
                      <div className="cell-strong">{c.studentName}</div>
                      <div className="cell-sub mono">{c.certificateId.slice(0, 8)}…</div>
                    </td>
                    <td>
                      <div>{c.program}</div>
                      <div className="cell-sub">{c.degree}</div>
                    </td>
                    <td><StatusBadge status={c.status} /></td>
                    <td className="small">{fmtDateShort(c.issuedAt || c.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Certificate Issuance (preserved, Stage 5 will refactor) ─────── */}
      <div id="issue-section" className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ marginBottom: 6 }}>Issue a Certificate</h2>
        <p className="muted small" style={{ marginBottom: 16 }}>
          Upload a diploma PDF. The backend computes the SHA-256 fingerprint; only the fingerprint and
          certificate ID are stored on-chain — never student personal data.
        </p>

        {(walletMismatch) && (
          <div className="alert warn" style={{ marginBottom: 14 }}>
            <AlertTriangle size={15} /> Issuance is disabled: connected wallet does not match the registered university wallet.
          </div>
        )}

        <form onSubmit={onUpload}>
          <div className="grid cols-2">
            <div className="field">
              <label htmlFor="studentName">Student name <span className="req">*</span></label>
              <input
                id="studentName"
                className="input"
                value={form.studentName}
                onChange={(e) => setForm({ ...form, studentName: e.target.value })}
                required
                maxLength={120}
              />
            </div>
            <div className="field">
              <label htmlFor="studentEmail">Student email <span className="req">*</span></label>
              <input
                id="studentEmail"
                className="input"
                type="email"
                value={form.studentEmail}
                onChange={(e) => setForm({ ...form, studentEmail: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="program">Program <span className="req">*</span></label>
              <input
                id="program"
                className="input"
                value={form.program}
                onChange={(e) => setForm({ ...form, program: e.target.value })}
                required
                maxLength={150}
              />
            </div>
            <div className="field">
              <label htmlFor="degree">Degree <span className="req">*</span></label>
              <input
                id="degree"
                className="input"
                value={form.degree}
                onChange={(e) => setForm({ ...form, degree: e.target.value })}
                required
                maxLength={150}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="pdf">Diploma PDF <span className="req">*</span></label>
            <input
              id="pdf"
              type="file"
              accept="application/pdf,.pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              required
            />
          </div>
          <div className="btn-row">
            <Button
              type="submit"
              icon={FilePlus2}
              loading={busy === 'upload'}
              disabled={!wallet || walletMismatch || notAuthorized}
            >
              Upload &amp; Hash PDF
            </Button>
          </div>
        </form>

        {pending && (
          <div className="alert ok" style={{ marginTop: 16 }}>
            <div className="spread">
              <div>
                <strong>Ready to anchor on-chain</strong>
                <div className="small mono" style={{ marginTop: 4 }}>Certificate ID: {pending.certificateId}</div>
                <div className="small mono">SHA-256: {pending.sha256}</div>
              </div>
              <Button
                variant="primary"
                onClick={onConfirmIssue}
                loading={busy === 'issue'}
                disabled={!wallet || walletMismatch}
              >
                Sign issue() with MetaMask
              </Button>
            </div>
          </div>
        )}

        {qr && (
          <div className="card mt" style={{ background: 'var(--surface-alt)' }}>
            <h3 style={{ marginBottom: 10 }}>Certificate Anchored ✅</h3>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
              <div className="qr">
                <img src={qr.dataUrl} alt="Verification QR code" />
              </div>
              <div>
                <p className="muted small">Scan to verify or share this public link:</p>
                <p className="mono small">{qr.url}</p>
                <Link className="btn ghost small" to={`/university/certificate/${qr.certificateId}`}>
                  Open Certificate Detail <ExternalLink size={13} />
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Certificate Management Table ─────────────────────────────────── */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '18px 20px 0' }}>
          <div className="spread" style={{ marginBottom: 14 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 'var(--fs-lg)' }}>Certificate Management</h2>
              <p className="muted small" style={{ margin: '3px 0 0' }}>
                {loadingData ? 'Loading…' : `${filtered.length} of ${certificates.length} certificates`}
              </p>
            </div>
            <button className="icon-btn" onClick={loadCertificates} disabled={loadingData} title="Refresh" type="button">
              <RefreshCw size={16} className={loadingData ? 'spin-slow' : ''} />
            </button>
          </div>

          {/* Toolbar */}
          <div className="toolbar" style={{ marginBottom: 0, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
            <div className="input-icon grow">
              <Search size={15} />
              <input
                className="input"
                type="search"
                placeholder="Search by student name or certificate ID…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <div className="tabs">
              {[
                ['all', 'All'],
                ['issued', 'Issued'],
                ['pending', 'Pending'],
                ['revoked', 'Revoked'],
              ].map(([v, l]) => (
                <button
                  key={v}
                  className="tab"
                  aria-selected={statusFilter === v}
                  onClick={() => { setStatusFilter(v); setPage(1); }}
                  type="button"
                >
                  {l}
                </button>
              ))}
            </div>
            {search && (
              <button className="icon-btn" onClick={() => setSearch('')} title="Clear search" type="button">
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="table-wrap plain">
          {loadingData ? (
            <div style={{ padding: 20 }}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton row" style={{ marginBottom: 10 }} />
              ))}
            </div>
          ) : paginated.length === 0 ? (
            <div className="empty">
              <div className="empty-icon"><Award size={24} /></div>
              <h3>{certificates.length === 0 ? 'No certificates yet' : 'No results'}</h3>
              <p>
                {certificates.length === 0
                  ? 'Issue your first certificate using the form above.'
                  : 'Try adjusting your search or filter.'}
              </p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th className="sortable" onClick={() => toggleSort('studentName')}>
                    <span className="th-inner">Student <SortIcon col="studentName" sortKey={sortKey} sortAsc={sortAsc} /></span>
                  </th>
                  <th className="sortable" onClick={() => toggleSort('program')}>
                    <span className="th-inner">Program <SortIcon col="program" sortKey={sortKey} sortAsc={sortAsc} /></span>
                  </th>
                  <th>Degree</th>
                  <th>Certificate ID</th>
                  <th className="sortable" onClick={() => toggleSort('status')}>
                    <span className="th-inner">Status <SortIcon col="status" sortKey={sortKey} sortAsc={sortAsc} /></span>
                  </th>
                  <th className="sortable" onClick={() => toggleSort('issuedAt')}>
                    <span className="th-inner">Issue Date <SortIcon col="issuedAt" sortKey={sortKey} sortAsc={sortAsc} /></span>
                  </th>
                  <th className="col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((c) => (
                  <tr key={c.certificateId}>
                    <td>
                      <div className="cell-strong">{c.studentName}</div>
                      <div className="cell-sub">{c.studentEmail}</div>
                    </td>
                    <td>{c.program}</td>
                    <td className="small">{c.degree}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span
                          className="mono"
                          style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}
                          title={c.certificateId}
                        >
                          {c.certificateId.slice(0, 10)}…
                        </span>
                        <button
                          className="icon-btn"
                          type="button"
                          title={copiedId === c.certificateId ? 'Copied!' : 'Copy certificate ID'}
                          onClick={() => copyId(c.certificateId)}
                          style={{ opacity: 0.6 }}
                        >
                          <ClipboardCopy size={13} />
                        </button>
                      </div>
                    </td>
                    <td><StatusBadge status={c.status} /></td>
                    <td className="small nowrap">{fmtDate(c.issuedAt || c.createdAt)}</td>
                    <td className="col-actions">
                      <Link
                        className="btn ghost small"
                        to={`/university/certificate/${c.certificateId}`}
                      >
                        Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!loadingData && filtered.length > PAGE_SIZE && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={filtered.length}
              onChange={setPage}
            />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
