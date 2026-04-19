'use client'
import React, { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi';
import { BUG_BOUNTY_PLATFORM_ABI, CONTRACT_ADDRESS } from '@/services/contracts';
import { getTokenByAddress, formatTokenAmount } from '@/services/tokens';
import { fetchBountyMetadata, BountyMetadata } from '@/services/ipfs';
import { 
  getBountyCount, getBountyCore, getReport, getReportCount, getDispute, isCommitteeMember,
  ReportStatus, DisputePhase
} from '@/services/chainReader';
import { 
  Users, CheckCircle, XCircle, Eye, EyeOff, Lock, Unlock, Clock, 
  AlertCircle, FileText, Shield, ChevronRight, Scale, Info, Loader2, Key
} from 'lucide-react';
import { ethers } from 'ethers';

interface ReportTask {
  bountyId: number;
  reportId: number;
  report: any;
  bountyCore: any;
  metadata: BountyMetadata | null;
  dispute?: any;
}

export default function CommitteePage() {
  const { address, isConnected } = useAccount();
  const [tasks, setTasks] = useState<ReportTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'disputes'>('pending');
  
  // Voting State
  const [selectedTask, setSelectedTask] = useState<ReportTask | null>(null);
  const [salt, setSalt] = useState('');
  const [status, setStatus] = useState('');
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);

  const { writeContractAsync } = useWriteContract();
  const { isSuccess, isPending } = useWaitForTransactionReceipt({ hash: txHash });

  // 1. Fetch Bounty Count
  const { data: bountyCount } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: BUG_BOUNTY_PLATFORM_ABI,
    functionName: 'bountyCount',
  });

  const bountyCountNum = Number(bountyCount || 0);

  // 2. Fetch Tasks where user is committee
  useEffect(() => {
    if (!address || bountyCountNum === 0) {
      if (bountyCountNum === 0) setIsLoading(false);
      return;
    }

    const loadTasks = async () => {
      setIsLoading(true);
      const allTasks: ReportTask[] = [];

      for (let bId = 0; bId < bountyCountNum; bId++) {
        const isMember = await isCommitteeMember(bId, address);
        if (!isMember) continue;

        const core = await getBountyCore(bId);
        const metadata = core?.metadataCidDigest && core.metadataCidDigest !== ethers.ZeroHash 
          ? await fetchBountyMetadata(core.metadataCidDigest) // This would need the actual CID, but since we store digest, we'll need a way to link it. 
          : null;
        
        // For the sake of the demo, if CID digest is stored, we might need the actual CID for IPFS.
        // If we store the full CID as a string it's easier, but we used bytes32 digest for gas efficiency.
        // In a real app, you'd store the CID in an event or a separate mapping, or use a predictable CID.
        // For now, we'll assume metadata is fetched or use fallback.

        const rCount = await getReportCount(bId);
        for (let rId = 0; rId < rCount; rId++) {
          const report = await getReport(bId, rId);
          if (!report) continue;

          if (report.status === ReportStatus.Submitted || report.status === ReportStatus.Disputed) {
            let dispute = null;
            if (report.status === ReportStatus.Disputed) {
              dispute = await getDispute(rId);
            }

            allTasks.push({
              bountyId: bId,
              reportId: rId,
              report,
              bountyCore: core,
              metadata,
              dispute
            });
          }
        }
      }
      setTasks(allTasks);
      setIsLoading(false);
    };

    loadTasks();
  }, [address, bountyCountNum]);

  // Actions
  const handleAction = async (fn: string, args: any[], label: string) => {
    try {
      setStatus(`${label}...`);
      const hash = await writeContractAsync({
        abi: BUG_BOUNTY_PLATFORM_ABI as any,
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: fn,
        args,
      });
      setTxHash(hash);
      setStatus('Transaction submitted. Waiting for confirmation...');
    } catch (e: any) {
      console.error(e);
      setStatus(`Error: ${e.shortMessage || e.message}`);
    }
  };

  const pendingTasks = tasks.filter(t => t.report.status === ReportStatus.Submitted);
  const disputedTasks = tasks.filter(t => t.report.status === ReportStatus.Disputed);

  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center animate-fade-in">
        <div className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-slate-700">
          <Key className="w-10 h-10 text-brand-500" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-4">Connect Your Wallet</h1>
        <p className="text-gray-500 max-w-md mx-auto mb-8">
          The Committee Panel is reserved for elected members. Connect your wallet to access your assigned bounty reports.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
      {/* Header */}
      <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-4">
            <Shield className="w-3.5 h-3.5" /> Committee Member Active
          </div>
          <h1 className="text-4xl font-extrabold text-white">Committee Workshop</h1>
          <p className="text-gray-500 mt-2">Manage vulnerability reports and adjudicate disputes.</p>
        </div>
        <div className="flex gap-4">
          <div className="glass-card px-6 py-4 flex items-center gap-4">
            <div className="text-right">
              <div className="text-2xl font-bold text-white">{tasks.length}</div>
              <div className="text-xs font-medium text-gray-500 uppercase">Total Tasks</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-brand-500" />
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-12 h-12 text-brand-500 animate-spin mb-4" />
          <p className="text-gray-500 font-medium italic">Synchronizing your committee duties...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Task Tabs */}
          <div className="lg:col-span-4 space-y-6">
            <div className="flex flex-col gap-2 p-1.5 rounded-2xl bg-slate-900/50 border border-slate-800">
              <button
                onClick={() => setActiveTab('pending')}
                className={`flex items-center justify-between p-4 rounded-xl transition-all ${
                  activeTab === 'pending' ? 'bg-slate-800 text-white shadow-lg' : 'text-gray-500 hover:text-gray-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5" />
                  <span className="font-bold text-sm">Initial Review</span>
                </div>
                {pendingTasks.length > 0 && (
                  <span className="bg-brand-500 text-white text-[10px] px-2 py-0.5 rounded-full">{pendingTasks.length}</span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('disputes')}
                className={`flex items-center justify-between p-4 rounded-xl transition-all ${
                  activeTab === 'disputes' ? 'bg-slate-800 text-white shadow-lg' : 'text-gray-500 hover:text-gray-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Scale className="w-5 h-5" />
                  <span className="font-bold text-sm">Active Disputes</span>
                </div>
                {disputedTasks.length > 0 && (
                  <span className="bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full">{disputedTasks.length}</span>
                )}
              </button>
            </div>

            {/* Task List */}
            <div className="space-y-3">
              {(activeTab === 'pending' ? pendingTasks : disputedTasks).length === 0 ? (
                <div className="text-center py-10 glass-card">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-emerald-500/20" />
                  <p className="text-sm text-gray-500">No tasks in this category</p>
                </div>
              ) : (
                (activeTab === 'pending' ? pendingTasks : disputedTasks).map(t => (
                  <button
                    key={`${t.bountyId}-${t.reportId}`}
                    onClick={() => { setSelectedTask(t); setStatus(''); }}
                    className={`w-full text-left p-4 rounded-2xl border transition-all ${
                      selectedTask?.reportId === t.reportId && selectedTask?.bountyId === t.bountyId
                        ? 'border-brand-500 bg-brand-500/5 shadow-lg shadow-brand-500/10'
                        : 'border-slate-800 bg-slate-900/30 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-mono text-brand-500">Bounty #{t.bountyId} / Report #{t.reportId}</span>
                      {t.report.status === ReportStatus.Disputed && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-tighter">
                          {t.dispute?.phase === DisputePhase.Commit ? 'Commit' : 'Reveal'}
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-bold text-white mb-1 truncate">
                      {t.metadata?.description || `Report from ${t.report.researcher.slice(0, 8)}...`}
                    </div>
                    <div className="text-[10px] text-gray-500 flex items-center gap-2">
                       <Users className="w-3 h-3" /> {t.report.acceptVotes + t.report.rejectVotes} votes cast
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right Column: Active Task Details */}
          <div className="lg:col-span-8">
            {selectedTask ? (
              <div className="glass-card p-8 space-y-8 animate-slide-up">
                {/* Task Header */}
                <div className="flex justify-between items-start border-b border-slate-800 pb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1">
                      {selectedTask.report.status === ReportStatus.Submitted ? 'Initial Report Review' : 'Dispute Adjudication'}
                    </h2>
                    <p className="text-sm text-gray-500 flex items-center gap-2">
                      Submitted on {new Date(Number(selectedTask.report.submittedAt) * 1000).toLocaleString()} by 
                      <span className="font-mono text-brand-400">{selectedTask.report.researcher.slice(0, 10)}...</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-gray-500 uppercase mb-1">Bounty Reward</div>
                    <div className="text-xl font-bold text-emerald-500">
                      {formatTokenAmount(selectedTask.bountyCore.rewardAmount)} USDC
                    </div>
                  </div>
                </div>

                {/* Report Content Placeholder */}
                <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-800 border-dashed">
                    <div className="flex items-center gap-3 mb-4 text-brand-500">
                        <Lock className="w-5 h-5" />
                        <span className="font-bold text-sm tracking-wide uppercase">Encrypted Content</span>
                    </div>
                    <p className="text-gray-400 text-sm leading-relaxed mb-6">
                        This report was encrypted client-side with AES-256-GCM. As a committee member, you have the authority to decrypt and review the evidence.
                    </p>
                    <button className="btn-secondary py-2 px-6 text-sm flex items-center gap-2">
                        <Eye className="w-4 h-4" /> Decrypt Evidence
                    </button>
                </div>

                {/* Voting Action Section */}
                <div className="space-y-6 pt-4">
                    {selectedTask.report.status === ReportStatus.Submitted ? (
                        <>
                            <div className="flex items-center gap-3 text-white">
                                <Shield className="w-5 h-5 text-emerald-500" />
                                <span className="font-bold">Cast Your Final Judgment</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <button 
                                    onClick={() => handleAction('voteReport', [BigInt(selectedTask.bountyId), BigInt(selectedTask.reportId), true], 'Accepting Report')}
                                    className="p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-500 transition-all flex flex-col items-center gap-3 group"
                                >
                                    <CheckCircle className="w-8 h-8 group-hover:scale-110 transition-transform" />
                                    <div className="text-center">
                                        <div className="font-bold">Accept Report</div>
                                        <div className="text-[10px] opacity-70">Payout will be triggered</div>
                                    </div>
                                </button>
                                <button 
                                    onClick={() => handleAction('voteReport', [BigInt(selectedTask.bountyId), BigInt(selectedTask.reportId), false], 'Rejecting Report')}
                                    className="p-6 rounded-2xl border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 text-rose-500 transition-all flex flex-col items-center gap-3 group"
                                >
                                    <XCircle className="w-8 h-8 group-hover:scale-110 transition-transform" />
                                    <div className="text-center">
                                        <div className="font-bold">Reject Report</div>
                                        <div className="text-[10px] opacity-70">Researcher stake will be slashed</div>
                                    </div>
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 text-white">
                                <Scale className="w-5 h-5 text-amber-500" />
                                <span className="font-bold">Dispute Phase: {selectedTask.dispute?.phase === DisputePhase.Commit ? 'Commit Phase' : 'Reveal Phase'}</span>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Secret Salt</label>
                                    <input 
                                        type="password" 
                                        value={salt}
                                        onChange={e => setSalt(e.target.value)}
                                        placeholder="Enter your secret salt for this vote..." 
                                        className="input-field" 
                                    />
                                    <p className="text-[10px] text-gray-600 mt-2 italic flex items-center gap-1">
                                        <Info className="w-3 h-3" /> 
                                        {selectedTask.dispute?.phase === DisputePhase.Commit 
                                          ? "Remember this salt! You'll need it to reveal your vote in the next phase." 
                                          : "Use the EXACT SAME salt you used in the commit phase."}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    {selectedTask.dispute?.phase === DisputePhase.Commit ? (
                                        <>
                                            <button 
                                                onClick={() => {
                                                    const encoded = ethers.solidityPacked(['bool', 'string'], [true, salt]);
                                                    const hash = ethers.keccak256(encoded);
                                                    handleAction('commitVote', [BigInt(selectedTask.bountyId), BigInt(selectedTask.reportId), hash as `0x${string}`], 'Committing Accept Vote');
                                                }}
                                                className="btn-primary py-3"
                                            >Commit Accept</button>
                                            <button 
                                                onClick={() => {
                                                    const encoded = ethers.solidityPacked(['bool', 'string'], [false, salt]);
                                                    const hash = ethers.keccak256(encoded);
                                                    handleAction('commitVote', [BigInt(selectedTask.bountyId), BigInt(selectedTask.reportId), hash as `0x${string}`], 'Committing Reject Vote');
                                                }}
                                                className="btn-danger py-3"
                                            >Commit Reject</button>
                                        </>
                                    ) : (
                                        <>
                                            <button 
                                                onClick={() => handleAction('revealVote', [BigInt(selectedTask.bountyId), BigInt(selectedTask.reportId), true, salt], 'Revealing Accept Vote')}
                                                className="btn-primary py-3"
                                            >Reveal Accept</button>
                                            <button 
                                                onClick={() => handleAction('revealVote', [BigInt(selectedTask.bountyId), BigInt(selectedTask.reportId), false, salt], 'Revealing Reject Vote')}
                                                className="btn-danger py-3"
                                            >Reveal Reject</button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Status Bar */}
                {status && (
                    <div className={`p-4 rounded-xl text-sm font-medium flex gap-3 border ${
                        status.includes('Error') ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-brand-500/10 border-brand-500/20 text-brand-400'
                    }`}>
                        {status.includes('Error') ? <AlertCircle className="w-5 h-5 flex-shrink-0" /> : <Info className="w-5 h-5 flex-shrink-0" />}
                        <span>{status}</span>
                    </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center glass-card p-12 text-center opacity-75 grayscale hover:grayscale-0 transition-all">
                <div className="w-24 h-24 mb-6 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                    <Shield className="w-12 h-12 text-slate-600" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Initialize Your Verdict</h3>
                <p className="text-gray-500 max-w-sm">
                  Select a report from the task queue to begin your technical evaluation and cast your judgment.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
