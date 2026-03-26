import React from 'react';
import { FileText, Vote, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

const mockActivity = [
  { id: 1, type: 'submit', text: 'Report #42 submitted for Bounty #7', time: '2 min ago', icon: FileText, color: 'text-brand-500' },
  { id: 2, type: 'vote', text: 'Committee member voted Accept on Report #41', time: '15 min ago', icon: Vote, color: 'text-emerald-500' },
  { id: 3, type: 'dispute', text: 'Dispute opened on Report #38 — appeal bond locked', time: '1 hr ago', icon: AlertTriangle, color: 'text-amber-500' },
  { id: 4, type: 'resolve', text: 'Report #35 finalized — 5,000 USDC paid to researcher', time: '3 hr ago', icon: CheckCircle, color: 'text-emerald-500' },
  { id: 5, type: 'escalate', text: 'SLA expired on Report #33 — auto-escalated to dispute', time: '5 hr ago', icon: Clock, color: 'text-rose-500' },
];

export function ActivityFeed() {
  return (
    <div className="glass-card p-6">
      <h3 className="section-title mb-4">Recent Activity</h3>
      <div className="space-y-4">
        {mockActivity.map(item => (
          <div key={item.id} className="flex items-start gap-3 group">
            <div className="mt-0.5 p-1.5 rounded-lg bg-gray-50 dark:bg-slate-800 group-hover:bg-gray-100 dark:group-hover:bg-slate-700 transition-colors">
              <item.icon className={`w-4 h-4 ${item.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-700 dark:text-gray-300">{item.text}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{item.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
