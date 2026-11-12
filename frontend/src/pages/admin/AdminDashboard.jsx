import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  ShieldOff,
  X,
  XCircle,
} from 'lucide-react';
import api, { errorMessage } from '../../api/client.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import { shortAddress } from '../../web3/contract.js';
import {
  CONTRACT_ADDRESS,
  CHAIN_ID,
  CHAIN_NAME,
  connectWallet,
  readContract,
  writeContract,
} from '../../web3/contract.js';

const EMPTY_FORM = { name: '', ethAddress: '', email: '', password: '', fullName: '' };
const fmtDate = (v) => (v ? new Date(v).toLocaleString() : '—');
const fmtDateShort = (v) => (v ? new Date(v).toLocaleDateString() : '—');

/* ── Status badge (local, design-system-aware) ──────────────────────────── */
function AuthBadge({ authorized }) {
  return authorized ? (
    <span className="badge ok"><span className="dot" />Authorized</span>
  ) : (
    <span className="badge warn"><span className="dot" />Not authorized</span>
  );
}

/* ── Result badge for activity log ─────────────────────────────────────── */
function ResultBadge({ result }) {
  return result === 'success' ? (
    <span className="badge ok">success</span>
  ) : (
    <span className="badge bad">{result}</span>
  );
}

/* =========================================================================
   AdminDashboard
   ========================================================================= */
export default function AdminDashboard() {
  const { user } = useAuth();
  const toast = useToast();

  /* ── data ─────────────────────────────────────────────────────────────── */
  const [universities, setUniversities] = useState([]);
  const [activity, setActivity] = useState([]);

  const [loadingData, setLoadingData] = useState(true);

  /* ── wallet ───────────────────────────────────────────────────────────── */
  const [wallet, setWallet] = useState(null);
  const [isOnChainAdmin, setIsOnChainAdmin] = useState(null);
  const [connectingWallet, setConnectingWallet] = useState(false);

  /* ── UI state ─────────────────────────────────────────────────────────── */
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'authorized' | 'unauthorized'
  const [sortKey, setSortKey] = useState('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [busy, setBusy] = useState(''); // e.g. 'auth:id' | 'deauth:id' | 'create'

  /* ── modals ───────────────────────────────────────────────────────────── */
  const [registerOpen, setRegisterOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');

  const [confirmAction, setConfirmAction] = useState(null); // { uni, type: 'auth'|'deauth' }

  /* ── detail drawer ───────────────────────────────────────────────────── */
  const [detailUni, setDetailUni] = useState(null);

  /* ── load ─────────────────────────────────────────────────────────────── */
  const loadData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [uRes, aRes] = await Promise.all([
        api.get('/admin/universities'),
        api.get('/admin/activity'),
      ]);
      setUniversities(uRes.data.universities);
      setActivity(aRes.data.activity);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoadingData(false);
    }
  }, [toast]);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── computed stats ───────────────────────────────────────────────────── */
  const stats = useMemo(() => {
    const authorized = universities.filter((u) => u.authorized).length;
    return {
      total: universities.length,
      authorized,
      unauthorized: universities.length - authorized,
    };
  }, [universities]);

  /* ── filtered + sorted university list ───────────────────────────────── */
  const displayedUnis = useMemo(() => {
    let list = universities;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (u) =>
          u.name?.toLowerCase().includes(q) ||
          u.accountEmail?.toLowerCase().includes(q) ||
          u.ethAddress?.toLowerCase().includes(q)
      );
    }
    if (statusFilter === 'authorized') list = list.filter((u) => u.authorized);
    if (statusFilter === 'unauthorized') list = list.filter((u) => !u.authorized);

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
  }, [universities, search, statusFilter, sortKey, sortAsc]);

  /* ── sort toggle ─────────────────────────────────────────────────────── */
  function toggleSort(key) {
    if (sortKey === key) setSortAsc((a) => !a);
    else { setSortKey(key); setSortAsc(true); }
  }

  function SortIcon({ col }) {
    if (sortKey !== col) return <ChevronDown size={13} style={{ opacity: 0.3 }} />;
    return sortAsc ? <ChevronUp size={13} /> : <ChevronDown size={13} />;
  }

  /* ── wallet connect ───────────────────────────────────────────────────── */
  async function onConnect() {
    setConnectingWallet(true);
    try {
      const w = await connectWallet();
      setWallet(w);
      const contract = readContract(w.provider);
      const adminRole = await contract.DEFAULT_ADMIN_ROLE();
      const isAdmin = await contract.hasRole(adminRole, w.address);
      setIsOnChainAdmin(Boolean(isAdmin));
      toast.success(
        isAdmin
          ? `Connected ${shortAddress(w.address)} — admin role confirmed.`
          : `Connected ${shortAddress(w.address)} — WARNING: not the on-chain admin.`
      );
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setConnectingWallet(false);
    }
  }

  /* ── register university ──────────────────────────────────────────────── */
  async function onCreate(e) {
    e.preventDefault();
    setFormError('');
    setBusy('create');
    try {
      const { data } = await api.post('/admin/universities', form);
      setForm(EMPTY_FORM);
      setRegisterOpen(false);
      toast.success(`University "${data.university.name}" registered. Authorize its wallet next.`);
      await loadData();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setBusy('');
    }
  }

  /* ── authorize / deauthorize ─────────────────────────────────────────── */
  async function executeRoleChange(uni, authorize) {
    if (!wallet) { toast.error('Connect the admin MetaMask wallet first.'); return; }
    setConfirmAction(null);
    setBusy(`${authorize ? 'auth' : 'deauth'}:${uni.id}`);
    try {
      const contract = writeContract(wallet.signer);
      const tx = authorize
        ? await contract.authorizeIssuer(uni.ethAddress)
        : await contract.deauthorizeIssuer(uni.ethAddress);
      toast.info(`Transaction submitted (${tx.hash.slice(0, 12)}…). Waiting for mining…`);
      await tx.wait();

      const endpoint = authorize ? 'confirm-authorization' : 'confirm-deauthorization';
      await api.post(`/admin/universities/${uni.id}/${endpoint}`, { txHash: tx.hash });

      toast.success(`${uni.name} is now ${authorize ? 'authorized' : 'deauthorized'} on-chain.`);
      await loadData();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy('');
    }
  }

  /* ── render ───────────────────────────────────────────────────────────── */
  return (
    <DashboardLayout
      title="Platform Administration"
      breadcrumbs={[{ label: 'Admin' }, { label: 'Dashboard' }]}
      showWallet
      actions={
        <Button icon={Plus} onClick={() => { setForm(EMPTY_FORM); setFormError(''); setRegisterOpen(true); }}>
          Register University
        </Button>
      }
    >
      {/* ── KPI row ─────────────────────────────────────────────────────── */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <StatCard
          label="Total Universities"
          value={loadingData ? '…' : stats.total}
          icon={Building2}
        />
        <StatCard
          label="Authorized"
          value={loadingData ? '…' : stats.authorized}
          icon={ShieldCheck}
          tone="ok"
        />
        <StatCard
          label="Not Authorized"
          value={loadingData ? '…' : stats.unauthorized}
          icon={ShieldOff}
          tone="warn"
        />
      </div>

      {/* ── Wallet status card ───────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="spread">
          <div>
            <h3 style={{ marginBottom: 4, fontSize: 'var(--fs-md)' }}>Admin Wallet (MetaMask)</h3>
            <p className="muted small" style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)' }}>
              {CONTRACT_ADDRESS} · {CHAIN_NAME} (chainId {CHAIN_ID})
            </p>
          </div>
          <Button
            variant={wallet ? 'subtle' : 'primary'}
            icon={wallet ? RefreshCw : ShieldCheck}
            loading={connectingWallet}
            onClick={onConnect}
            size="small"
          >
            {wallet ? 'Reconnect' : 'Connect Admin Wallet'}
          </Button>
        </div>

        {wallet && (
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <div className="pill" style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)' }}>
              {wallet.address}
            </div>
            {isOnChainAdmin === true && <span className="badge ok"><span className="dot" />On-chain admin role confirmed</span>}
            {isOnChainAdmin === false && <span className="badge bad"><span className="dot" />No on-chain admin role — wrong wallet?</span>}
          </div>
        )}

        {!wallet && (
          <p className="muted small" style={{ marginTop: 10 }}>
            Connect the admin wallet to sign <code>authorizeIssuer()</code> / <code>deauthorizeIssuer()</code> transactions.
            CertiChain holds <strong>no private keys</strong>.
          </p>
        )}
      </div>

      {/* ── University management ────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 24, padding: 0 }}>
        {/* Table header / toolbar */}
        <div style={{ padding: '18px 20px 0' }}>
          <div className="spread" style={{ marginBottom: 14 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 'var(--fs-lg)' }}>Universities</h2>
              <p className="muted small" style={{ margin: '3px 0 0' }}>
                {loadingData ? 'Loading…' : `${displayedUnis.length} of ${universities.length} institutions`}
              </p>
            </div>
            <button className="icon-btn" onClick={loadData} disabled={loadingData} title="Refresh" type="button">
              <RefreshCw size={16} className={loadingData ? 'spin-slow' : ''} />
            </button>
          </div>

          {/* Search + filter toolbar */}
          <div className="toolbar" style={{ marginBottom: 0, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
            <div className="input-icon grow">
              <Search size={15} />
              <input
                className="input"
                type="search"
                placeholder="Search by name, email, or wallet…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="tabs">
              {[['all', 'All'], ['authorized', 'Authorized'], ['unauthorized', 'Not authorized']].map(([v, l]) => (
                <button
                  key={v}
                  className="tab"
                  aria-selected={statusFilter === v}
                  onClick={() => setStatusFilter(v)}
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
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton row" style={{ marginBottom: 10 }} />
              ))}
            </div>
          ) : displayedUnis.length === 0 ? (
            <div className="empty">
              <div className="empty-icon"><Building2 size={24} /></div>
              <h3>{universities.length === 0 ? 'No universities yet' : 'No results'}</h3>
              <p>
                {universities.length === 0
                  ? 'Register your first institution using the button above.'
                  : 'Try adjusting your search or filter.'}
              </p>
              {universities.length === 0 && (
                <Button icon={Plus} size="small" onClick={() => setRegisterOpen(true)}>
                  Register University
                </Button>
              )}
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th className="sortable" onClick={() => toggleSort('name')}>
                    <span className="th-inner">Institution <SortIcon col="name" /></span>
                  </th>
                  <th>Wallet</th>
                  <th className="sortable" onClick={() => toggleSort('authorized')}>
                    <span className="th-inner">Status <SortIcon col="authorized" /></span>
                  </th>
                  <th className="sortable" onClick={() => toggleSort('createdAt')}>
                    <span className="th-inner">Registered <SortIcon col="createdAt" /></span>
                  </th>
                  <th className="col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedUnis.map((u) => {
                  const authBusy = busy === `auth:${u.id}`;
                  const deauthBusy = busy === `deauth:${u.id}`;
                  const anyBusy = authBusy || deauthBusy;

                  return (
                    <tr key={u.id}>
                      <td>
                        <div className="cell-strong">{u.name}</div>
                        <div className="cell-sub">{u.accountEmail || '—'}</div>
                      </td>
                      <td>
                        <span
                          className="pill"
                          style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', cursor: 'pointer' }}
                          title={u.ethAddress}
                          onClick={() => navigator.clipboard?.writeText(u.ethAddress)}
                        >
                          {shortAddress(u.ethAddress)}
                        </span>
                      </td>
                      <td>
                        <AuthBadge authorized={u.authorized} />
                        <div className="cell-sub">
                          {u.authorized
                            ? `Since ${fmtDateShort(u.authorizedAt)}`
                            : u.deauthorizedAt
                            ? `Revoked ${fmtDateShort(u.deauthorizedAt)}`
                            : 'Never authorized'}
                        </div>
                      </td>
                      <td className="small">{fmtDateShort(u.createdAt)}</td>
                      <td className="col-actions">
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <Button
                            variant="ghost"
                            size="small"
                            onClick={() => setDetailUni(u)}
                          >
                            View
                          </Button>
                          {u.authorized ? (
                            <Button
                              variant="danger"
                              size="small"
                              icon={ShieldOff}
                              loading={deauthBusy}
                              disabled={anyBusy || !wallet}
                              onClick={() => setConfirmAction({ uni: u, type: 'deauth' })}
                            >
                              Revoke
                            </Button>
                          ) : (
                            <Button
                              variant="success"
                              size="small"
                              icon={ShieldCheck}
                              loading={authBusy}
                              disabled={anyBusy || !wallet}
                              onClick={() => setConfirmAction({ uni: u, type: 'auth' })}
                            >
                              Authorize
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {!wallet && universities.length > 0 && !loadingData && (
          <div className="alert warn" style={{ margin: '0 20px 16px' }}>
            <AlertTriangle size={16} /> Connect the admin wallet to enable authorization actions.
          </div>
        )}
      </div>

      {/* ── Activity log ────────────────────────────────────────────────── */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ margin: 0, fontSize: 'var(--fs-lg)' }}>Activity Log</h2>
          <p className="muted small" style={{ margin: '3px 0 0' }}>Append-only audit trail of security-relevant actions.</p>
        </div>

        <div className="table-wrap plain">
          {loadingData ? (
            <div style={{ padding: 20 }}>
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton row" style={{ marginBottom: 10 }} />
              ))}
            </div>
          ) : activity.length === 0 ? (
            <div className="empty">
              <div className="empty-icon"><Activity size={22} /></div>
              <h3>No activity yet</h3>
              <p>Events will appear here once actions are taken.</p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {activity.slice(0, 100).map((a, idx) => (
                  <tr key={a.id || idx}>
                    <td className="small nowrap">{fmtDate(a.at)}</td>
                    <td>
                      <div className="cell-strong" style={{ fontSize: 'var(--fs-xs)' }}>{a.actor || 'anonymous'}</div>
                      {a.role && <div className="cell-sub">{a.role}</div>}
                    </td>
                    <td className="small">{a.action}</td>
                    <td>
                      <span className="mono" style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
                        {a.target || '—'}
                      </span>
                    </td>
                    <td><ResultBadge result={a.result} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Register university modal ────────────────────────────────────── */}
      <Modal
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        title="Register a University"
        subtitle="Create the institution's account and assign its blockchain wallet identity."
        icon={Building2}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRegisterOpen(false)} disabled={busy === 'create'}>
              Cancel
            </Button>
            <Button form="reg-form" type="submit" loading={busy === 'create'} icon={Plus}>
              Create University
            </Button>
          </>
        }
      >
        <form id="reg-form" onSubmit={onCreate}>
          <div className="grid cols-2">
            <div className="field">
              <label htmlFor="reg-name">University name <span className="req">*</span></label>
              <input
                id="reg-name"
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                minLength={2}
                maxLength={150}
                placeholder="e.g. MIT"
              />
            </div>
            <div className="field">
              <label htmlFor="reg-eth">Wallet address (0x…) <span className="req">*</span></label>
              <input
                id="reg-eth"
                className="input"
                style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-sm)' }}
                value={form.ethAddress}
                onChange={(e) => setForm({ ...form, ethAddress: e.target.value })}
                placeholder="0x…"
                pattern="^0x[0-9a-fA-F]{40}$"
                required
              />
              <div className="hint">The MetaMask wallet this university will use to sign transactions.</div>
            </div>
            <div className="field">
              <label htmlFor="reg-email">Login email <span className="req">*</span></label>
              <input
                id="reg-email"
                type="email"
                className="input"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                placeholder="admin@university.edu"
              />
            </div>
            <div className="field">
              <label htmlFor="reg-password">Initial password <span className="req">*</span></label>
              <input
                id="reg-password"
                type="text"
                className="input"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                minLength={10}
                required
                placeholder="Minimum 10 characters"
              />
            </div>
            <div className="field">
              <label htmlFor="reg-fullName">Contact name</label>
              <input
                id="reg-fullName"
                className="input"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                maxLength={120}
                placeholder="Optional"
              />
            </div>
          </div>

          {formError && (
            <div className="alert error">
              <XCircle size={16} /> {formError}
            </div>
          )}

          <div className="alert info" style={{ marginTop: 10 }}>
            <ShieldCheck size={16} />
            After creation, authorize the wallet on-chain using the admin MetaMask account.
          </div>
        </form>
      </Modal>

      {/* ── Confirm authorize / deauthorize ─────────────────────────────── */}
      {confirmAction && (
        <ConfirmDialog
          open
          onClose={() => setConfirmAction(null)}
          onConfirm={() => executeRoleChange(confirmAction.uni, confirmAction.type === 'auth')}
          title={confirmAction.type === 'auth' ? 'Authorize on-chain' : 'Revoke authorization'}
          description={
            confirmAction.type === 'auth'
              ? `Sign authorizeIssuer(${shortAddress(confirmAction.uni.ethAddress)}) with MetaMask. This grants ${confirmAction.uni.name} the ISSUER_ROLE on the smart contract.`
              : `Sign deauthorizeIssuer(${shortAddress(confirmAction.uni.ethAddress)}) with MetaMask. ${confirmAction.uni.name} will immediately lose the ability to issue certificates.`
          }
          confirmLabel={confirmAction.type === 'auth' ? 'Sign & Authorize' : 'Sign & Revoke'}
          variant={confirmAction.type === 'auth' ? 'success' : 'danger'}
          icon={confirmAction.type === 'auth' ? ShieldCheck : ShieldOff}
          iconVariant={confirmAction.type === 'auth' ? 'ok' : 'danger'}
          busy={!!busy}
        />
      )}

      {/* ── University detail modal ──────────────────────────────────────── */}
      {detailUni && (
        <Modal
          open
          onClose={() => setDetailUni(null)}
          title={detailUni.name}
          subtitle="University details"
          icon={Building2}
          size="lg"
          footer={
            <Button variant="ghost" onClick={() => setDetailUni(null)}>
              Close
            </Button>
          }
        >
          <dl className="kv">
            <dt>Name</dt><dd>{detailUni.name}</dd>
            <dt>Login email</dt><dd>{detailUni.accountEmail || '—'}</dd>
            <dt>Contact name</dt><dd>{detailUni.fullName || '—'}</dd>
            <dt>Wallet address</dt>
            <dd style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', wordBreak: 'break-all' }}>
              {detailUni.ethAddress}
            </dd>
            <dt>Authorization</dt>
            <dd><AuthBadge authorized={detailUni.authorized} /></dd>
            <dt>Authorized at</dt><dd>{fmtDate(detailUni.authorizedAt)}</dd>
            <dt>Deauthorized at</dt><dd>{fmtDate(detailUni.deauthorizedAt)}</dd>
            <dt>Registered</dt><dd>{fmtDate(detailUni.createdAt)}</dd>
          </dl>

          {!detailUni.authorized && (
            <div className="alert warn" style={{ marginTop: 14 }}>
              <AlertTriangle size={16} />
              This university is not yet authorized on-chain. Connect the admin wallet and use the Authorize action.
            </div>
          )}
        </Modal>
      )}
    </DashboardLayout>
  );
}
