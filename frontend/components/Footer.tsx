import React from 'react';
import { Shield } from 'lucide-react';

export function Footer() {
  return (
    <footer className="mt-auto border-t border-gray-200/50 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <Shield className="w-4 h-4" />
            <span className="text-sm font-medium">BugBountyDeFi</span>
            <span className="text-xs">•</span>
            <span className="text-xs">Decentralized Security Platform</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-gray-400 dark:text-gray-500">
            <span>Powered by Ethereum</span>
            <span>•</span>
            <span>AES-256-GCM Encrypted</span>
            <span>•</span>
            <span>IPFS Backed</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
