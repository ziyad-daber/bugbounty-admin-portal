import { ethers } from 'ethers';
import { BUG_BOUNTY_PLATFORM_ABI, DISPUTE_MODULE_ABI, CONTRACT_ADDRESS } from './contracts';

export enum ReportStatus {
  Submitted = 0,
  Accepted = 1,
  Rejected = 2,
  Disputed = 3,
  Finalized = 4,
}

export enum DisputePhase {
  None = 0,
  Commit = 1,
  Reveal = 2,
  Resolved = 3,
}

interface ReportData {
  researcher: string;
  submittedAt: bigint;
  paid: boolean;
  status: ReportStatus;
  acceptVotes: number;
  rejectVotes: number;
  commitHash: string;
  cidDigest: string;
  hSteps: string;
  hImpact: string;
  hPoc: string;
  stakeAmount: bigint;
}

interface DisputeData {
  phase: DisputePhase;
  commitDeadline: bigint;
  revealDeadline: bigint;
  acceptVotes: number;
  rejectVotes: number;
}

interface BountyCore {
  owner: string;
  token: string;
  rewardAmount: bigint;
  stakeAmount: bigint;
  appealBond: bigint;
  submissionDeadline: bigint;
  reviewSLA: number;
  rateLimitWindow: number;
  stakeEscalationBps: number;
  maxInWindow: number;
}

interface BountyState {
  maxActiveSubmissions: number;
  committeeSize: number;
  thresholdK: number;
  disputeCommitSeconds: number;
  disputeRevealSeconds: number;
  active: boolean;
  escrowBalance: bigint;
}

let provider: ethers.Provider | null = null;
let contract: ethers.Contract | null = null;
let disputeModuleContract: ethers.Contract | null = null;

function getProvider() {
  if (!provider) {
    // Use public RPC for Arbitrum Sepolia
    provider = new ethers.JsonRpcProvider('https://arb1.arbitrum.io/rpc');
  }
  return provider;
}

function getContract() {
  if (!contract) {
    contract = new ethers.Contract(CONTRACT_ADDRESS, BUG_BOUNTY_PLATFORM_ABI, getProvider());
  }
  return contract;
}

async function getDisputeModuleContract() {
  if (!disputeModuleContract) {
    const platformContract = getContract();
    const disputeModuleAddress = await platformContract.disputeModule();
    disputeModuleContract = new ethers.Contract(disputeModuleAddress, DISPUTE_MODULE_ABI, getProvider());
  }
  return disputeModuleContract;
}

export async function getBountyCount(): Promise<number> {
  const c = getContract();
  const count = await c.bountyCount();
  return Number(count);
}

export async function getBountyCore(bountyId: number): Promise<BountyCore | null> {
  try {
    const c = getContract();
    const result = await c.getBountyCore(bountyId);
    return {
      owner: result[0],
      token: result[1],
      rewardAmount: result[2],
      stakeAmount: result[3],
      appealBond: result[4],
      submissionDeadline: result[5],
      reviewSLA: Number(result[6]),
      rateLimitWindow: Number(result[7]),
      stakeEscalationBps: Number(result[8]),
      maxInWindow: Number(result[9]),
    };
  } catch (e) {
    return null;
  }
}

export async function getBountyState(bountyId: number): Promise<BountyState | null> {
  try {
    const c = getContract();
    const result = await c.getBountyState(bountyId);
    return {
      maxActiveSubmissions: Number(result[0]),
      committeeSize: Number(result[1]),
      thresholdK: Number(result[2]),
      disputeCommitSeconds: Number(result[3]),
      disputeRevealSeconds: Number(result[4]),
      active: result[5],
      escrowBalance: result[6],
    };
  } catch (e) {
    return null;
  }
}

export async function getReport(bountyId: number, reportId: number): Promise<ReportData | null> {
  try {
    const c = getContract();
    const result = await c.reports(bountyId, reportId);
    return {
      researcher: result[0],
      submittedAt: result[1],
      paid: result[2],
      status: Number(result[3]),
      acceptVotes: Number(result[4]),
      rejectVotes: Number(result[5]),
      commitHash: result[6],
      cidDigest: result[7],
      hSteps: result[8],
      hImpact: result[9],
      hPoc: result[10],
      stakeAmount: result[11],
    };
  } catch (e) {
    return null;
  }
}

export async function getReportCount(bountyId: number): Promise<number> {
  try {
    const c = getContract();
    const count = await c.reportCount(bountyId);
    return Number(count);
  } catch (e) {
    return 0;
  }
}

export async function getDispute(reportId: number): Promise<DisputeData | null> {
  try {
    const dm = await getDisputeModuleContract();
    const result = await dm.disputes(reportId);
    return {
      phase: Number(result[0]),
      commitDeadline: result[1],
      revealDeadline: result[2],
      acceptVotes: Number(result[3]),
      rejectVotes: Number(result[4]),
    };
  } catch (e) {
    return null;
  }
}

export async function isCommitteeMember(bountyId: number, address: string): Promise<boolean> {
  try {
    const c = getContract();
    return await c.isCommitteeMember(bountyId, address);
  } catch (e) {
    return false;
  }
}

export async function hasVoted(bountyId: number, reportId: number, user: string): Promise<boolean> {
  try {
    const c = getContract();
    return await c.hasVoted(bountyId, reportId, user);
  } catch (e) {
    return false;
  }
}

/**
 * Fetch all reports across all bounties with optional status filter
 */
export async function getAllReports(statusFilter?: ReportStatus): Promise<{ bountyId: number; reportId: number; report: ReportData }[]> {
  const bountyCount = await getBountyCount();
  const allReports: { bountyId: number; reportId: number; report: ReportData }[] = [];

  for (let bountyId = 0; bountyId < bountyCount; bountyId++) {
    const reportCount = await getReportCount(bountyId);
    for (let reportId = 0; reportId < reportCount; reportId++) {
      const report = await getReport(bountyId, reportId);
      if (report) {
        if (statusFilter === undefined || report.status === statusFilter) {
          allReports.push({ bountyId, reportId, report });
        }
      }
    }
  }

  return allReports;
}

/**
 * Fetch all active disputes
 */
export async function getAllDisputes(): Promise<{ bountyId: number; reportId: number; report: ReportData; dispute: DisputeData }[]> {
  const pendingReports = await getAllReports(ReportStatus.Disputed);
  const disputes: { bountyId: number; reportId: number; report: ReportData; dispute: DisputeData }[] = [];

  for (const { bountyId, reportId, report } of pendingReports) {
    const dispute = await getDispute(reportId);
    if (dispute) {
      disputes.push({ bountyId, reportId, report, dispute });
    }
  }

  return disputes;
}

/**
 * Format address for display
 */
export function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Format timestamp to relative time
 */
export function formatRelativeTime(timestamp: bigint): string {
  const now = Math.floor(Date.now() / 1000);
  const ts = Number(timestamp);
  const diff = now - ts;

  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/**
 * Calculate time remaining until deadline
 */
export function getTimeRemaining(deadline: bigint | number): { expired: boolean; remaining: number; text: string } {
  const now = Math.floor(Date.now() / 1000);
  const dl = typeof deadline === 'bigint' ? Number(deadline) : deadline;
  const remaining = dl - now;

  if (remaining <= 0) {
    return { expired: true, remaining: 0, text: 'Expired' };
  }

  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;

  return {
    expired: false,
    remaining,
    text: `${hours}h ${minutes}m ${seconds}s`,
  };
}
