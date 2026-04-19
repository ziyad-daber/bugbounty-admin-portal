'use client'
import React, { useState } from 'react';
import { useAccount, useWriteContract, useChainId, useSwitchChain } from 'wagmi';
import { erc20Abi } from 'viem';
import { CONTRACT_ADDRESS } from '@/services/contracts';
import { Droplet, CheckCircle, AlertCircle, ExternalLink, Coins, Shield } from 'lucide-react';

const ARBITRUM_SEPOLIA_CHAIN_ID = 421614;

// USDC on Arbitrum Sepolia
const USDC_ADDRESS = '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d';

export default function FaucetPage() {
  const { isConnected, address, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  const [ethStatus, setEthStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [usdcStatus, setUsdcStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const isOnWrongNetwork = isConnected && chainId !== ARBITRUM_SEPOLIA_CHAIN_ID;

  const getEthFromFaucet = async () => {
    if (!address) return;

    setEthStatus('loading');
    setMessage('Requesting ETH from faucet...');

    try {
      // Alchemy's Arbitrum Sepolia faucet
      const response = await fetch('https://faucet.circle.com/api/mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: address,
          chainId: ARBITRUM_SEPOLIA_CHAIN_ID,
          token: 'ETH'
        })
      }).catch(() => null);

      // Fallback: direct to Alchemy faucet
      if (!response || !response.ok) {
        window.open('https://www.alchemy.com/faucets/arbitrum-sepolia', '_blank');
        setMessage('Opened Alchemy faucet in new tab - claim ETH there!');
        setEthStatus('success');
        return;
      }

      setMessage('ETH requested successfully! Check your wallet in a few seconds.');
      setEthStatus('success');
    } catch (error: any) {
      setMessage(`Failed to get ETH: ${error.message}`);
      setEthStatus('error');
    }
  };

  const getUsdcFromFaucet = async () => {
    if (!address) return;

    setUsdcStatus('loading');
    setMessage('Requesting USDC from faucet...');

    try {
      // Circle's USDC faucet for Arbitrum Sepolia
      const response = await fetch('https://faucet.circle.com/api/mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: address,
          chainId: ARBITRUM_SEPOLIA_CHAIN_ID,
          token: 'USDC'
        })
      }).catch(() => null);

      // Fallback: direct to Circle faucet
      if (!response || !response.ok) {
        window.open('https://faucet.circle.com/', '_blank');
        setMessage('Opened Circle faucet in new tab - claim USDC there!');
        setUsdcStatus('success');
        return;
      }

      setMessage('USDC requested successfully! Check your wallet in a few seconds.');
      setUsdcStatus('success');
    } catch (error: any) {
      setMessage(`Failed to get USDC: ${error.message}`);
      setUsdcStatus('error');
    }
  };

  if (!isConnected) {
    return (
      <div className="animate-fade-in max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="text-center">
          <div className="inline-flex p-3 rounded-2xl bg-brand-50 dark:bg-brand-500/10 mb-4">
            <Droplet className="w-8 h-8 text-brand-600 dark:text-brand-400" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Test Token Faucet</h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">Get free testnet tokens for Arbitrum Sepolia</p>
        </div>
        <div className="glass-card p-8 mt-8 text-center">
          <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300 mb-4">Please connect your wallet to claim test tokens</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex p-3 rounded-2xl bg-brand-50 dark:bg-brand-500/10 mb-4">
          <Droplet className="w-8 h-8 text-brand-600 dark:text-brand-400" />
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Test Token Faucet</h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">Get free testnet tokens for Arbitrum Sepolia</p>
      </div>

      {/* Network Warning */}
      {isOnWrongNetwork && (
        <div className="glass-card p-4 mb-6 border-amber-200 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-amber-800 dark:text-amber-300">Wrong Network</p>
              <p className="text-sm text-amber-700/80 dark:text-amber-400/80 mt-1">
                Switch to <strong>Arbitrum Sepolia</strong> to claim tokens. Current chain ID: {chainId}
              </p>
              <button
                onClick={() => switchChain({ chainId: ARBITRUM_SEPOLIA_CHAIN_ID })}
                className="mt-3 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Switch Network
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Message */}
      {message && (
        <div className={`glass-card p-4 mb-6 flex items-center gap-3 ${
          ethStatus === 'error' || usdcStatus === 'error'
            ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20'
            : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20'
        }`}>
          {ethStatus === 'error' || usdcStatus === 'error' ? (
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          ) : (
            <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          )}
          <p className="text-sm font-medium text-red-800 dark:text-red-300 text-emerald-800 dark:text-emerald-300">
            {message}
          </p>
        </div>
      )}

      {/* ETH Card */}
      <div className="glass-card p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10">
              <Coins className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white">Arbitrum Sepolia ETH</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">For gas fees</p>
            </div>
          </div>
          <button
            onClick={getEthFromFaucet}
            disabled={ethStatus === 'loading' || isOnWrongNetwork}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
          >
            {ethStatus === 'loading' ? 'Claiming...' : 'Claim ETH'}
          </button>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <ExternalLink className="w-3 h-3" />
          <a href="https://www.alchemy.com/faucets/arbitrum-sepolia" target="_blank" rel="noopener noreferrer" className="hover:underline">
            Alternative: Alchemy Faucet
          </a>
        </div>
      </div>

      {/* USDC Card */}
      <div className="glass-card p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
              <Shield className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white">USDC</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">For report stakes</p>
            </div>
          </div>
          <button
            onClick={getUsdcFromFaucet}
            disabled={usdcStatus === 'loading' || isOnWrongNetwork}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
          >
            {usdcStatus === 'loading' ? 'Claiming...' : 'Claim USDC'}
          </button>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <ExternalLink className="w-3 h-3" />
          <a href="https://faucet.circle.com/" target="_blank" rel="noopener noreferrer" className="hover:underline">
            Alternative: Circle Faucet
          </a>
        </div>
      </div>

      {/* Info Box */}
      <div className="glass-card p-6 bg-brand-50/50 dark:bg-brand-500/5 border-brand-200 dark:border-brand-500/20">
        <h4 className="font-semibold text-brand-800 dark:text-brand-300 mb-2">About Test Tokens</h4>
        <ul className="space-y-2 text-sm text-brand-700/80 dark:text-brand-400/80">
          <li>• <strong>ETH:</strong> Needed for transaction gas fees on Arbitrum Sepolia</li>
          <li>• <strong>USDC:</strong> Required as stake when submitting vulnerability reports</li>
          <li>• Faucets may have daily limits - check back tomorrow if you've reached the limit</li>
          <li>• Test tokens have no real value and cannot be converted to real tokens</li>
        </ul>
      </div>
    </div>
  );
}
