'use client'
import React, { useState } from 'react';
import { useAccount, useWriteContract } from 'wagmi';
import { BUG_BOUNTY_PLATFORM_ABI, CONTRACT_ADDRESS } from '@/services/contracts';
import { ethers } from 'ethers';
import { Users, CheckCircle, XCircle, Eye, EyeOff, Lock, Unlock } from 'lucide-react';

export default function CommitteePage() {
  const { isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [bountyId, setBountyId] = useState('0');
  const [reportId, setReportId] = useState('0');
  const [salt, setSalt] = useState('');
  const [status, setStatus] = useState('');
  const [activeTab, setActiveTab] = useState<'review' | 'commit' | 'reveal'>('review');

  const exec = async (fn: string, args: any[], label: string) => {
    try {
      setStatus(`${label}...`);
      await writeContractAsync({ abi: BUG_BOUNTY_PLATFORM_ABI as any, address: CONTRACT_ADDRESS as `0x${string}`, functionName: fn, args });
      setStatus(`${label} — Success!`);
    } catch (e: any) { setStatus(`Error: ${e.message}`); }
  };

  const handleVote = (accepted: boolean) => exec('voteReport', [BigInt(bountyId), BigInt(reportId), accepted], accepted ? 'Accepting report' : 'Rejecting report');

  const handleCommit = (accepted: boolean) => {
    if (!salt) return alert('Please enter a secret salt');
    const encoded = ethers.solidityPacked(['bool', 'string'], [accepted, salt]);
    const commitHash = ethers.keccak256(encoded);
    exec('commitVote', [BigInt(bountyId), BigInt(reportId), commitHash as `0x${string}`], 'Committing vote');
  };

  const handleReveal = (accepted: boolean) => {
    if (!salt) return alert('Please enter the same salt used during commit');
    exec('revealVote', [BigInt(bountyId), BigInt(reportId), accepted, salt], 'Revealing vote');
  };

  const tabs = [
    { key: 'review' as const, label: 'Initial Review', icon: Users },
    { key: 'commit' as const, label: 'Commit Vote', icon: Lock },
    { key: 'reveal' as const, label: 'Reveal Vote', icon: Unlock },
  ];

  return (
    <div className="animate-fade-in max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="text-center mb-8">
        <div className="inline-flex p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 mb-4">
          <Users className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Committee Panel</h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">Review, commit, and reveal votes on vulnerability reports.</p>
      </div>

      {/* Inputs */}
      <div className="glass-card p-6 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Bounty ID</label>
            <input type="number" value={bountyId} onChange={e => setBountyId(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Report ID</label>
            <input type="number" value={reportId} onChange={e => setReportId(e.target.value)} className="input-field" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-gray-100 dark:bg-slate-800 mb-6">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === tab.key ? 'bg-white dark:bg-slate-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>
            <tab.icon className="w-4 h-4" />{tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="glass-card p-6 animate-fade-in">
        {activeTab === 'review' && (
          <div className="space-y-4">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2"><Eye className="w-5 h-5" /> Phase 1: Initial Review</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Cast your vote directly. This is used before any dispute is opened.</p>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button onClick={() => handleVote(true)} className="btn-success flex items-center justify-center gap-2"><CheckCircle className="w-4 h-4" /> Accept</button>
              <button onClick={() => handleVote(false)} className="btn-danger flex items-center justify-center gap-2"><XCircle className="w-4 h-4" /> Reject</button>
            </div>
          </div>
        )}

        {activeTab === 'commit' && (
          <div className="space-y-4">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2"><EyeOff className="w-5 h-5" /> Phase 2a: Commit (Blind Vote)</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">During disputes, commit a hashed vote. Your actual vote remains hidden until the reveal phase.</p>
            <input type="text" placeholder="Enter a secret salt (remember it for reveal!)" value={salt} onChange={e => setSalt(e.target.value)} className="input-field" />
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button onClick={() => handleCommit(true)} className="btn-success flex items-center justify-center gap-2"><Lock className="w-4 h-4" /> Commit Accept</button>
              <button onClick={() => handleCommit(false)} className="btn-danger flex items-center justify-center gap-2"><Lock className="w-4 h-4" /> Commit Reject</button>
            </div>
          </div>
        )}

        {activeTab === 'reveal' && (
          <div className="space-y-4">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2"><Eye className="w-5 h-5" /> Phase 2b: Reveal Vote</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Reveal your committed vote using the same salt. Failure to reveal will result in a reputation penalty.</p>
            <input type="text" placeholder="Enter the same salt from the commit phase" value={salt} onChange={e => setSalt(e.target.value)} className="input-field" />
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button onClick={() => handleReveal(true)} className="btn-success flex items-center justify-center gap-2"><Unlock className="w-4 h-4" /> Reveal Accept</button>
              <button onClick={() => handleReveal(false)} className="btn-danger flex items-center justify-center gap-2"><Unlock className="w-4 h-4" /> Reveal Reject</button>
            </div>
          </div>
        )}
      </div>

      {/* Status */}
      {status && (
        <div className={`mt-6 p-4 rounded-xl text-sm font-medium ${status.includes('Success') ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : status.includes('Error') ? 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300' : 'bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300'}`}>
          {status}
        </div>
      )}
    </div>
  );
}
