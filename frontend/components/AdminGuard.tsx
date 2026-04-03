'use client'

import React from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import { ShieldAlert } from 'lucide-react';
import { WalletConnect } from './WalletConnect';

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null; // Prevent hydration errors
  }

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center shadow-xl">
          <div className="w-16 h-16 bg-brand-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-8 h-8 text-brand-400" />
          </div>
          <h2 className="text-2xl font-bold text-white flex justify-center mb-3">
            Admin Access Required
          </h2>
          <p className="text-gray-400 mb-8 max-w-sm mx-auto">
            Please connect your wallet to view your active bounties and manage submitted reports.
          </p>
          <div className="flex justify-center">
            <WalletConnect />
          </div>
        </div>
      </div>
    );
  }

  // FORCE Anvil Localhost Network
  if (chainId !== 31337) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center shadow-xl">
          <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-8 h-8 text-rose-400" />
          </div>
          <h2 className="text-2xl font-bold text-white flex justify-center mb-3">
            Wrong Network Detected
          </h2>
          <p className="text-gray-400 mb-8 max-w-sm mx-auto">
            Your MetaMask is connected to an unsupported network (Chain ID: {chainId}). You must switch to local Anvil (Chain ID: 31337).
          </p>
          <div className="flex justify-center">
            <button 
              onClick={() => switchChain({ chainId: 31337 })}
              className="px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold"
            >
              Switch to Anvil Devnet
            </button>
          </div>
        </div>
      </div>
    );
  }



  return <>{children}</>;
}
