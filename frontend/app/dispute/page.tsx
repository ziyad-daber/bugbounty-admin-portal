'use client'
import React, { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useReadContract, useReadContracts } from 'wagmi';
import { BUG_BOUNTY_PLATFORM_ABI, DISPUTE_MODULE_ABI, CONTRACT_ADDRESS } from '@/services/contracts';
import { Scale, AlertTriangle, Clock, Gavel, Coins, FileWarning, CheckCircle, XCircle, Timer, Shield } from 'lucide-react';

enum ReportStatus {
  Submitted = 0,
  Accepted = 1,
  Rejected = 2,
  Disputed = 3,
  Finalized = 4,
}

enum DisputePhase {
  None = 0,
  Commit = 1,
  Reveal = 2,
  Resolved = 3,
}

interface DisputeEntry {
  bountyId: number;
  reportId: number;
  researcher: string;
  status: ReportStatus;
  bond: bigint;
  openedAt: number;
  phase: DisputePhase;
  commitDeadline: number;
  revealDeadline: number;
  acceptVotes: number;
  rejectVotes: number;
  autoEscalated: boolean;
}

export default function DisputePage() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [selectedBountyId, setSelectedBountyId] = useState('');
  const [selectedReportId, setSelectedReportId] = useState('');
  const [status, setStatus] = useState('');
  const [selectedDispute, setSelectedDispute] = useState<DisputeEntry | null>(null);

  // Fetch bounty count
  const { data: bountyCount } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: BUG_BOUNTY_PLATFORM_ABI,
    functionName: 'bountyCount',
  });

  const bountyCountNum = Number(bountyCount || 0);

  // Fetch report count for selected bounty
  const { data: selectedReportCount } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: BUG_BOUNTY_PLATFORM_ABI,
    functionName: 'reportCount',
    args: [BigInt(selectedBountyId || 0)],
    query: { enabled: selectedBountyId !== '' }
  });
  
  const reportCountNum = Number(selectedReportCount || 0);

  // Fetch dispute module address
  const { data: disputeModule } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: BUG_BOUNTY_PLATFORM_ABI,
    functionName: 'disputeModule',
  });

  // Fetch all disputes by scanning reports
  const [disputes, setDisputes] = useState<DisputeEntry[]>([]);
  const [isLoadingDisputes, setIsLoadingDisputes] = useState(true);

  useEffect(() => {
    if (bountyCountNum === 0) {
      setIsLoadingDisputes(false);
      return;
    }

    const fetchDisputes = async () => {
      const foundDisputes: DisputeEntry[] = [];

      for (let bountyId = 0; bountyId < bountyCountNum; bountyId++) {
        // Get report count for this bounty
        const reportCountRes = await window.ethereum?.request({
          method: 'eth_call',
          params: [{
            to: CONTRACT_ADDRESS,
            data: `0x${'48316000'.padStart(64, '0')}${BigInt(bountyId).toString(16).padStart(64, '0')}`
          }]
        }).catch(() => null);

        // For simplicity, fetch reports up to a reasonable limit
        for (let reportId = 0; reportId < 50; reportId++) {
          try {
            const reportRes = await fetchReport(bountyId, reportId);
            if (!reportRes) continue;

            const status = Number(reportRes[3] as bigint);
            if (status === ReportStatus.Disputed) {
              // Fetch dispute details
              const disputeRes = await fetchDispute(reportId);
              if (disputeRes) {
                foundDisputes.push({
                  bountyId,
                  reportId,
                  researcher: reportRes[0] as string,
                  status,
                  bond: 0n, // Would need to track separately
                  openedAt: Number(reportRes[1] as bigint),
                  phase: Number(disputeRes[0] as bigint) as DisputePhase,
                  commitDeadline: Number(disputeRes[1] as bigint),
                  revealDeadline: Number(disputeRes[2] as bigint),
                  acceptVotes: Number(disputeRes[3] as bigint),
                  rejectVotes: Number(disputeRes[4] as bigint),
                  autoEscalated: false,
                });
              }
            }
          } catch (e) {
            // Continue on error
          }
        }
      }

      setDisputes(foundDisputes);
      setIsLoadingDisputes(false);
    };

    fetchDisputes();
  }, [bountyCountNum]);

  // Calculate escrow stats
  const escrowCalls = Array.from({ length: bountyCountNum }).map((_, i) => ({
    address: CONTRACT_ADDRESS,
    abi: BUG_BOUNTY_PLATFORM_ABI,
    functionName: 'getBountyState',
    args: [BigInt(i)],
  }));

  const { data: escrowData } = useReadContracts({
    contracts: escrowCalls,
    query: { refetchInterval: 10000 },
  });

  const totalEscrow = (escrowData || []).reduce((acc, res) => {
    if (res.status === 'success' && res.result) {
      return acc + Number((res.result as any)[6]);
    }
    return acc;
  }, 0);

  const exec = async (fn: string, args: any[], label: string) => {
    try {
      setStatus(`${label}...`);
      await writeContractAsync({
        abi: BUG_BOUNTY_PLATFORM_ABI as any,
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: fn,
        args,
        maxFeePerGas: BigInt(50000000000),
        maxPriorityFeePerGas: BigInt(1000000000),
      });
      setStatus(`${label} — Success!`);
      // Refresh disputes after action
      setTimeout(() => window.location.reload(), 1000);
    } catch (e: any) { setStatus(`Error: ${e.message}`); }
  };

  const getStatusBadge = (status: ReportStatus) => {
    switch (status) {
      case ReportStatus.Disputed:
        return <span className="badge-warning">Disputed</span>;
      case ReportStatus.Accepted:
        return <span className="badge-success">Accepted</span>;
      case ReportStatus.Rejected:
        return <span className="badge-danger">Rejected</span>;
      default:
        return <span className="badge-secondary">{ReportStatus[status]}</span>;
    }
  };

  const getPhaseBadge = (phase: DisputePhase) => {
    switch (phase) {
      case DisputePhase.Commit:
        return <span className="badge-info flex items-center gap-1"><Lock className="w-3 h-3" /> Commit</span>;
      case DisputePhase.Reveal:
        return <span className="badge-brand flex items-center gap-1"><Unlock className="w-3 h-3" /> Reveal</span>;
      case DisputePhase.Resolved:
        return <span className="badge-success flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Resolved</span>;
      default:
        return <span className="badge-secondary">Unknown</span>;
    }
  };

  const getTimeRemaining = (deadline: number) => {
    if (!deadline || deadline === 0) return '—';
    const now = Math.floor(Date.now() / 1000);
    const remaining = deadline - now;
    if (remaining <= 0) return 'Expired';
    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const openDisputes = disputes.filter(d => d.phase !== DisputePhase.Resolved);
  const resolvedDisputes = disputes.filter(d => d.phase === DisputePhase.Resolved);

  return (
    <div className="animate-fade-in max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex p-3 rounded-2xl bg-amber-50 dark:bg-amber-500/10 mb-4">
          <Scale className="w-8 h-8 text-amber-600 dark:text-amber-400" />
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Dispute Management</h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">Raise appeals, escalate SLA breaches, and resolve disputes through commit-reveal voting.</p>
      </div>

      {/* Active Disputes Table */}
      <div className="glass-card p-6 mb-6">
        <h3 className="section-title mb-4 flex items-center gap-2">
          <FileWarning className="w-5 h-5" />
          Active Disputes
          {isLoadingDisputes && <span className="text-xs text-gray-400 ml-2">(Loading...)</span>}
        </h3>

        {openDisputes.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No active disputes</p>
            <p className="text-sm mt-1">All reports are being processed normally</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-slate-700">
                  <th className="pb-3 font-medium">Report</th>
                  <th className="pb-3 font-medium">Bounty</th>
                  <th className="pb-3 font-medium">Researcher</th>
                  <th className="pb-3 font-medium">Phase</th>
                  <th className="pb-3 font-medium">Votes</th>
                  <th className="pb-3 font-medium">Time Left</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {openDisputes.map(d => (
                  <tr key={`${d.bountyId}-${d.reportId}`} className="border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 font-mono font-medium text-gray-900 dark:text-white">#{d.reportId}</td>
                    <td className="py-3 text-gray-600 dark:text-gray-400">#{d.bountyId}</td>
                    <td className="py-3 font-mono text-xs text-gray-500">{d.researcher.slice(0, 6)}...{d.researcher.slice(-4)}</td>
                    <td className="py-3">{getPhaseBadge(d.phase)}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />{d.acceptVotes}
                        </span>
                        <span className="text-red-600 dark:text-red-400 flex items-center gap-1">
                          <XCircle className="w-3 h-3" />{d.rejectVotes}
                        </span>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className={`text-xs font-mono ${d.commitDeadline < Date.now() / 1000 ? 'text-red-500' : 'text-amber-500'}`}>
                        <Timer className="w-3 h-3 inline mr-1" />
                        {getTimeRemaining(d.phase === DisputePhase.Commit ? d.commitDeadline : d.revealDeadline)}
                      </span>
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => { setSelectedDispute(d); setSelectedBountyId(String(d.bountyId)); setSelectedReportId(String(d.reportId)); }}
                        className="text-brand-600 dark:text-brand-400 hover:underline text-xs font-medium"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Resolved Disputes */}
      {resolvedDisputes.length > 0 && (
        <div className="glass-card p-6 mb-6">
          <h3 className="section-title mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Resolved Disputes
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-slate-700">
                  <th className="pb-3 font-medium">Report</th>
                  <th className="pb-3 font-medium">Bounty</th>
                  <th className="pb-3 font-medium">Outcome</th>
                </tr>
              </thead>
              <tbody>
                {resolvedDisputes.map(d => (
                  <tr key={`${d.bountyId}-${d.reportId}`} className="border-b border-gray-100 dark:border-slate-800">
                    <td className="py-3 font-mono text-gray-900 dark:text-white">#{d.reportId}</td>
                    <td className="py-3 text-gray-600 dark:text-gray-400">#{d.bountyId}</td>
                    <td className="py-3">
                      {d.acceptVotes >= d.rejectVotes ? (
                        <span className="badge-success">Accepted (Appeal Won)</span>
                      ) : (
                        <span className="badge-danger">Rejected (Appeal Lost)</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Escrow Status */}
      <div className="glass-card p-6 mb-6">
        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
          <Coins className="w-5 h-5" /> Escrow Status
        </h3>
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
          <span>Total Locked</span>
          <span className="font-mono font-semibold text-gray-900 dark:text-white">
            {(totalEscrow / 1000000).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC
          </span>
        </div>
        <div className="h-3 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-1000" style={{ width: '100%' }} />
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Total funds secured across all active bounties</p>
      </div>

      {/* Action Panel */}
      <div className="glass-card p-6">
        <h3 className="section-title mb-4">Take Action</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Step 1: Select Bounty</label>
            <select
              value={selectedBountyId}
              onChange={e => { setSelectedBountyId(e.target.value); setSelectedReportId(''); }}
              className="input-field cursor-pointer"
            >
              <option value="">-- Choose Bounty --</option>
              {Array.from({ length: bountyCountNum }).map((_, i) => (
                <option key={i} value={i}>Program Instance #{i}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Step 2: Select Report</label>
            <select
              value={selectedReportId}
              onChange={e => setSelectedReportId(e.target.value)}
              className="input-field cursor-pointer disabled:opacity-50"
              disabled={!selectedBountyId}
            >
              <option value="">-- Choose Report --</option>
              {reportCountNum > 0 ? (
                Array.from({ length: reportCountNum }).map((_, i) => (
                  <option key={i} value={i}>Report #{i}</option>
                ))
              ) : (
                <option value="" disabled>No reports available</option>
              )}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => exec('raiseDispute', [BigInt(selectedBountyId || 0), BigInt(selectedReportId || 0)], 'Raising dispute')}
            className="btn-warning flex items-center justify-center gap-2"
            disabled={!selectedBountyId || !selectedReportId}
          >
            <AlertTriangle className="w-4 h-4" /> Raise Dispute
          </button>
          <button
            onClick={() => exec('triggerEscalation', [BigInt(selectedBountyId || 0), BigInt(selectedReportId || 0)], 'Escalating')}
            className="btn-danger flex items-center justify-center gap-2"
            disabled={!selectedBountyId || !selectedReportId}
          >
            <Clock className="w-4 h-4" /> Force Escalate
          </button>
          <button
            onClick={() => exec('resolveDispute', [BigInt(selectedBountyId || 0), BigInt(selectedReportId || 0)], 'Resolving dispute')}
            className="btn-primary flex items-center justify-center gap-2"
            disabled={!selectedBountyId || !selectedReportId}
          >
            <Gavel className="w-4 h-4" /> Resolve
          </button>
        </div>

        {status && (
          <div className={`mt-5 p-4 rounded-xl text-sm font-medium ${
            status.includes('Success') ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' :
            status.includes('Error') ? 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300' :
            'bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300'
          }`}>
            {status}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper functions for fetching data
async function fetchReport(bountyId: number, reportId: number) {
  // This is a placeholder - in production, use wagmi hooks or ethers
  return null;
}

async function fetchDispute(reportId: number) {
  // This is a placeholder - in production, use wagmi hooks or ethers
  return null;
}
