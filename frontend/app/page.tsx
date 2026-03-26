'use client'
import Link from 'next/link';
import { useReadContract } from 'wagmi';
import { BUG_BOUNTY_PLATFORM_ABI, CONTRACT_ADDRESS } from '@/services/contracts';
import { StatCard } from '@/components/StatCard';
import { ActivityFeed } from '@/components/ActivityFeed';
import { Target, Coins, FileText, Scale, Send, Users, AlertTriangle, Shield, Lock, Zap, ChevronDown } from 'lucide-react';
import { useState } from 'react';

const faqItems = [
  { q: 'How do I submit a vulnerability?', a: 'Navigate to the Submit Report page, fill in the vulnerability details, and the system will encrypt your report client-side using AES-256-GCM before uploading to IPFS. Only the committee can decrypt it.' },
  { q: 'What happens to my stake?', a: 'Your stake is dynamically calculated based on your on-chain reputation. If your report is accepted, you get your stake back plus the bounty reward. If rejected, your stake is slashed to the treasury.' },
  { q: 'What if the committee doesn\'t respond?', a: 'If the committee fails to review within the SLA window, anyone can trigger an auto-escalation that opens a dispute with a commit-reveal re-vote.' },
  { q: 'How does the dispute process work?', a: 'Disputes use a two-phase commit-reveal voting scheme. Committee members first commit a hash of their vote, then reveal it. This prevents herd mentality and ensures independent judgment.' },
];

export default function DashboardPage() {
  const { data: bountyCount } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: BUG_BOUNTY_PLATFORM_ABI as any,
    functionName: 'bountyCount'
  });

  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-600/10 via-purple-600/5 to-transparent dark:from-brand-600/20 dark:via-purple-600/10" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-50 dark:bg-brand-500/10 border border-brand-200 dark:border-brand-500/20 text-brand-600 dark:text-brand-400 text-sm font-medium mb-6">
              <Shield className="w-4 h-4" />
              Trustless Security Protocol
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight">
              <span className="text-gray-900 dark:text-white">Decentralized</span>{' '}
              <span className="gradient-text">Bug Bounty</span>
            </h1>
            <p className="mt-6 text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
              Submit encrypted vulnerability reports, get judged by an on-chain committee, and receive automated escrow payouts — all without trusting a centralized intermediary.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/submit"><button className="btn-primary text-base">Submit a Report</button></Link>
              <Link href="/committee"><button className="btn-secondary text-base">Committee Panel</button></Link>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 space-y-12">
        {/* Stats */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 -mt-4">
          <StatCard icon={Target} label="Active Bounties" value={bountyCount ? bountyCount.toString() : '—'} trend="+3 this week" color="brand" />
          <StatCard icon={Coins} label="Total Rewards Locked" value="47,500 USDC" trend="+12%" color="emerald" />
          <StatCard icon={FileText} label="Reports Submitted" value="128" color="amber" />
          <StatCard icon={Scale} label="Disputes Resolved" value="14" color="rose" />
        </section>

        {/* Quick Actions + Activity */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { href: '/submit', icon: Send, title: 'Submit Report', desc: 'Encrypt & submit a vulnerability', color: 'from-brand-500 to-purple-600', shadow: 'shadow-brand-500/20' },
              { href: '/committee', icon: Users, title: 'Committee', desc: 'Review and vote on reports', color: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/20' },
              { href: '/dispute', icon: AlertTriangle, title: 'Disputes', desc: 'Manage appeals & escalations', color: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-500/20' },
            ].map(card => (
              <Link key={card.href} href={card.href} className="glass-card-hover p-6 flex flex-col items-center text-center group">
                <div className={`p-3 rounded-2xl bg-gradient-to-br ${card.color} shadow-lg ${card.shadow} mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <card.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white">{card.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{card.desc}</p>
              </Link>
            ))}
          </div>
          <ActivityFeed />
        </section>

        {/* How It Works */}
        <section>
          <h2 className="section-title text-center mb-8">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { step: '01', icon: Lock, title: 'Encrypt', desc: 'Your report is encrypted in your browser with AES-256-GCM before leaving your device.' },
              { step: '02', icon: Zap, title: 'Submit On-Chain', desc: 'Cryptographic hashes and your stake are committed to the blockchain. The data stays on IPFS.' },
              { step: '03', icon: Users, title: 'Committee Review', desc: 'An elected committee decrypts and evaluates your report within the SLA deadline.' },
              { step: '04', icon: Coins, title: 'Get Paid', desc: 'If accepted, the escrow automatically releases the reward to your wallet.' },
            ].map(item => (
              <div key={item.step} className="glass-card p-6 text-center animate-slide-up">
                <div className="text-xs font-bold text-brand-500 dark:text-brand-400 mb-3">STEP {item.step}</div>
                <div className="inline-flex p-3 rounded-xl bg-gray-50 dark:bg-slate-800 mb-3">
                  <item.icon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white">{item.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-3xl mx-auto">
          <h2 className="section-title text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {faqItems.map((item, i) => (
              <div key={i} className="glass-card overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between p-5 text-left">
                  <span className="font-semibold text-gray-900 dark:text-white text-sm">{item.q}</span>
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-sm text-gray-600 dark:text-gray-400 leading-relaxed animate-fade-in">{item.a}</div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
