'use client'
import Link from 'next/link';
import { useReadContract, useReadContracts } from 'wagmi';
import { BUG_BOUNTY_PLATFORM_ABI, CONTRACT_ADDRESS } from '@/services/contracts';
import { getTokenByAddress, formatTokenAmount } from '@/services/tokens';
import { StatCard } from '@/components/StatCard';
import { ActivityFeed } from '@/components/ActivityFeed';
import { Target, Coins, FileText, Scale, Send, Users, AlertTriangle, Shield, Lock, Zap, ChevronRight, Tag } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function DashboardPage() {
  const { data: bountyCount } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: BUG_BOUNTY_PLATFORM_ABI as any,
    functionName: 'bountyCount',
    query: { refetchInterval: 10000 }
  });

  const bountyCountNum = Number(bountyCount || 0);

  // Fetch all bounties
  const bountyCalls = Array.from({ length: bountyCountNum }).map((_, i) => ({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: BUG_BOUNTY_PLATFORM_ABI as any,
    functionName: 'getBountyCore',
    args: [BigInt(i)],
  }));

  const stateCalls = Array.from({ length: bountyCountNum }).map((_, i) => ({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: BUG_BOUNTY_PLATFORM_ABI as any,
    functionName: 'getBountyState',
    args: [BigInt(i)],
  }));

  const reportCountCalls = Array.from({ length: bountyCountNum }).map((_, i) => ({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: BUG_BOUNTY_PLATFORM_ABI as any,
    functionName: 'reportCount',
    args: [BigInt(i)],
  }));

  const { data: bountiesData } = useReadContracts({
    contracts: bountyCalls,
    query: { refetchInterval: 10000 },
  });

  const { data: statesData } = useReadContracts({
    contracts: stateCalls,
    query: { refetchInterval: 10000 },
  });

  const { data: reportCountsData } = useReadContracts({
    contracts: reportCountCalls as any,
    query: { refetchInterval: 10000 },
  });

  // Process data
  const totalRewardsUsdc = (bountiesData || []).reduce((acc, res) => {
    if (res.status === 'success' && res.result) {
      // res.result is [owner, token, rewardAmount, ...]
      const reward = Number((res.result as any[])[2]) / 1000000;
      return acc + reward;
    }
    return acc;
  }, 0);

  const totalEscrowUsdc = (statesData || []).reduce((acc, res) => {
    if (res.status === 'success' && res.result) {
      const balance = Number((res.result as any[])[6]) / 1000000;
      return acc + balance;
    }
    return acc;
  }, 0);

  const activeBountiesCount = (statesData || []).filter(res => res.status === 'success' && res.result && (res.result as any)[5]).length;

  const totalReportsCount = (reportCountsData || []).reduce((acc, res) => {
    if (res.status === 'success' && res.result) return acc + Number(res.result);
    return acc;
  }, 0);

  const uniqueOwners = new Set(
    (bountiesData || []).map(r => r.status === 'success' && r.result ? (r.result as any)[0] : null).filter(Boolean)
  ).size;

  return (
    <div className="animate-fade-in space-y-16 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.05),transparent_50%)]" />
        <div className="relative max-w-7xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-8">
            <Shield className="w-4 h-4" /> Trusted Decentralized Security
          </div>
          <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight mb-8">
            <span className="text-white">Secure Your Code with</span><br />
            <span className="gradient-text">Incentivized Intelligence</span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg text-gray-500 leading-relaxed mb-12">
            The first fully autonomous bug bounty platform on Arbitrum. Submit findings, earn rewards, and adjudicate disputes through trustless on-chain governance.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/submit" className="btn-primary py-4 px-8 text-base">Start Hunting</Link>
            <Link href="/admin" className="btn-secondary py-4 px-8 text-base">Launch Multi-Sig Program</Link>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 space-y-16">
        {/* Statistics Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard icon={Target} label="Programs Online" value={activeBountiesCount.toString()} trend="Global Active" color="brand" />
          <StatCard icon={Coins} label="Locked Liquidity" value={`${totalEscrowUsdc.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC`} trend="Audited Escrow" color="emerald" />
          <StatCard icon={FileText} label="Secured Reports" value={totalReportsCount.toString()} trend="Total Intercepted" color="amber" />
          <StatCard icon={Users} label="Unique Organizations" value={uniqueOwners.toString()} trend="Decentralized Entities" color="rose" />
        </section>

        {/* Bounty Explorer */}
        <section>
          <div className="flex items-center justify-between mb-8">
             <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                <Target className="w-8 h-8 text-brand-500" /> Bounty Explorer
             </h2>
             <div className="flex gap-2">
                <span className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-bold text-gray-500">SORT BY: REWARD</span>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(bountiesData || []).map((res: any, i: number) => {
               if (res.status !== 'success' || !res.result) return null;
               const core = res.result;
               const token = getTokenByAddress(core[1]);
               const isActive = statesData?.[i]?.status === 'success' ? (statesData[i].result as any)[5] : false;

               return (
                 <div key={i} className="glass-card p-6 flex flex-col group hover:scale-[1.02] transition-all">
                    <div className="flex justify-between items-start mb-6">
                       <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center">
                          <img src={token?.logoUrl} alt={token?.symbol} className="w-6 h-6" />
                       </div>
                       <span className={`px-2 py-1 rounded text-[10px] font-bold border uppercase tracking-wider ${isActive ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'}`}>
                          {isActive ? 'Live' : 'Paused'}
                       </span>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-brand-400 transition-colors">Program Instance #{i}</h3>
                    
                    <div className="flex flex-wrap gap-2 mb-6">
                       <span className="px-2 py-1 rounded-md bg-slate-800/50 text-[10px] text-gray-400 font-bold border border-slate-700">L1 SMART CONTRACT</span>
                       <span className="px-2 py-1 rounded-md bg-slate-800/50 text-[10px] text-gray-400 font-bold border border-slate-700">WEB3 ARCH</span>
                    </div>

                    <div className="mt-auto pt-6 border-t border-slate-800 flex justify-between items-center">
                       <div>
                          <div className="text-[10px] font-bold text-gray-600 uppercase mb-1">Max Reward</div>
                          <div className="text-lg font-bold text-white">{formatTokenAmount(core[2], token?.decimals)} {token?.symbol}</div>
                       </div>
                       <Link href={`/submit?bountyId=${i}`} className="p-2 rounded-lg bg-brand-500/5 border border-brand-500/10 text-brand-500 hover:bg-brand-500 hover:text-white transition-all">
                          <Send className="w-5 h-5" />
                       </Link>
                    </div>
                 </div>
               );
            })}
          </div>
        </section>

        {/* Activity & Features */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
           <div className="lg:col-span-8 space-y-8">
              <div className="glass-card p-10 bg-gradient-to-br from-slate-900 to-slate-950">
                 <h2 className="text-3xl font-bold text-white mb-6">Autonomous Security Protocol</h2>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {[
                      { icon: Lock, title: 'E2E Encryption', desc: 'Reports are encrypted in the browser using AES-256-GCM. Decryption keys never leave authorized committee devices.' },
                      { icon: Zap, title: 'Instant Settlement', desc: 'Once a report is accepted by the committee, reward payouts are triggered automatically from the on-chain escrow.' },
                      { icon: Scale, title: 'Dispute Mediation', desc: 'Fair adjudication process via commit-reveal re-voting schemes, preventing herd mentality and ensuring integrity.' },
                      { icon: Users, title: 'Expert Committees', desc: 'Bounty owners can appoint specialized technical committees to evaluate complex vulnerability submissions.' },
                    ].map(f => (
                      <div key={f.title} className="flex gap-4">
                        <div className="shrink-0 w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
                          <f.icon className="w-5 h-5 text-brand-500" />
                        </div>
                        <div>
                          <h4 className="font-bold text-white mb-1">{f.title}</h4>
                          <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                        </div>
                      </div>
                    ))}
                 </div>
              </div>
           </div>
           <div className="lg:col-span-4">
              <ActivityFeed />
           </div>
        </section>
      </div>
    </div>
  );
}
