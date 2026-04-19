'use client'
import React, { useState } from 'react';
import { useAccount, useWriteContract } from 'wagmi';
import { BUG_BOUNTY_PLATFORM_ABI, CONTRACT_ADDRESS } from '@/services/contracts';
import { Scale, AlertTriangle, Clock, Gavel, ShieldCheck, Coins, FileWarning } from 'lucide-react';

const mockDisputes = [
  { id: 38, bountyId: 7, status: 'Open', researcher: '0xAb3...f12', bond: '100 USDC', opened: '1 hr ago' },
  { id: 35, bountyId: 5, status: 'Resolved', researcher: '0x1d9...a8c', bond: '100 USDC', opened: '2 days ago' },
  { id: 29, bountyId: 3, status: 'Escalated', researcher: '0x8eF...3b1', bond: '100 USDC', opened: '5 days ago' },
];

const statusStyles: Record<string, string> = {
  Open: 'badge-warning',
  Resolved: 'badge-success',
  Escalated: 'badge-danger',
};

export default function DisputePage() {
  const { isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [bountyId, setBountyId] = useState('0');
  const [reportId, setReportId] = useState('0');
  const [status, setStatus] = useState('');

  const exec = async (fn: string, label: string) => {
    try {
      setStatus(`${label}...`);
      await writeContractAsync({
        abi: BUG_BOUNTY_PLATFORM_ABI as any,
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: fn,
        args: [BigInt(bountyId), BigInt(reportId)],
        maxFeePerGas: BigInt(50000000000),
        maxPriorityFeePerGas: BigInt(1000000000),
      });
      setStatus(`${label} — Success!`);
    } catch (e: any) { setStatus(`Error: ${e.message}`); }
  };

  return (
    <div className="animate-fade-in max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex p-3 rounded-2xl bg-amber-50 dark:bg-amber-500/10 mb-4">
          <Scale className="w-8 h-8 text-amber-600 dark:text-amber-400" />
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Dispute Management</h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">Raise appeals, escalate SLA breaches, and resolve disputes.</p>
      </div>

      {/* Dispute History */}
      <div className="glass-card p-6 mb-6">
        <h3 className="section-title mb-4 flex items-center gap-2"><FileWarning className="w-5 h-5" /> Recent Disputes</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-slate-700">
                <th className="pb-3 font-medium">Report</th>
                <th className="pb-3 font-medium">Bounty</th>
                <th className="pb-3 font-medium">Researcher</th>
                <th className="pb-3 font-medium">Bond</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Opened</th>
              </tr>
            </thead>
            <tbody>
              {mockDisputes.map(d => (
                <tr key={d.id} className="border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-3 font-mono font-medium text-gray-900 dark:text-white">#{d.id}</td>
                  <td className="py-3 text-gray-600 dark:text-gray-400">#{d.bountyId}</td>
                  <td className="py-3 font-mono text-xs text-gray-500">{d.researcher}</td>
                  <td className="py-3 text-gray-600 dark:text-gray-400">{d.bond}</td>
                  <td className="py-3"><span className={statusStyles[d.status]}>{d.status}</span></td>
                  <td className="py-3 text-gray-400 text-xs">{d.opened}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Escrow Status */}
      <div className="glass-card p-6 mb-6">
        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4"><Coins className="w-5 h-5" /> Escrow Status</h3>
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
          <span>Locked Funds</span>
          <span className="font-mono font-semibold text-gray-900 dark:text-white">47,500 / 50,000 USDC</span>
        </div>
        <div className="h-3 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-1000" style={{ width: '95%' }} />
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">95% of total escrow capacity utilized across all active bounties.</p>
      </div>

      {/* Action Panel */}
      <div className="glass-card p-6">
        <h3 className="section-title mb-4">Take Action</h3>
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Bounty ID</label>
            <input type="number" value={bountyId} onChange={e => setBountyId(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Report ID</label>
            <input type="number" value={reportId} onChange={e => setReportId(e.target.value)} className="input-field" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button onClick={() => exec('raiseDispute', 'Raising dispute')} className="btn-warning flex items-center justify-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Raise Dispute
          </button>
          <button onClick={() => exec('triggerEscalation', 'Escalating')} className="btn-danger flex items-center justify-center gap-2">
            <Clock className="w-4 h-4" /> Force Escalate
          </button>
          <button onClick={() => exec('resolveDispute', 'Resolving dispute')} className="btn-primary flex items-center justify-center gap-2">
            <Gavel className="w-4 h-4" /> Resolve
          </button>
        </div>

        {status && (
          <div className={`mt-5 p-4 rounded-xl text-sm font-medium ${status.includes('Success') ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : status.includes('Error') ? 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300' : 'bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300'}`}>
            {status}
          </div>
        )}
      </div>
    </div>
  );
}
