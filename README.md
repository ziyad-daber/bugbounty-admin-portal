# Decentralized Bug Bounty Platform

> **Status:** Live & Deployed on Arbitrum Sepolia Testnet.

A production-ready decentralized bug bounty platform built with Foundry, Next.js, and Wagmi.

This platform allows protocol organizations to create decentralized bug bounties where security researchers can securely submit encrypted vulnerabilities, get judged by appointed committees, and get paid according to strict SLAs and automated escalation paths.

## 🚀 Recent Deployed Updates & Additions

- **Arbitrum Sepolia Deployment**: Fully deployed and verified on Arbitrum Sepolia.
- **Mock Token Integrations**: Added custom ERC20 integrations (MockUSDC) with dynamic token registry UI mappings.
- **Atomic Funding Workflow**: Single-transaction logic allowing clients to instantly approve `USDC` and deploy + fund their bug bounty securely using safe ERC20 logic.
- **IPFS Submissions & Metadata**: 
  - Dynamic UI Tag management (Web3, Smart Contracts).
  - Bounty metadata stored immutably via IPFS (Pinata) with structural mapping stored directly via CIDs on the smart contract `Bounty` struct.
- **Gas Hardening**: Native L2 BaseFee micro-spike protections built directly into the wagmi transaction overrides for deterministic testnet completions.
- **Full Scope UI Engine**: Re-engineered Committee Workflow screens, dynamic dashboards using live RPC blockchain state (no backends used), and intuitive two-step Dispute actions.

## 🚀 Features

### **Smart Contracts (Foundry)**
- **Fully On-Chain Bounties**: Create bounties with configurable rewards, stakes, deadlines, and multi-sig committee sizes.
- **Secure Encrypted Submissions**: Enforces commit-reveal workflows with AAD (Additional Authenticated Data) WebCrypto encryption. Only the designated committee can decrypt the final reveal.
- **Robust Dispute Resolution**:
  - Direct committee accept/reject phase.
  - Dispute/Escalate Phase (requiring appeal bonds).
  - Secret Commit/Reveal flow for committee voting to prevent group-think & vote-withholding.
- **Sybil Resistance & Reputation System**: 
  - Tracks past interactions (Disputes Won/Lost, Rejects/Accepts).
  - Uses an exponential temporal decay function algorithm logic using half-lives natively inside the EVM.
  - Dynamically escalates stake requirements based on a user’s temporal reputation to prevent spam.
  - $O(1)$ ring-buffer rate-limiting per user per bounty to prevent gas griefing.
- **Production Grade Security**: Complete integration of CEI (Checks-Effects-Interactions) patterns, explicit insolvency checks, Reentrancy guards, and modular sub-contracts. Includes fuzz & invariant testing.

### **Frontend (Next.js + Wagmi + viem)**
- **Dynamic Dashboard**: View all loaded bounties securely fetched from the Ethereum RPC nodes.
- **Submit Portal**: Securely generate random symmetric keys locally in your browser. Encrypt payload mapping AAD bounds (binding `chainId` and `bountyId` to prevent replay attacks). Uploads encrypted ciphertexts seamlessly to IPFS using Pinata. Submits domain-separated hashes directly to the Blockchain.
- **Committee Actions**: Simple UI mapping directly to Phase 1 (Initial Review) and Phase 2 (Dispute Commit/Reveal).
- **Dispute UI**: Easily raise an appeal, force escalate when SLAs miss, and finalize distributed outcomes directly from your wallet connected provider.

---

## 🏗️ Architecture

- **`BugBountyPlatform.sol`**: Main Hub / Gateway for all state.
- **`Escrow.sol`**: Segregated internal accounting engine module to prevent reentrancy and manipulation.
- **`StakeManager.sol`**: Locks logic for user stake allocations.
- **`Reputation.sol`**: Mathematical logic & chronological updates for automated penalty and multiplier metrics using exponential decays.
- **`DisputeModule.sol`**: Committee orchestration mapping logic for sub-workflows.

---

## 🛠️ Setup & Installation

### 1. Smart Contracts
Install dependencies and build the smart contracts using Foundry:
```bash
cd contracts
forge install
forge build
forge test
```

### 2. Frontend Application
Ensure you have `Node.js` installed. Connect to your desired environment variable bindings:

Make an `.env.local` inside the `/frontend` directory:
```
NEXT_PUBLIC_PINATA_JWT=your_pinata_jwt_here
NEXT_PUBLIC_CONTRACT_ADDRESS=your_deployed_contract_on_arbitrum_sepolia
NEXT_PUBLIC_MOCK_USDC_ADDRESS=your_deployed_mockusdc_token
```

Run the standard dev process:
```bash
cd frontend
npm install
npm run dev
```
Access the dashboard locally at `http://localhost:3000`.

---

## 🧪 Testing

The contracts are battle-tested with comprehensive invariant and unit fuzzing logic directly inside of `BugBountyPlatform.t.sol`. Test flows execute:
- Max cap bounds interactions
- Math boundaries for decay calculations
- Rate limit grief mapping checks
- Direct state manipulations covering standard workflows up through Commit-Reveal distributions.

Run the test suite securely via:
```bash
cd contracts
forge test -vvv
```

---

## 🔒 Security Posture

This repository was heavily refactored resolving severe logical and arithmetic vulnerabilities including:
1. **Front-running / Relay vulnerabilities**: Resolved via AAD domain separations for encryption maps and WebCrypto bindings.
2. **Double Ledger Manipulation**: Remedied logic around transferring natively inside mapping engines out of gateway interfaces directly to Escrow vaults.
3. **Sybil & Gas Spam**: Eradicated unbounded while-loops in favor of index-assigned Ring Buffers dynamically adjusting to contract states. 

Enjoy robust decentralized security verification!
