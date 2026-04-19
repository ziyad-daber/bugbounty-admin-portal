'use client'
import React, { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useReadContract } from 'wagmi';
import { BUG_BOUNTY_PLATFORM_ABI, CONTRACT_ADDRESS } from '@/services/contracts';
import { SUPPORTED_TOKENS, getTokenByAddress } from '@/services/tokens';
import { uploadBountyMetadata } from '@/services/ipfs';
import { AdminGuard } from '@/components/AdminGuard';
import { Shield, Plus, CheckCircle, AlertCircle, ArrowLeft, Tag, Info, Coins, X } from 'lucide-react';
import Link from 'next/link';
import { ethers } from 'ethers';

const ERC20_ABI = [
  { "inputs": [{ "name": "spender", "type": "address" }, { "name": "amount", "type": "uint256" }], "name": "approve", "outputs": [{ "name": "", "type": "bool" }], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "name": "owner", "type": "address" }, { "name": "spender", "type": "address" }], "name": "allowance", "outputs": [{ "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }
] as const;

export default function CreateBountyPage() {
  return (
    <AdminGuard>
      <CreateBountyForm />
    </AdminGuard>
  );
}

function CreateBountyForm() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  // Basic Config
  const [selectedTokenAddr, setSelectedTokenAddr] = useState(SUPPORTED_TOKENS[0].address);
  const [rewardAmount, setRewardAmount] = useState('5000');
  const [initialFund, setInitialFund] = useState('5000');
  const [stakeAmount, setStakeAmount] = useState('50');
  const [appealBond, setAppealBond] = useState('100');

  // Metadata & Tags
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(['Smart Contract', 'Web3', 'High Severity']);
  const [description, setDescription] = useState('');

  // Dates & SLA
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
  const [committeeStr, setCommitteeStr] = useState('0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc, 0x90f79bf6eb2c4f870365e785982e1f101e93b906, 0x15d34aaf54267db7d7c367839aaf71a00a2c6a65, 0x9965507d1a55bcd269ec60bad4a3ac85b5c43d65');
  const [thresholdK, setThresholdK] = useState('2');
  const [disputeCommitDays, setDisputeCommitDays] = useState('3');
  const [disputeRevealDays, setDisputeRevealDays] = useState('6');

  const [status, setStatus] = useState('');
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [isApproving, setIsApproving] = useState(false);

  const selectedToken = getTokenByAddress(selectedTokenAddr)!;

  // Check Allowance
  const { data: allowance } = useReadContract({
    address: selectedTokenAddr,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address!, CONTRACT_ADDRESS as `0x${string}`],
    query: { enabled: !!address }
  });

  const { isSuccess: isConfirmed, isPending: isConfirming, isError: isConfirmError, error: confirmError } = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: 421614,
  });

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Uploading metadata to IPFS...');

    try {
      // 1. Upload Metadata
      const metadata = { tags, description };
      const cid = await uploadBountyMetadata(metadata);

      // 2. Prepare Args
      const committeeArray = committeeStr.split(',').map(s => s.trim()).filter(s => s.length > 0) as `0x${string}`[];
      const deadlineTimestamp = Math.floor(new Date(submissionDeadline).getTime() / 1000);
      const parseToken = (val: string) => BigInt(Math.floor(parseFloat(val) * Math.pow(10, selectedToken.decimals)));

      const fundAmount = parseToken(initialFund);

      // 3. Handle Approval if needed
      if (fundAmount > 0 && (!allowance || allowance < fundAmount)) {
        setStatus(`Approving ${selectedToken.symbol}...`);
        setIsApproving(true);
        const approveHash = await writeContractAsync({
          address: selectedTokenAddr,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [CONTRACT_ADDRESS as `0x${string}`, fundAmount],
          maxFeePerGas: BigInt(50000000000),
          maxPriorityFeePerGas: BigInt(1000000000),
        });
        setStatus('Waiting for approval confirmation...');
        setTxHash(approveHash);
        // We'll wait for this tx to confirm before proceeding to createBounty
        // For simplicity in this demo, let's assume the user will click submit again
        // In a real app, you'd chain these.
        setIsApproving(false);
        return;
      }

      const args = [
        selectedTokenAddr,
        parseToken(rewardAmount),
        parseToken(stakeAmount),
        parseToken(appealBond),
        BigInt(deadlineTimestamp),
        parseInt(reviewSlaDays) * 86400,
        parseInt(rateLimitWindowHours) * 3600,
        parseInt(stakeEscalationBps),
        parseInt(maxInWindow),
        parseInt(maxActiveSubmissions),
        committeeArray,
        parseInt(thresholdK),
        parseInt(disputeCommitDays) * 86400,
        parseInt(disputeRevealDays) * 86400,
        cid,
        fundAmount
      ];

      setStatus('Awaiting wallet signature for Bounty Creation...');
      const hash = await writeContractAsync({
        abi: BUG_BOUNTY_PLATFORM_ABI as any,
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: 'createBounty',
        args: args,
        maxFeePerGas: BigInt(50000000000),
        maxPriorityFeePerGas: BigInt(1000000000),
      });

      setTxHash(hash);
      setStatus('Bounty transaction submitted. Waiting for confirmation...');
    } catch (error: any) {
      console.error(error);
      setStatus(`Failed: ${error.shortMessage || error.message || 'Unknown error'}`);
    }
  };

  if (isConfirmed && !isApproving) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center animate-fade-in">
        <div className="w-24 h-24 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/20">
          <CheckCircle className="w-12 h-12" />
        </div>
        <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-4">Bounty Successfully Deployed!</h2>
        <p className="text-gray-500 mb-8 max-w-md mx-auto">
          Your bounty has been created and funded. It is now active and ready for researcher submissions.
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/admin" className="btn-primary py-3 px-8">Return to Dashboard</Link>
          <a href={`https://sepolia.arbiscan.io/tx/${txHash}`} target="_blank" rel="noreferrer" className="btn-secondary py-3 px-8">View on Arbiscan</a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-white transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
          <h1 className="text-4xl font-extrabold text-white flex items-center gap-4">
            <div className="p-2 rounded-2xl bg-brand-500/10 border border-brand-500/20">
              <Plus className="w-8 h-8 text-brand-500" />
            </div>
            Create New Bounty
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Basic Info & Token */}
        <div className="lg:col-span-2 space-y-8">
          <div className="glass-card p-8 space-y-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-2">
              <Coins className="w-5 h-5 text-brand-500" /> Token & Reward
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-400 mb-2">Payout Token</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {SUPPORTED_TOKENS.map(t => (
                    <button
                      key={t.address}
                      type="button"
                      onClick={() => setSelectedTokenAddr(t.address)}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${selectedTokenAddr === t.address
                          ? 'border-brand-500 bg-brand-500/10 text-white shadow-lg shadow-brand-500/10'
                          : 'border-slate-800 bg-slate-900/50 text-gray-500 hover:border-slate-700'
                        }`}
                    >
                      <img src={t.logoUrl} alt={t.symbol} className="w-6 h-6 rounded-full" />
                      <span className="font-bold">{t.symbol}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">Reward Amount</label>
                <div className="relative">
                  <input type="number" value={rewardAmount} onChange={e => setRewardAmount(e.target.value)} required className="input-field pr-16" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-500">{selectedToken.symbol}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2 flex items-center justify-between">
                  Initial Funding
                  <span className="text-[10px] uppercase text-brand-500 font-bold bg-brand-500/10 px-2 py-0.5 rounded">Deploy + Fund</span>
                </label>
                <div className="relative">
                  <input type="number" value={initialFund} onChange={e => setInitialFund(e.target.value)} required className="input-field pr-16" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-500">{selectedToken.symbol}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card p-8 space-y-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-2">
              <Tag className="w-5 h-5 text-brand-500" /> Metadata & Tags
            </h3>

            <div>
              <label className="block text-sm font-semibold text-gray-400 mb-2">Bounty Tags</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {tags.map(t => (
                  <span key={t} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-white text-sm font-medium border border-slate-700 animate-scale-in">
                    {t}
                    <button type="button" onClick={() => removeTag(t)} className="text-gray-500 hover:text-white"><X className="w-3.5 h-3.5" /></button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="Type tag and press Enter..."
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-400 mb-2">Description (Optional)</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={4}
                placeholder="Provide a high-level description of what researchers should focus on..."
                className="input-field resize-none"
              />
            </div>
          </div>

          <div className="glass-card p-8 space-y-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-brand-500" /> Governance & Thresholds
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-400 mb-2">Committee Members (Comma separated)</label>
                <textarea value={committeeStr} onChange={e => setCommitteeStr(e.target.value)} rows={3} className="input-field font-mono text-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">Threshold (K)</label>
                <input type="number" value={thresholdK} onChange={e => setThresholdK(e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">Appeal Bond</label>
                <input type="number" value={appealBond} onChange={e => setAppealBond(e.target.value)} className="input-field" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Parameters & Submit */}
        <div className="space-y-6">
          <div className="glass-card p-6 space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Info className="w-4 h-4 text-brand-500" /> Rules & Timeframes
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Deadline</label>
                <input type="date" value={submissionDeadline} onChange={e => setSubmissionDeadline(e.target.value)} className="input-field py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Review SLA (Days)</label>
                <input type="number" value={reviewSlaDays} onChange={e => setReviewSlaDays(e.target.value)} className="input-field py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Base Stake</label>
                <input type="number" value={stakeAmount} onChange={e => setStakeAmount(e.target.value)} className="input-field py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Max reports in {rateLimitWindowHours}h</label>
                <input type="number" value={maxInWindow} onChange={e => setMaxInWindow(e.target.value)} className="input-field py-2 text-sm" />
              </div>
            </div>
          </div>

          <div className="p-1 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600 shadow-xl shadow-brand-500/10">
            <button
              type="submit"
              className="w-full bg-slate-950 py-4 rounded-[14px] font-bold text-white hover:bg-slate-900 transition-colors flex flex-col items-center gap-1 group"
            >
              <span className="text-lg group-hover:scale-105 transition-transform">
                {isApproving ? 'Confirming Approval...' : isConfirming ? 'Deploying...' : 'Launch Bounty'}
              </span>
              <span className="text-[10px] text-gray-500 font-medium">EST GAS: ~0.002 ETH</span>
            </button>
          </div>

          {status && (
            <div className={`p-4 rounded-xl text-sm font-medium flex gap-3 border shadow-lg animate-slide-up ${status.includes('Failed')
                ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                : 'bg-brand-500/10 border-brand-500/20 text-brand-400'
              }`}>
              {status.includes('Failed') ? <AlertCircle className="w-5 h-5 flex-shrink-0" /> : <Info className="w-5 h-5 flex-shrink-0" />}
              <span>{status}</span>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
