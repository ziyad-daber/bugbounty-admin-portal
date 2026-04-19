'use client'
import React, { useState, useEffect } from 'react';
import { useReadContract, useReadContracts } from 'wagmi';
import { BUG_BOUNTY_PLATFORM_ABI, CONTRACT_ADDRESS } from '@/services/contracts';
import { FileText, Shield } from 'lucide-react';

interface ActivityItem {
  id: string;
  text: string;
  icon: any;
  color: string;
}

export function ActivityFeed() {
  const { data: bountyCountStr } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: BUG_BOUNTY_PLATFORM_ABI as any,
    functionName: 'bountyCount',
    query: { refetchInterval: 10000 }
  });

  const bountyCount = Number(bountyCountStr || 0);

  // Fetch the reportCount for the last 5 bounties
  const recentBountyIds = Array.from({ length: Math.min(5, bountyCount) }).map((_, i) => bountyCount - 1 - i);

  const reportCountCalls = recentBountyIds.map(id => ({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: BUG_BOUNTY_PLATFORM_ABI as any,
    functionName: 'reportCount',
    args: [BigInt(id)],
  }));

  const { data: reportCounts } = useReadContracts({
    contracts: reportCountCalls as any,
  });

  const [activities, setActivities] = useState<ActivityItem[]>([]);

  useEffect(() => {
    let newActivities: ActivityItem[] = [];
    
    // Add bounty creations
    recentBountyIds.forEach(id => {
      newActivities.push({
        id: `bounty-${id}`,
        text: `Bounty Program #${id} was initialized`,
        icon: Shield,
        color: 'text-brand-500'
      });
    });

    if (reportCounts) {
      reportCounts.forEach((res, i) => {
        if (res.status === 'success' && res.result) {
          const rCount = Number(res.result);
          const bId = recentBountyIds[i];
          for (let rId = Math.max(0, rCount - 2); rId < rCount; rId++) {
            newActivities.push({
              id: `report-${bId}-${rId}`,
              text: `Vulnerability Report #${rId} submitted to Bounty #${bId}`,
              icon: FileText,
              color: 'text-emerald-500'
            });
          }
        }
      });
    }

    // Sort to make reports appear above the bounty creation since they happen later
    newActivities.sort((a, b) => {
      if (a.id.startsWith('report') && b.id.startsWith('bounty')) return -1;
      if (a.id.startsWith('bounty') && b.id.startsWith('report')) return 1;
      return 0;
    });

    setActivities(newActivities.slice(0, 7));
  }, [reportCounts, bountyCount]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="glass-card p-6 min-h-[300px]">
      <h3 className="section-title mb-4">Live Network Activity</h3>
      {activities.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">Waiting for blockchain events...</p>
      ) : (
        <div className="space-y-4">
          {activities.map((item, index) => (
            <div key={item.id} className="flex items-start gap-3 group animate-slide-up" style={{ animationDelay: `${index * 100}ms` }}>
              <div className="mt-0.5 p-1.5 rounded-lg bg-gray-50 dark:bg-slate-800 transition-colors">
                <item.icon className={`w-4 h-4 ${item.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 dark:text-gray-300">{item.text}</p>
                <p className="text-[10px] text-brand-400 mt-1 uppercase tracking-widest font-bold">Confirmed on Arbitrum Sepolia</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
