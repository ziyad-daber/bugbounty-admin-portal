'use client'
import React, { useState, useEffect } from 'react';
import { useAccount, useReadContract, useReadContracts } from 'wagmi';
import { BUG_BOUNTY_PLATFORM_ABI, CONTRACT_ADDRESS } from '@/services/contracts';
import { AdminGuard } from '@/components/AdminGuard';
import { fetchBountyMetadata, BountyMetadata } from '@/services/ipfs';
import { getTokenByAddress, formatTokenAmount } from '@/services/tokens';
import { 
  Shield, FileText, CheckCircle, XCircle, AlertTriangle, 
  ChevronRight, Clock, Plus, Loader2, ExternalLink, Tag, Coins 
} from 'lucide-react';
import Link from 'next/link';

const STATUS_MAP = ['Submitted', 'Accepted', 'Rejected', 'Disputed', 'Finalized'];

export default function AdminPage() {
  return (
    <AdminGuard>
      <AdminDashboard />
    </AdminGuard>
  );
}

function AdminDashboard() {
  const { address } = useAccount();
  const [selectedBountyId, setSelectedBountyId] = useState<number | null>(null);

  // 1. Get total bounties
  const { data: bountyCountStr, error: bountyCountError, isLoading: isBountyCountLoading } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: BUG_BOUNTY_PLATFORM_ABI as any,
    functionName: 'bountyCount',
  });

  const bountyCount = Number(bountyCountStr || 0);

  // 2. Fetch all bounties
  const bountyCalls = Array.from({ length: bountyCount }).map((_, i) => ({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: BUG_BOUNTY_PLATFORM_ABI as any,
    functionName: 'getBountyCore',
    args: [i],
  }));

  const { data: bountiesData } = useReadContracts({
    contracts: bountyCalls,
  });

  // Process bounties and fetch metadata
  const [processedBounties, setProcessedBounties] = useState<any[]>([]);

  useEffect(() => {
    if (!bountiesData) return;

    const loadBountyData = async () => {
      const results = await Promise.all(
        bountiesData.map(async (res: any, i: number) => {
          if (res.status === 'success' && res.result) {
            const core = res.result;
            const cidDigest = core[10]; // metadataCidDigest is at index 10
            
            // In a real app, CID would be resolved from digest or stored separately
            // For now, we'll use fallback meta if we can't fetch
            const metadata = null; // fetchBountyMetadata logic would go here if we had the actual CID

            return { id: i, core, metadata };
          }
          return null;
        })
      );
      setProcessedBounties(results.filter(b => b !== null));
    };

    loadBountyData();
  }, [bountiesData]);

  const myBounties = processedBounties.filter(b => b.core[0].toLowerCase() === address?.toLowerCase());

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in">
      <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-white flex items-center gap-4">
            <div className="p-2 rounded-2xl bg-brand-500/10 border border-brand-500/20">
              <Shield className="w-8 h-8 text-brand-500" />
            </div>
            Admin Hub
          </h1>
          <p className="mt-2 text-gray-500 max-w-sm">
            Orchestrate your security programs and evaluate intelligence reports.
          </p>
        </div>
        <div className="flex gap-4">
          <Link href="/admin/create" className="btn-primary flex items-center gap-2 group">
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
            Launch Bounty
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Programs */}
        <div className="lg:col-span-4 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-600" />
              Active Programs
            </h2>
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600 bg-slate-900 border border-slate-800 px-2 py-1 rounded">
              {myBounties.length} TOTAL
            </span>
          </div>

          {isBountyCountLoading ? (
             <div className="flex flex-col items-center justify-center py-20 opacity-50">
               <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-4" />
               <p className="text-xs font-medium text-gray-500 uppercase tracking-widest">Scanning Chain...</p>
             </div>
          ) : myBounties.length === 0 ? (
            <div className="glass-card p-10 text-center">
              <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-800">
                <Plus className="w-6 h-6 text-slate-700" />
              </div>
              <p className="text-gray-500 text-sm">No active programs found.</p>
              <Link href="/admin/create" className="text-brand-500 text-xs font-bold hover:underline mt-2 inline-block">Initialize First Bounty</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {myBounties.map((b) => {
                const isMine = true; // since it's filtered to myBounties
                const token = getTokenByAddress(b.core[1]);
                return (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBountyId(b.id)}
                    className={`w-full text-left glass-card p-5 transition-all group ${
                      selectedBountyId === b.id
                        ? 'ring-2 ring-brand-500 bg-brand-500/5'
                        : 'hover:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-brand-500 uppercase tracking-widest mb-1">PROGRAM #{b.id}</span>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-white group-hover:text-brand-400 transition-colors">
                            {b.metadata?.title || `Bounty Instance`}
                          </h3>
                        </div>
                      </div>
                      {isMine && (
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" title="Owner" />
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs font-mono text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <Coins className="w-3.5 h-3.5" />
                        {token?.symbol || 'USDC'}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5" />
                        {formatTokenAmount(b.core[2], token?.decimals)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Insights */}
        <div className="lg:col-span-8">
          {selectedBountyId === null ? (
            <div className="h-full flex flex-col items-center justify-center glass-card p-20 text-center opacity-50 border-dashed">
              <Shield className="w-16 h-16 text-slate-800 mb-6" />
              <h3 className="text-xl font-bold text-gray-600 mb-2">Command Selection Required</h3>
              <p className="text-sm text-gray-700 max-w-xs">
                Select an active program instance from the left sidebar to access report analytics and governance controls.
              </p>
            </div>
          ) : (
            <div className="animate-slide-up space-y-6">
              <ReportsPanel bountyId={selectedBountyId} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReportsPanel({ bountyId }: { bountyId: number }) {
  // Fetch report count
  const { data: reportCountStr } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: BUG_BOUNTY_PLATFORM_ABI as any,
    functionName: 'reportCount',
    args: [bountyId],
  });

  const reportCount = Number(reportCountStr || 0);

  // Fetch all reports for this bounty
  const reportCalls = Array.from({ length: reportCount }).map((_, i) => ({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: BUG_BOUNTY_PLATFORM_ABI as any,
    functionName: 'reports',
    args: [bountyId, i],
  }));

  const { data: reportsData, isLoading: isReportsLoading } = useReadContracts({
    contracts: reportCalls,
  });

  const reports = reportsData
    ?.map((res: any, i: number) => {
      if (res.status === 'success' && res.result) {
        return { id: i, data: res.result };
      }
      return null;
    })
    .filter(r => r !== null) || [];

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-8 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
        <div>
          <h2 className="text-2xl font-bold text-white">Vulnerability Reports</h2>
          <p className="text-sm text-gray-500 mt-1">Instance #{bountyId} — Intelligence Feed</p>
        </div>
        <div className="flex gap-4">
          <div className="text-center px-4 py-2 bg-slate-900 rounded-xl border border-slate-800">
            <div className="text-lg font-bold text-white">{reports.length}</div>
            <div className="text-[10px] font-bold text-gray-600 uppercase">Total</div>
          </div>
        </div>
      </div>

      <div className="p-8">
        {isReportsLoading ? (
            <div className="py-20 flex flex-col items-center opacity-50">
                <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-2" />
                <span className="text-xs font-bold uppercase tracking-widest text-gray-600">Decrypting Metadata...</span>
            </div>
        ) : reports.length === 0 ? (
          <div className="py-20 text-center bg-slate-900/20 rounded-3xl border border-slate-800/50 border-dashed">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-slate-800" />
            <h3 className="text-lg font-bold text-gray-600">No Intelligence Received</h3>
            <p className="text-sm text-gray-700 mt-1">Researchers haven't submitted any discoveries to this program yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {reports.map((r) => {
              const statusStr = STATUS_MAP[Number(r.data[3])] || 'Unknown';
              let StatusIcon = Clock;
              let statusColor = 'text-gray-500 bg-gray-50/5 border-gray-50/10';
              
              if (statusStr === 'Accepted') { StatusIcon = CheckCircle; statusColor = 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'; }
              else if (statusStr === 'Rejected') { StatusIcon = XCircle; statusColor = 'text-rose-500 bg-rose-500/10 border-rose-500/20'; }
              else if (statusStr === 'Disputed') { StatusIcon = AlertTriangle; statusColor = 'text-amber-500 bg-amber-500/10 border-amber-500/20'; }
              else if (statusStr === 'Finalized') { StatusIcon = Shield; statusColor = 'text-brand-500 bg-brand-500/10 border-brand-500/20'; }
              
              return (
                <div key={r.id} className="p-6 rounded-2xl border border-slate-800 bg-slate-900/30 hover:border-slate-700 transition-all group">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center font-bold text-white border border-slate-800 group-hover:border-brand-500/30 transition-colors">
                        #{r.id}
                      </div>
                      <div>
                         <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusColor} mb-2`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            {statusStr}
                         </span>
                         <div className="text-sm font-mono text-gray-500 overflow-hidden text-ellipsis whitespace-nowrap min-w-0 max-w-[200px] sm:max-w-none">
                            Researcher: {r.data[0].slice(0, 12)}...
                         </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1 italic">Observed Transmission</div>
                      <div className="text-xs text-gray-400 font-medium">
                        {new Date(Number(r.data[1]) * 1000).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-6 border-t border-slate-800/50 flex justify-between items-center group-hover:border-slate-800 transition-colors">
                     <div className="flex gap-6">
                        <div>
                            <div className="text-[10px] font-bold text-gray-600 uppercase mb-1">Votes</div>
                            <div className="flex items-center gap-2 text-xs font-bold">
                                <span className="text-emerald-500">{r.data[4]} YES</span>
                                <span className="text-rose-500">{r.data[5]} NO</span>
                            </div>
                        </div>
                     </div>
                     <Link href={`/admin/reports/${r.id}`} className="p-2 rounded-lg bg-brand-500/5 border border-brand-500/10 text-brand-500 hover:bg-brand-500 hover:text-white transition-all">
                        <ChevronRight className="w-5 h-5" />
                     </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
