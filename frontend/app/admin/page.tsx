'use client'
import React, { useState } from 'react';
import { useAccount, useReadContract, useReadContracts } from 'wagmi';
import { BUG_BOUNTY_PLATFORM_ABI, CONTRACT_ADDRESS } from '@/services/contracts';
import { AdminGuard } from '@/components/AdminGuard';
import { Shield, FileText, CheckCircle, XCircle, AlertTriangle, ChevronRight, Clock, Plus, Loader2 } from 'lucide-react';
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
    chainId: 421614,
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

  // Get all bounties (filter by connected address as owner)
  const allBounties = bountiesData
    ?.map((res, i) => {
      if (res.status === 'success' && res.result) {
        return { id: i, core: res.result as any };
      }
      return null;
    })
    .filter(b => b !== null) || [];

  const myBounties = allBounties.filter(b => String(b.core[0]).toLowerCase() === String(address).toLowerCase());
  const otherBounties = allBounties.filter(b => String(b.core[0]).toLowerCase() !== String(address).toLowerCase());

  // Debug logging
  console.log('[Admin Dashboard] Contract:', CONTRACT_ADDRESS);
  console.log('[Admin Dashboard] Bounty Count Raw:', bountyCountStr);
  console.log('[Admin Dashboard] Bounty Count Parsed:', bountyCount);
  console.log('[Admin Dashboard] Bounty Count Error:', bountyCountError);
  console.log('[Admin Dashboard] Bounties Data:', bountiesData);
  console.log('[Admin Dashboard] All Bounties:', allBounties);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
            <Shield className="w-8 h-8 text-brand-500" />
            Admin Dashboard
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage your bounties and review submitted reports.
          </p>
        </div>
        <div>
          <Link href="/admin/create" className="btn-primary flex items-center gap-2 text-base">
            <Plus className="w-5 h-5" />
            Create Bounty
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left pane: Bounties */}
        <div className="col-span-1 space-y-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-400" />
            All Bounties ({allBounties.length})
          </h2>

          {isBountyCountLoading ? (
            <div className="glass-card p-6 text-center text-gray-500">
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading bounties...
              </div>
            </div>
          ) : bountyCountError ? (
            <div className="glass-card p-6 text-center text-red-500">
              <AlertTriangle className="w-5 h-5 mx-auto mb-2" />
              <div>Error loading bounties</div>
              <div className="text-xs mt-2 opacity-75">{String(bountyCountError)}</div>
            </div>
          ) : allBounties.length === 0 ? (
            <div className="glass-card p-6 text-center text-gray-500">
              No bounties found. Create one to get started.
            </div>
          ) : (
            <div className="space-y-3">
              {allBounties.map((b) => {
                const isMine = String(b.core[0]).toLowerCase() === String(address).toLowerCase();
                return (
                  <div
                    key={b.id}
                    onClick={() => setSelectedBountyId(b.id)}
                    className={`glass-card p-4 cursor-pointer transition-all ${
                      selectedBountyId === b.id
                        ? 'ring-2 ring-brand-500 bg-brand-50 dark:bg-brand-500/10'
                        : 'hover:border-gray-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-gray-900 dark:text-white">Bounty #{b.id}</span>
                      {!isMine && (
                        <span className="text-xs bg-gray-100 dark:bg-slate-700 text-gray-500 px-2 py-1 rounded">
                          Other
                        </span>
                      )}
                    </div>
                    <div className="mt-2 text-sm text-gray-500 truncate font-mono">
                      Token: {String(b.core[1]).slice(0, 10)}...{String(b.core[1]).slice(-8)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right pane: Reports for selected bounty */}
        <div className="col-span-1 lg:col-span-2">
          {selectedBountyId === null ? (
            <div className="glass-card flex flex-col items-center justify-center p-12 h-full text-center">
              <Shield className="w-12 h-12 text-gray-300 dark:text-slate-700 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Select a Bounty</h3>
              <p className="text-gray-500 mt-2 max-w-sm">
                Choose a bounty from the list to view its submitted reports.
              </p>
              {allBounties.length > 0 && myBounties.length === 0 && (
                <p className="text-amber-600 dark:text-amber-400 text-sm mt-4">
                  Note: You can view all bounties, but you can only manage bounties you own.
                </p>
              )}
            </div>
          ) : (
            <ReportsPanel bountyId={selectedBountyId} />
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

  const { data: reportsData } = useReadContracts({
    contracts: reportCalls,
  });

  const reports = reportsData
    ?.map((res, i) => {
      if (res.status === 'success' && res.result) {
        return { id: i, data: res.result as any };
      }
      return null;
    })
    .filter(r => r !== null) || [];

  return (
    <div className="glass-card p-6 min-h-[500px]">
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-4 mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Reports for Bounty #{bountyId}
        </h2>
        <span className="bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 px-3 py-1 rounded-full text-sm font-medium">
          {reports.length} Total
        </span>
      </div>

      {reports.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
          No reports submitted for this bounty yet.
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((r) => {
             const statusStr = STATUS_MAP[Number(r.data[3])] || 'Unknown';
             let StatusIcon = Clock;
             let statusColor = 'text-gray-500 bg-gray-50 dark:bg-slate-800';
             
             if (statusStr === 'Accepted') { StatusIcon = CheckCircle; statusColor = 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200'; }
             else if (statusStr === 'Rejected') { StatusIcon = XCircle; statusColor = 'text-rose-600 bg-rose-50 dark:bg-rose-500/10 border-rose-200'; }
             else if (statusStr === 'Disputed') { StatusIcon = AlertTriangle; statusColor = 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 border-amber-200'; }
             else if (statusStr === 'Finalized') { StatusIcon = Shield; statusColor = 'text-purple-600 bg-purple-50 dark:bg-purple-500/10 border-purple-200'; }
             
             return (
              <div key={r.id} className="p-4 rounded-2xl border border-gray-200 dark:border-slate-700 hover:border-brand-300 transition-colors bg-white dark:bg-slate-900">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-900 dark:text-white text-lg">Report #{r.id}</span>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${statusColor}`}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      {statusStr}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(Number(r.data[1]) * 1000).toLocaleString()}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 text-sm">
                  <div>
                    <span className="block text-gray-500 dark:text-gray-400 mb-1">Researcher</span>
                    <span className="font-mono text-gray-900 dark:text-gray-200 break-all">{String(r.data[0])}</span>
                  </div>
                  <div>
                    <span className="block text-gray-500 dark:text-gray-400 mb-1">Commit Hash</span>
                    <span className="font-mono text-gray-900 dark:text-gray-200 break-all" title={String(r.data[6])}>
                      {String(r.data[6]).slice(0, 14)}...
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800 flex justify-end gap-2">
                   <button className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300">
                     View Details
                   </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
