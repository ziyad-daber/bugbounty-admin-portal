'use client'
import React, { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useReadContract, useReadContracts, useWaitForTransactionReceipt } from 'wagmi';
import { BUG_BOUNTY_PLATFORM_ABI, CONTRACT_ADDRESS } from '@/services/contracts';
import { getTokenByAddress, formatTokenAmount } from '@/services/tokens';
import { prepareSubmission } from '@/services/ipfs';
import { 
  Send, Shield, AlertCircle, CheckCircle, Info, Lock, 
  Terminal, ArrowRight, Zap, Target, Coins, Fingerprint, Loader2
} from 'lucide-react';
import Link from 'next/link';

const ERC20_ABI = [
  {"inputs":[{"name":"spender","type":"address"},{"name":"amount","type":"uint256"}],"name":"approve","outputs":[{"name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"name":"owner","type":"address"},{"name":"spender","type":"address"}],"name":"allowance","outputs":[{"name":"","type":"uint256"}],"stateMutability":"view","type":"function"}
] as const;

export default function SubmitReportPage() {
  const { address, isConnected, chainId } = useAccount();
  const [bountyId, setBountyId] = useState<number>(0);
  
  // Form State
  const [steps, setSteps] = useState('');
  const [impact, setImpact] = useState('');
  const [poc, setPoc] = useState('');
  const [severity, setSeverity] = useState<'critical' | 'high' | 'medium' | 'low'>('medium');

  // Logic State
  const [status, setStatus] = useState('');
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [isApproving, setIsApproving] = useState(false);

  const { writeContractAsync } = useWriteContract();
  const { isSuccess: isConfirmed, isPending: isConfirming } = useWaitForTransactionReceipt({ hash: txHash });

  // 0. Fetch total bounties for the Target Selection dropdown
  const { data: bountyCount } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: BUG_BOUNTY_PLATFORM_ABI,
    functionName: 'bountyCount',
  });
  const bountyCountNum = Number(bountyCount || 0);

  // 1. Fetch Bounty Core
  const { data: bountyCore, isLoading: isLoadingBounty } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: BUG_BOUNTY_PLATFORM_ABI,
    functionName: 'getBountyCore',
    args: [BigInt(bountyId)],
  });

  // 2. Fetch Required Stake
  const { data: requiredStake } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: BUG_BOUNTY_PLATFORM_ABI,
    functionName: 'getRequiredStake',
    args: [BigInt(bountyId), address!],
    query: { enabled: !!address }
  });

  // 3. Fetch Token Info
  const tokenAddr = bountyCore ? (bountyCore as any)[1] : null;
  const token = tokenAddr ? getTokenByAddress(tokenAddr) : null;

  // 4. Check Allowance
  const { data: allowance } = useReadContract({
    address: tokenAddr as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address!, CONTRACT_ADDRESS as `0x${string}`],
    query: { enabled: !!address && !!tokenAddr }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !chainId) return setStatus('Connect your wallet first');

    setStatus('Encrypting report client-side...');
    try {
      // 1. Prepare and Encrypt
      const { submission, qualityScore } = await prepareSubmission(
        { steps, impact, poc, metadata: { severity, tags: ['Web3'] } },
        bountyId,
        chainId
      );

      // 2. Handle Approval if needed
      const stake = requiredStake ? BigInt(requiredStake.toString()) : BigInt(0);
      if (stake > 0 && (!allowance || BigInt(allowance.toString()) < stake)) {
        setStatus(`Approving ${token?.symbol || 'Tokens'} for Stake...`);
        setIsApproving(true);
        const approveHash = await writeContractAsync({
          address: tokenAddr as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [CONTRACT_ADDRESS as `0x${string}`, stake],
        });
        setStatus('Waiting for approval confirmation...');
        setTxHash(approveHash);
        setIsApproving(false);
        return;
      }

      // 3. Submit Report
      setStatus('Awaiting wallet signature for Submission...');
      const hash = await writeContractAsync({
        abi: BUG_BOUNTY_PLATFORM_ABI as any,
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: 'submitReport',
        args: [
          BigInt(bountyId),
          submission.salt as `0x${string}`,
          submission.cidDigest as `0x${string}`,
          submission.hSteps as `0x${string}`,
          submission.hImpact as `0x${string}`,
          submission.hPoc as `0x${string}`,
        ],
      });

      setTxHash(hash);
      setStatus('Submission transaction submitted. Waiting for confirmation...');
    } catch (error: any) {
      console.error(error);
      setStatus(`Failed: ${error.shortMessage || error.message || 'Unknown error'}`);
    }
  };

  if (isConfirmed && !isApproving) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center animate-fade-in">
        <div className="w-24 h-24 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-emerald-500/20">
          <Send className="w-10 h-10" />
        </div>
        <h2 className="text-4xl font-extrabold text-white mb-4">Transmission Successful</h2>
        <p className="text-gray-500 mb-8 max-w-md mx-auto">
          Your report has been encrypted and committed to the blockchain. The committee will review your findings within the bounty's SLA window.
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/" className="btn-primary py-3 px-8">Back to Explorer</Link>
          <a href={`https://sepolia.arbiscan.io/tx/${txHash}`} target="_blank" rel="noreferrer" className="btn-secondary py-3 px-8">Audit Transaction</a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in">
      <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
           <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-bold uppercase tracking-widest mb-4">
              <Zap className="w-4 h-4" /> Secure Submission Interface
           </div>
           <h1 className="text-4xl sm:text-5xl font-extrabold text-white">Submit Findings</h1>
           <p className="text-gray-500 mt-2 max-w-xl">
             Your report will be encrypted in your browser using AES-256-GCM. 
             Metadata hashes and your stake ensure the integrity of your discovery.
           </p>
        </div>
        
        <div className="glass-card px-6 py-4 flex items-center gap-4 min-w-[300px]">
           <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center">
              <Target className="w-6 h-6 text-brand-500" />
           </div>
           <div>
              <div className="text-xs font-bold text-gray-600 uppercase">Target Selection</div>
              <select 
                value={bountyId} 
                onChange={(e) => setBountyId(parseInt(e.target.value))}
                className="bg-transparent text-white font-bold text-lg outline-none cursor-pointer w-full appearance-none"
              >
                {bountyCountNum === 0 ? (
                  <option value={0} className="bg-slate-950">No instances found</option>
                ) : (
                  Array.from({ length: bountyCountNum }).map((_, i) => (
                    <option key={i} value={i} className="bg-slate-950">Program Instance #{i}</option>
                  ))
                )}
              </select>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Column */}
        <form onSubmit={handleSubmit} className="lg:col-span-8 space-y-8">
           <div className="glass-card p-8 space-y-6">
              <div className="flex items-center gap-3 text-white mb-2">
                 <Terminal className="w-6 h-6 text-brand-500" />
                 <h3 className="text-xl font-bold">Vulnerability Details</h3>
              </div>

              <div className="space-y-4">
                 <div>
                    <label className="block text-sm font-semibold text-gray-400 mb-2">Technical Description & Steps to Reproduce</label>
                    <textarea 
                        value={steps}
                        onChange={e => setSteps(e.target.value)}
                        required
                        className="input-field min-h-[200px] font-mono text-sm" 
                        placeholder="1. Navigate to...\n2. Provide input...\n3. Observe..."
                    />
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-400 mb-2">Impact Analysis</label>
                        <textarea 
                            value={impact}
                            onChange={e => setImpact(e.target.value)}
                            required
                            className="input-field min-h-[150px] text-sm" 
                            placeholder="An attacker can spend tokens they don't own because..." 
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-400 mb-2">Proof of Concept (PoC)</label>
                        <textarea 
                            value={poc}
                            onChange={e => setPoc(e.target.value)}
                            required
                            className="input-field min-h-[150px] font-mono text-xs" 
                            placeholder="// Foundry test or exploit script\nfunction testExplit() {\n  ..." 
                        />
                    </div>
                 </div>
              </div>
           </div>

           <div className="glass-card p-8">
              <div className="flex flex-col sm:flex-row gap-6">
                 <div className="flex-1">
                    <label className="block text-sm font-semibold text-gray-400 mb-3">Self-Assessed Severity</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                       {(['low', 'medium', 'high', 'critical'] as const).map(s => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setSeverity(s)}
                            className={`py-2 px-3 rounded-lg border text-xs font-bold uppercase transition-all ${
                              severity === s 
                                ? 'bg-brand-500/10 border-brand-500 text-brand-500 shadow-lg shadow-brand-500/5' 
                                : 'bg-slate-900 border-slate-800 text-gray-600 hover:border-slate-700'
                            }`}
                          >
                             {s}
                          </button>
                       ))}
                    </div>
                 </div>
                 <div className="shrink-0 flex items-center">
                    <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-amber-500/70 text-xs max-w-[200px] italic">
                         Ensuring accurate self-assessment improves your potential reputation multiplier.
                    </div>
                 </div>
              </div>
           </div>

           <div className="p-1 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600">
              <button 
                type="submit" 
                disabled={!isConnected || isConfirming}
                className="w-full bg-slate-950 py-5 rounded-[14px] font-extrabold text-xl text-white hover:bg-slate-900 transition-colors flex flex-col items-center gap-1 group disabled:opacity-50"
              >
                 <span className="flex items-center gap-3">
                    {isConfirming ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <Lock className="w-5 h-5 text-brand-500 group-hover:scale-110 transition-transform" />
                    )}
                    {isApproving ? 'Confirming Stake Approval...' : isConfirming ? 'Transmitting Hash...' : 'Encrypt & Submit Report'}
                 </span>
                 {!isConnected && <span className="text-[10px] text-rose-500 uppercase">Wallet Connection Required</span>}
              </button>
           </div>
        </form>

        {/* Sidebar Column */}
        <div className="lg:col-span-4 space-y-6">
           {/* Staking Insights */}
           <div className="glass-card p-6 space-y-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                 <Coins className="w-4 h-4 text-brand-500" /> Researcher Stake
              </h3>
              
              <div className="space-y-4">
                 <div className="flex justify-between items-end border-b border-slate-800 pb-4">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-tighter">Required Stake</div>
                    <div className="text-2xl font-black text-white">
                       {requiredStake ? formatTokenAmount(requiredStake.toString(), token?.decimals) : '0.00'} 
                       <span className="text-xs text-gray-600 ml-1 font-bold">{token?.symbol || 'USDC'}</span>
                    </div>
                 </div>
                 
                 <div className="space-y-3">
                    <div className="flex justify-between text-xs">
                       <span className="text-gray-500 font-medium">Bounty Potential</span>
                       <span className="text-emerald-500 font-bold">
                          {bountyCore ? formatTokenAmount((bountyCore as any)[2], token?.decimals) : '0'} {token?.symbol}
                       </span>
                    </div>
                    <div className="flex justify-between text-xs">
                       <span className="text-gray-500 font-medium">Approval Status</span>
                       {allowance && requiredStake && BigInt(allowance.toString()) >= BigInt(requiredStake.toString()) ? (
                          <span className="text-emerald-500 font-bold flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Ready</span>
                       ) : (
                          <span className="text-amber-500 font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Approval Needed</span>
                       )}
                    </div>
                 </div>
              </div>
           </div>

           {/* Encryption Info */}
           <div className="glass-card p-6 border-brand-500/10">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                 <Fingerprint className="w-4 h-4 text-brand-500" /> Evidence Privacy
              </h3>
              <div className="space-y-4">
                 <div className="relative p-4 rounded-xl bg-slate-900 overflow-hidden group">
                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Lock className="w-12 h-12" />
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed relative z-10">
                       We use <span className="text-white font-bold">Client-Side Encryption</span>. Your vulnerability evidence never touches our servers in plain text. Only the elected committee members can decrypt it using their private keys.
                    </p>
                 </div>
                 <div className="flex items-center gap-3 px-1">
                    <div className="shrink-0 w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                        <Shield className="w-4 h-4 text-emerald-500" />
                    </div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-none">Tamper-Proof Metadata Hashes</span>
                 </div>
              </div>
           </div>

           {status && (
              <div className={`p-4 rounded-xl text-sm font-medium border shadow-2xl animate-slide-up ${
                 status.includes('Failed') ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-brand-500/10 border-brand-500/20 text-brand-400'
              }`}>
                 {status}
              </div>
           )}
        </div>
      </div>
    </div>
  );
}
