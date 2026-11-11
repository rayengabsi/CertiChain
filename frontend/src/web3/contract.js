import { BrowserProvider, Contract } from 'ethers';
import abi from './certificateRegistry.abi.json';

/**
 * MetaMask integration.
 *
 * IMPORTANT: this is the ONLY place where CertiChain transactions are signed.
 * The university/admin private keys stay inside MetaMask — the backend never sees them.
 */
export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';
export const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || 31337);
export const CHAIN_NAME = import.meta.env.VITE_CHAIN_NAME || 'Hardhat Localhost';

export function hasMetaMask() {
  return typeof window !== 'undefined' && Boolean(window.ethereum);
}

/** Ask MetaMask to switch to the CertiChain chain (and add it if unknown). */
async function ensureChain() {
  const hexChainId = '0x' + CHAIN_ID.toString(16);
  try {
    await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: hexChainId }] });
  } catch (err) {
    if (err?.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: hexChainId,
            chainName: CHAIN_NAME,
            nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
            rpcUrls: ['http://127.0.0.1:8545'],
          },
        ],
      });
    } else {
      throw err;
    }
  }
}

/** Connect MetaMask, verify the network, return { provider, signer, address }. */
export async function connectWallet() {
  if (!hasMetaMask()) throw new Error('MetaMask is not installed in this browser.');
  await ensureChain();
  const provider = new BrowserProvider(window.ethereum);
  const network = await provider.getNetwork();
  if (Number(network.chainId) !== CHAIN_ID) {
    throw new Error(`Wrong network: please switch MetaMask to ${CHAIN_NAME} (chainId ${CHAIN_ID}).`);
  }
  await provider.send('eth_requestAccounts', []);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  return { provider, signer, address };
}

/** Read-only contract (no wallet popup) for displaying on-chain state. */
export function readContract(provider) {
  return new Contract(CONTRACT_ADDRESS, abi, provider);
}

/** Contract bound to the connected MetaMask signer (transactions pop a wallet prompt). */
export function writeContract(signer) {
  return new Contract(CONTRACT_ADDRESS, abi, signer);
}

export async function isIssuerAuthorized(provider, address) {
  return readContract(provider).isIssuerAuthorized(address);
}

export const shortAddress = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '');
