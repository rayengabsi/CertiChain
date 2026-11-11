import { useCallback, useEffect, useState } from 'react';
import api, { errorMessage } from '../../api/client.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import {
  CONTRACT_ADDRESS,
  CHAIN_ID,
  CHAIN_NAME,
  connectWallet,
  readContract,
  shortAddress,
  writeContract,
} from '../../web3/contract.js';

const EMPTY_FORM = { name: '', ethAddress: '', email: '', password: '', fullName: '' };
const formatDate = (v) => (v ? new Date(v).toLocaleString() : '—');

/**
 * Admin dashboard.
 *
 * Two independent layers are shown side by side on purpose (this is the heart of the
 * project's security model):
 *   • the OFF-CHAIN database mirror (what the API reports), and
 *   • the LIVE on-chain role state read straight from the contract.
 *
 * Authorization is a MetaMask-signed transaction: the admin wallet (never the backend)
 * signs authorizeIssuer()/deauthorizeIssuer(); the backend then verifies the receipt.
 */
export default function AdminDashboard() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState(null); // { provider, signer, address }
  const [isOnChainAdmin, setIsOnChainAdmin] = useState(null);
  const [universities, setUniversities] = useState([]);
  const [activity, setActivity] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [unis, log] = await Promise.all([api.get('/admin/universities'), api.get('/admin/activity')]);
      setUniversities(unis.data.universities);
      setActivity(log.data.activity);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /** Connect MetaMask and check whether the connected wallet holds DEFAULT_ADMIN_ROLE on-chain. */
  async function onConnect() {
    setError('');
    setNotice('');
    setBusy('connect');
    try {
      const w = await connectWallet();
      setWallet(w);
      const admin = await readContract(w.provider).hasRole(
        await readContract(w.provider).DEFAULT_ADMIN_ROLE(),
        w.address
      );
      setIsOnChainAdmin(admin);
      setNotice(
        admin
          ? `Connected ${shortAddress(w.address)} — this wallet holds the on-chain admin role.`
          : `Connected ${shortAddress(w.address)} — WARNING: this wallet does NOT hold the on-chain admin role.`
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy('');
    }
  }

  /** Create the university record + login account (off-chain), then guide to on-chain auth. */
  async function onCreate(e) {
    e.preventDefault();
    setError('');
    setNotice('');
    setBusy('create');
    try {
      const { data } = await api.post('/admin/universities', form);
      setForm(EMPTY_FORM);
      setNotice(
        `University "${data.university.name}" created (not yet authorized on-chain). ` +
          `Next: sign authorizeIssuer() with the admin wallet, then click "Authorize on-chain".`
      );
      await loadData();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy('');
    }
  }

  /**
   * Sign authorizeIssuer()/deauthorizeIssuer() with MetaMask, then ask the backend to
   * verify the receipt. The backend re-reads the chain and only then updates its mirror.
   */
  async function onRoleChange(uni, authorize) {
    setError('');
    setNotice('');
    if (!wallet) {
      setError('Connect the admin MetaMask wallet first.');
      return;
    }
    setBusy(`${authorize ? 'auth' : 'deauth'}:${uni.id}`);
    try {
      const contract = writeContract(wallet.signer);
      const tx = authorize
        ? await contract.authorizeIssuer(uni.ethAddress)
        : await contract.deauthorizeIssuer(uni.ethAddress);
      setNotice(`Transaction submitted (${tx.hash.slice(0, 12)}…). Waiting for confirmation…`);
      await tx.wait();

      const endpoint = authorize ? 'confirm-authorization' : 'confirm-deauthorization';
      await api.post(`/admin/universities/${uni.id}/${endpoint}`, { txHash: tx.hash });

      setNotice(
        `${uni.name} is now ${authorize ? 'AUTHORIZED' : 'DEAUTHORIZED'} on-chain (tx ${tx.hash.slice(0, 12)}…).`
      );
      await loadData();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy('');
    }
  }

  return (
    <DashboardLayout
      title="Platform Administration"
      breadcrumbs={[{ label: 'Admin' }, { label: 'Dashboard' }]}
      showWallet
    >
      <div>
      <p className="page-sub">
        Signed in as <strong>{user?.email}</strong>. Grant or revoke a university's right to issue
        certificates. Authorization is enforced by the smart contract, not by this server.
      </p>

      {/* ── wallet / chain status ─────────────────────────────────────────── */}
      <div className="card">
        <div className="spread">
          <div>
            <h3 style={{ marginBottom: 4 }}>Admin wallet (MetaMask)</h3>
            <p className="muted small" style={{ margin: 0 }}>
              Contract <span className="mono">{CONTRACT_ADDRESS}</span> · {CHAIN_NAME} (chainId {CHAIN_ID})
            </p>
          </div>
          <button className="btn" onClick={onConnect} disabled={busy === 'connect'}>
            {busy === 'connect' ? <span className="spinner" /> : '🦊'}{' '}
            {wallet ? 'Reconnect wallet' : 'Connect admin wallet'}
          </button>
        </div>

        {wallet && (
          <dl className="kv mt">
            <dt>Address</dt>
            <dd className="mono">{wallet.address}</dd>
            <dt>On-chain admin role</dt>
            <dd>
              {isOnChainAdmin === null ? (
                'checking…'
              ) : isOnChainAdmin ? (
                <StatusBadge status="authorized" />
              ) : (
                <StatusBadge status="unauthorized" />
              )}
            </dd>
          </dl>
        )}
        {!wallet && (
          <p className="muted small mt">
            The admin's wallet signs every on-chain role change. The CertiChain backend holds{' '}
            <strong>no private keys</strong>.
          </p>
        )}
      </div>

      {error && <div className="alert error">{error}</div>}
      {notice && <div className="alert info">{notice}</div>}

      {/* ── create university ─────────────────────────────────────────────── */}
      <div className="card">
        <h2>Register a university</h2>
        <p className="muted small">
          Creates the institution's account. The wallet address must be the one the university will
          use in MetaMask — it is the on-chain identity that will hold the ISSUER_ROLE.
        </p>
        <form onSubmit={onCreate}>
          <div className="grid cols-2">
            <div>
              <label htmlFor="name">University name</label>
              <input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} maxLength={150} />
            </div>
            <div>
              <label htmlFor="ethAddress">Wallet address (0x…)</label>
              <input
                id="ethAddress"
                className="mono"
                value={form.ethAddress}
                onChange={(e) => setForm({ ...form, ethAddress: e.target.value })}
                placeholder="0x…"
                pattern="^0x[0-9a-fA-F]{40}$"
                required
              />
            </div>
            <div>
              <label htmlFor="email">Login email</label>
              <input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div>
              <label htmlFor="password">Initial password (min 10 chars)</label>
              <input
                id="password"
                type="text"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                minLength={10}
                required
              />
            </div>
            <div>
              <label htmlFor="fullName">Contact name (optional)</label>
              <input id="fullName" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} maxLength={120} />
            </div>
          </div>
          <div className="btn-row">
            <button className="btn" type="submit" disabled={busy === 'create'}>
              {busy === 'create' ? <span className="spinner" /> : '➕'} Create university
            </button>
          </div>
        </form>
      </div>

      {/* ── university list ───────────────────────────────────────────────── */}
      <div className="card">
        <div className="spread">
          <h2 style={{ margin: 0 }}>Universities</h2>
          <button className="btn ghost small" onClick={loadData}>
            ↻ Refresh
          </button>
        </div>
        <div className="table-wrap mt">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Wallet</th>
                <th>Status (DB mirror)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {universities.length === 0 && (
                <tr>
                  <td colSpan={4} className="muted">
                    No universities yet.
                  </td>
                </tr>
              )}
              {universities.map((u) => (
                <tr key={u.id}>
                  <td>
                    <strong>{u.name}</strong>
                    <div className="muted small">{u.accountEmail || '—'}</div>
                  </td>
                  <td className="mono">{shortAddress(u.ethAddress)}</td>
                  <td>
                    <StatusBadge status={u.authorized ? 'authorized' : 'unauthorized'} />
                    <div className="muted small">
                      {u.authorized ? `since ${formatDate(u.authorizedAt)}` : u.deauthorizedAt ? `revoked ${formatDate(u.deauthorizedAt)}` : 'never authorized'}
                    </div>
                  </td>
                  <td>
                    <div className="row">
                      {u.authorized ? (
                        <button
                          className="btn danger small"
                          onClick={() => onRoleChange(u, false)}
                          disabled={busy === `deauth:${u.id}` || !wallet}
                        >
                          {busy === `deauth:${u.id}` ? <span className="spinner" /> : '⛔'} Deauthorize
                        </button>
                      ) : (
                        <button
                          className="btn ok small"
                          onClick={() => onRoleChange(u, true)}
                          disabled={busy === `auth:${u.id}` || !wallet}
                        >
                          {busy === `auth:${u.id}` ? <span className="spinner" /> : '✅'} Authorize
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!wallet && universities.length > 0 && (
          <p className="muted small mt">Connect the admin wallet to enable the authorization buttons.</p>
        )}
      </div>

      {/* ── activity log ──────────────────────────────────────────────────── */}
      <div className="card">
        <h2>Recent activity (audit log)</h2>
        <p className="muted small">Append-only trail of security-relevant actions.</p>
        <div className="table-wrap">
          <table>
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
              {activity.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted">
                    No activity recorded yet.
                  </td>
                </tr>
              )}
              {activity.slice(0, 50).map((a) => (
                <tr key={a.id}>
                  <td className="small">{formatDate(a.at)}</td>
                  <td className="small">{a.actor || 'anonymous'}</td>
                  <td className="small">{a.action}</td>
                  <td className="small mono">{a.target || '—'}</td>
                  <td>
                    <span className={`badge ${a.result === 'success' ? 'ok' : 'bad'}`}>{a.result}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </DashboardLayout>
  );
}
