import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { BrowserProvider } from 'ethers';
import {
  CHAIN_ID,
  CHAIN_NAME,
  CONTRACT_ADDRESS,
  connectWallet as metamaskConnect,
  hasMetaMask,
  readContract,
} from './contract.js';

const WalletContext = createContext(null);

/**
 * WalletProvider — one shared MetaMask session for the whole app.
 *
 * It NEVER signs anything by itself: it only tracks the connected account, the current
 * chain and the account's on-chain roles (admin / authorized issuer), so the UI can show
 * the right status and disable issuance when the wrong wallet is connected. The actual
 * transactions are still signed by the pages through web3/contract.js (unchanged).
 */
export function WalletProvider({ children }) {
  const [wallet, setWallet] = useState(null); // { provider, signer, address }
  const [chainId, setChainId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(null);
  const [authorized, setAuthorized] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');

  const available = hasMetaMask();

  /** Read the connected account's roles straight from the contract. */
  const refreshRoles = useCallback(async (w) => {
    if (!w) {
      setIsAdmin(null);
      setAuthorized(null);
      return;
    }
    try {
      const contract = readContract(w.provider);
      const adminRole = await contract.DEFAULT_ADMIN_ROLE();
      const [admin, issuer] = await Promise.all([
        contract.hasRole(adminRole, w.address),
        contract.isIssuerAuthorized(w.address),
      ]);
      setIsAdmin(Boolean(admin));
      setAuthorized(Boolean(issuer));
    } catch {
      setIsAdmin(null);
      setAuthorized(null);
    }
  }, []);

  const adopt = useCallback(
    async (provider) => {
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();
      const w = { provider, signer, address };
      setWallet(w);
      setChainId(Number(network.chainId));
      await refreshRoles(w);
      return w;
    },
    [refreshRoles]
  );

  // On mount, silently pick up an already-authorized account (eth_accounts never prompts).
  useEffect(() => {
    let active = true;
    (async () => {
      if (!available) return;
      try {
        const provider = new BrowserProvider(window.ethereum);
        const accounts = await provider.send('eth_accounts', []);
        if (active && accounts?.length) await adopt(provider);
      } catch {
        /* ignore — user simply is not connected yet */
      }
    })();
    return () => {
      active = false;
    };
  }, [available, adopt]);

  // React to MetaMask account / chain changes.
  useEffect(() => {
    if (!available) return undefined;
    const onAccountsChanged = async (accounts) => {
      if (!accounts || accounts.length === 0) {
        setWallet(null);
        setChainId(null);
        setIsAdmin(null);
        setAuthorized(null);
        return;
      }
      try {
        await adopt(new BrowserProvider(window.ethereum));
      } catch {
        /* ignore */
      }
    };
    const onChainChanged = (hex) => setChainId(parseInt(hex, 16));
    window.ethereum.on('accountsChanged', onAccountsChanged);
    window.ethereum.on('chainChanged', onChainChanged);
    return () => {
      window.ethereum.removeListener('accountsChanged', onAccountsChanged);
      window.ethereum.removeListener('chainChanged', onChainChanged);
    };
  }, [available, adopt]);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError('');
    try {
      const w = await metamaskConnect();
      const network = await w.provider.getNetwork();
      setWallet(w);
      setChainId(Number(network.chainId));
      await refreshRoles(w);
      return w;
    } catch (err) {
      setError(err?.message || 'Could not connect to MetaMask.');
      throw err;
    } finally {
      setConnecting(false);
    }
  }, [refreshRoles]);

  const disconnect = useCallback(async () => {
    try {
      await window.ethereum?.request?.({ method: 'wallet_revokePermissions', params: [{ eth_accounts: {} }] });
    } catch {
      /* not all wallets support this — clearing local state is enough for the UI */
    }
    setWallet(null);
    setChainId(null);
    setIsAdmin(null);
    setAuthorized(null);
  }, []);

  const value = useMemo(
    () => ({
      wallet,
      address: wallet?.address || null,
      chainId,
      expectedChainId: CHAIN_ID,
      chainName: CHAIN_NAME,
      contractAddress: CONTRACT_ADDRESS,
      isAdmin,
      authorized,
      connecting,
      error,
      available,
      connect,
      disconnect,
      refreshRoles: () => refreshRoles(wallet),
    }),
    [wallet, chainId, isAdmin, authorized, connecting, error, available, connect, disconnect, refreshRoles]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used inside WalletProvider');
  return ctx;
}
