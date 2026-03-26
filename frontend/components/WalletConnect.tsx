'use client'
import React from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Wallet, LogOut } from 'lucide-react';

export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm font-mono font-medium text-emerald-700 dark:text-emerald-300">
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </span>
        </div>
        <button onClick={() => disconnect()} className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors" title="Disconnect">
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const connector = connectors[0];
  return (
    <button onClick={() => connect({ connector })} className="btn-primary flex items-center gap-2 text-sm !px-4 !py-2">
      <Wallet className="w-4 h-4" />
      Connect Wallet
    </button>
  );
}
