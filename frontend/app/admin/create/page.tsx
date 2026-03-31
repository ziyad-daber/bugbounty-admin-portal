'use client'
import React, { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { BUG_BOUNTY_PLATFORM_ABI, CONTRACT_ADDRESS } from '@/services/contracts';
import { AdminGuard } from '@/components/AdminGuard';
import { Shield, Plus, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CreateBountyPage() {
  return (
    <AdminGuard>
      <CreateBountyForm />
    </AdminGuard>
  );
}

function CreateBountyForm() {
  const { writeContractAsync } = useWriteContract();
  
  const [token, setToken] = useState('0x0000000000000000000000000000000000000000'); // Mock default
  const [rewardAmount, setRewardAmount] = useState('5000');
  const [stakeAmount, setStakeAmount] = useState('50');
  const [appealBond, setAppealBond] = useState('100');
  
  // Dates
  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + 14);
  const [submissionDeadline, setSubmissionDeadline] = useState(defaultDate.toISOString().split('T')[0]);
  const [reviewSlaDays, setReviewSlaDays] = useState('3');
  
  // Rate limits
  const [rateLimitWindowHours, setRateLimitWindowHours] = useState('48');
  const [stakeEscalationBps, setStakeEscalationBps] = useState('1000');
  const [maxInWindow, setMaxInWindow] = useState('2');
  const [maxActiveSubmissions, setMaxActiveSubmissions] = useState('1');
  
  // Committee
  const [committeeStr, setCommitteeStr] = useState('0x1111111111111111111111111111111111111111,0x2222222222222222222222222222222222222222');
  const [thresholdK, setThresholdK] = useState('2');
  const [disputeCommitDays, setDisputeCommitDays] = useState('3');
  const [disputeRevealDays, setDisputeRevealDays] = useState('6');

  const [status, setStatus] = useState('');
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);

  const { isSuccess: isConfirmed, isPending: isConfirming } = useWaitForTransactionReceipt({ hash: txHash });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Preparing transaction...');
    
    try {
      const committeeArray = committeeStr.split(',').map(s => s.trim()).filter(s => s.length > 0);
      
      const deadlineTimestamp = Math.floor(new Date(submissionDeadline).getTime() / 1000);
      const reviewSlaSeconds = parseInt(reviewSlaDays) * 86400;
      const rateLimitSeconds = parseInt(rateLimitWindowHours) * 3600;
      const commitSeconds = parseInt(disputeCommitDays) * 86400;
      const revealSeconds = parseInt(disputeRevealDays) * 86400;
      
      // Convert USDC amounts (6 decimals)
      const parseUSDC = (val: string) => BigInt(Math.floor(parseFloat(val) * 1_000_000));

      const args = [
        token as `0x${string}`,
        parseUSDC(rewardAmount),
        parseUSDC(stakeAmount),
        parseUSDC(appealBond),
        BigInt(deadlineTimestamp),
        reviewSlaSeconds,
        rateLimitSeconds,
        parseInt(stakeEscalationBps),
        parseInt(maxInWindow),
        parseInt(maxActiveSubmissions),
        committeeArray as `0x${string}`[],
        parseInt(thresholdK),
        commitSeconds,
        revealSeconds
      ];

      setStatus('Awaiting wallet signature...');
      const hash = await writeContractAsync({
        abi: BUG_BOUNTY_PLATFORM_ABI as any,
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: 'createBounty',
        args: args,
      });

      setTxHash(hash);
      setStatus('Transaction submitted. Waiting for confirmation...');
    } catch (error: any) {
      console.error(error);
      setStatus(`Failed: ${error.shortMessage || error.message || 'Unknown error'}`);
    }
  };

  if (isConfirmed) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center animate-fade-in">
        <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-4">Bounty Created!</h2>
        <p className="text-gray-500 mb-8 max-w-md mx-auto">
          Your bounty has been successfully deployed to the blockchain.
        </p>
        <div className="flex justify-center">
          <Link href="/admin" className="btn-primary rounded-xl py-3 px-8 shadow-brand-500/25 shadow-lg">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
      <div className="mb-8">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
          <Plus className="w-8 h-8 text-brand-500" />
          Create New Bounty
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Configure the rules, rewards, and governance for your new bug bounty program.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="glass-card p-6 sm:p-8 space-y-8">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-slate-800 pb-2 mb-4">Reward & Token Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">ERC20 Token Address (e.g., USDC)</label>
              <input type="text" value={token} onChange={e => setToken(e.target.value)} required className="input-field font-mono" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Reward Amount (Tokens)</label>
              <input type="number" step="0.01" value={rewardAmount} onChange={e => setRewardAmount(e.target.value)} required className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Appeal Bond (Tokens)</label>
              <input type="number" step="0.01" value={appealBond} onChange={e => setAppealBond(e.target.value)} required className="input-field" />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-slate-800 pb-2 mb-4">Timeframes & Rate Limits</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div>
               <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Submission Deadline</label>
               <input type="date" value={submissionDeadline} onChange={e => setSubmissionDeadline(e.target.value)} required className="input-field" />
            </div>
            <div>
               <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Review SLA (Days)</label>
               <input type="number" value={reviewSlaDays} onChange={e => setReviewSlaDays(e.target.value)} required min="1" className="input-field" />
            </div>
            <div>
               <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Rate Limit Window (Hours)</label>
               <input type="number" value={rateLimitWindowHours} onChange={e => setRateLimitWindowHours(e.target.value)} required min="1" className="input-field" />
            </div>
            <div>
               <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Max In Window</label>
               <input type="number" value={maxInWindow} onChange={e => setMaxInWindow(e.target.value)} required min="1" className="input-field" />
            </div>
            <div>
               <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Max Active Submissions</label>
               <input type="number" value={maxActiveSubmissions} onChange={e => setMaxActiveSubmissions(e.target.value)} required min="1" className="input-field" />
            </div>
          </div>
        </div>

        <div>
           <h3 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-slate-800 pb-2 mb-4">Staking & Governance</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
             <div>
               <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Base Stake Amount (Tokens)</label>
               <input type="number" step="0.01" value={stakeAmount} onChange={e => setStakeAmount(e.target.value)} required className="input-field" />
             </div>
             <div>
               <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Stake Escalation BPS</label>
               <input type="number" value={stakeEscalationBps} onChange={e => setStakeEscalationBps(e.target.value)} required className="input-field" />
               <p className="text-xs text-gray-500 mt-1">1000 = 10% penalty per point</p>
             </div>
           </div>
           <div className="grid grid-cols-1 gap-5 mb-5">
             <div>
               <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Committee Member Addresses</label>
               <textarea value={committeeStr} onChange={e => setCommitteeStr(e.target.value)} required rows={3} placeholder="0x123..., 0xabc..." className="input-field font-mono text-sm resize-none" />
               <p className="text-xs text-gray-500 mt-1">Comma separated list of elected committee member addresses.</p>
             </div>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
             <div>
               <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Voting Threshold (K)</label>
               <input type="number" value={thresholdK} onChange={e => setThresholdK(e.target.value)} required min="1" className="input-field" />
             </div>
             <div>
               <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Dispute Commit (Days)</label>
               <input type="number" value={disputeCommitDays} onChange={e => setDisputeCommitDays(e.target.value)} required min="1" className="input-field" />
             </div>
             <div>
               <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Dispute Reveal (Days)</label>
               <input type="number" value={disputeRevealDays} onChange={e => setDisputeRevealDays(e.target.value)} required min="1" className="input-field" />
             </div>
           </div>
        </div>

        <button type="submit" disabled={!!txHash && !status.includes('Failed')} className="btn-primary w-full text-lg mt-6">
          {isConfirming ? 'Confirming Transaction...' : 'Deploy Bounty Parameters'}
        </button>

        {status && (
          <div className={`p-4 rounded-xl text-sm font-medium flex items-center gap-3 ${status.includes('Failed') ? 'bg-red-50 text-red-700' : 'bg-brand-50 text-brand-700'}`}>
            {status.includes('Failed') ? <AlertCircle className="w-5 h-5 flex-shrink-0" /> : <Shield className="w-5 h-5 flex-shrink-0" />}
            {status}
          </div>
        )}
      </form>
    </div>
  );
}
