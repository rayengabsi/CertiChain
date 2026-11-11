import { Wallet } from 'lucide-react';
import { useWallet } from '../../web3/WalletContext.jsx';
import { shortAddress } from '../../web3/contract.js';

/**
 * WalletChip — compact topbar indicator showing wallet connection state.
 * Clicking it triggers connect() if disconnected.
 */
export default function WalletChip() {
  const { address, chainId, expectedChainId, connecting, available, authorized, connect } =
    useWallet();

  if (!available) return null;

  const wrongChain = address && chainId !== expectedChainId;
  const warn = wrongChain || (address && authorized === false);

  if (!address) {
    return (
      <button
        className="wallet-chip"
        onClick={connect}
        disabled={connecting}
        type="button"
        title="Connect MetaMask wallet"
      >
        {connecting ? <span className="spinner" style={{ width: 8, height: 8, borderWidth: 1.5 }} /> : <Wallet size={14} />}
        {connecting ? 'Connecting…' : 'Connect Wallet'}
      </button>
    );
  }

  return (
    <div className={`wallet-chip${warn ? ' warn' : ''}`} title={address}>
      <span className="net-dot" />
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)' }}>
        {shortAddress(address)}
      </span>
    </div>
  );
}
