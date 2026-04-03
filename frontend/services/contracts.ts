import { ethers } from 'ethers';

export const BUG_BOUNTY_PLATFORM_ABI = [
  {
    "inputs": [
      {"name": "token", "type": "address"},
      {"name": "rewardAmount", "type": "uint256"},
      {"name": "stakeAmount", "type": "uint256"},
      {"name": "appealBond", "type": "uint256"},
      {"name": "submissionDeadline", "type": "uint64"},
      {"name": "reviewSLA", "type": "uint32"},
      {"name": "rateLimitWindow", "type": "uint32"},
      {"name": "stakeEscalationBps", "type": "uint16"},
      {"name": "maxInWindow", "type": "uint8"},
      {"name": "maxActiveSubmissions", "type": "uint8"},
      {"name": "committee", "type": "address[]"},
      {"name": "thresholdK", "type": "uint8"},
      {"name": "disputeCommitSeconds", "type": "uint32"},
      {"name": "disputeRevealSeconds", "type": "uint32"}
    ],
    "name": "createBounty",
    "outputs": [{"name": "bountyId", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "bountyId", "type": "uint256"},
      {"name": "amount", "type": "uint256"}
    ],
    "name": "fundBounty",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "bountyId", "type": "uint256"},
      {"name": "salt", "type": "bytes32"},
      {"name": "cidDigest", "type": "bytes32"},
      {"name": "hSteps", "type": "bytes32"},
      {"name": "hImpact", "type": "bytes32"},
      {"name": "hPoc", "type": "bytes32"}
    ],
    "name": "submitReport",
    "outputs": [{"name": "reportId", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "bountyId", "type": "uint256"},
      {"name": "reportId", "type": "uint256"},
      {"name": "accepted", "type": "bool"}
    ],
    "name": "voteReport",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "bountyId", "type": "uint256"},
      {"name": "reportId", "type": "uint256"}
    ],
    "name": "raiseDispute",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "bountyId", "type": "uint256"},
      {"name": "reportId", "type": "uint256"}
    ],
    "name": "triggerEscalation",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "bountyId", "type": "uint256"},
      {"name": "reportId", "type": "uint256"},
      {"name": "commitHash", "type": "bytes32"}
    ],
    "name": "commitVote",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "bountyId", "type": "uint256"},
      {"name": "reportId", "type": "uint256"},
      {"name": "vote", "type": "bool"},
      {"name": "salt", "type": "string"}
    ],
    "name": "revealVote",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "bountyId", "type": "uint256"},
      {"name": "reportId", "type": "uint256"}
    ],
    "name": "resolveDispute",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "bountyId", "type": "uint256"},
      {"name": "reportId", "type": "uint256"}
    ],
    "name": "finalizeReport",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "bountyId", "type": "uint256"}],
    "name": "getBountyCore",
    "outputs": [
      {"name": "owner", "type": "address"},
      {"name": "token", "type": "address"},
      {"name": "rewardAmount", "type": "uint256"},
      {"name": "stakeAmount", "type": "uint256"},
      {"name": "appealBond", "type": "uint256"},
      {"name": "submissionDeadline", "type": "uint64"},
      {"name": "reviewSLA", "type": "uint32"},
      {"name": "rateLimitWindow", "type": "uint32"},
      {"name": "stakeEscalationBps", "type": "uint16"},
      {"name": "maxInWindow", "type": "uint8"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "bountyId", "type": "uint256"}],
    "name": "getBountyState",
    "outputs": [
      {"name": "maxActiveSubmissions", "type": "uint8"},
      {"name": "committeeSize", "type": "uint8"},
      {"name": "thresholdK", "type": "uint8"},
      {"name": "disputeCommitSeconds", "type": "uint32"},
      {"name": "disputeRevealSeconds", "type": "uint32"},
      {"name": "active", "type": "bool"},
      {"name": "escrowBalance", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "bountyId", "type": "uint256"}],
    "name": "reportCount",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "bountyId", "type": "uint256"},
      {"name": "reportId", "type": "uint256"}
    ],
    "name": "reports",
    "outputs": [
      {"name": "researcher", "type": "address"},
      {"name": "submittedAt", "type": "uint64"},
      {"name": "paid", "type": "bool"},
      {"name": "status", "type": "uint8"},
      {"name": "acceptVotes", "type": "uint8"},
      {"name": "rejectVotes", "type": "uint8"},
      {"name": "commitHash", "type": "bytes32"},
      {"name": "cidDigest", "type": "bytes32"},
      {"name": "hSteps", "type": "bytes32"},
      {"name": "hImpact", "type": "bytes32"},
      {"name": "hPoc", "type": "bytes32"},
      {"name": "stakeAmount", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "bountyCount",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "bountyId", "type": "uint256"},
      {"name": "reportId", "type": "uint256"},
      {"name": "user", "type": "address"}
    ],
    "name": "hasVoted",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "type": "event",
    "name": "ReportCommitted",
    "inputs": [
      {"indexed": true, "name": "bountyId", "type": "uint256"},
      {"indexed": true, "name": "reportId", "type": "uint256"},
      {"indexed": true, "name": "researcher", "type": "address"},
      {"indexed": false, "name": "commitHash", "type": "bytes32"},
      {"indexed": false, "name": "cidDigest", "type": "bytes32"},
      {"indexed": false, "name": "hSteps", "type": "bytes32"},
      {"indexed": false, "name": "hImpact", "type": "bytes32"},
      {"indexed": false, "name": "hPoc", "type": "bytes32"},
      {"indexed": false, "name": "stakeAmount", "type": "uint256"}
    ],
    "anonymous": false
  }
] as const;

export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512") as `0x${string}`;

export async function getContract(signer: ethers.Signer | ethers.Provider) {
    return new ethers.Contract(CONTRACT_ADDRESS, BUG_BOUNTY_PLATFORM_ABI, signer);
}

export async function submitReport(
    signer: ethers.Signer,
    bountyId: number | bigint,
    salt: string,
    cidDigest: string,
    hSteps: string,
    hImpact: string,
    hPoc: string
) {
    const contract = await getContract(signer);
    const tx = await contract.submitReport(bountyId, salt, cidDigest, hSteps, hImpact, hPoc);
    return await tx.wait();
}
