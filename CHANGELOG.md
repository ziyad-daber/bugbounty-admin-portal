# Admin Bounty Management: Release Summary & Code Examples

This document serves as a comprehensive overview of the newly added **Admin Portal** features. It includes structural changes, architecture decisions, and useful code snippets from the newly implemented systems.

---

## 🛡️ Route Protection: `AdminGuard.tsx`
To ensure only authenticated and authorized wallet addresses can access the administrative sections (like `/admin` and `/admin/create`), we implemented a dedicated React guard. It forces the user to connect their wallet before proceeding.

**Location**: `frontend/components/AdminGuard.tsx`
```tsx
'use client'

import React from 'react';
import { useAccount } from 'wagmi';
import { ShieldAlert } from 'lucide-react';
import { WalletConnect } from './WalletConnect';

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isConnected } = useAccount();

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center shadow-xl">
          <div className="w-16 h-16 bg-brand-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-8 h-8 text-brand-400" />
          </div>
          <h2 className="text-2xl font-bold text-white flex justify-center mb-3">
            Admin Access Required
          </h2>
          <p className="text-gray-400 mb-8 max-w-sm mx-auto">
            Please connect your wallet to view your active bounties and manage submitted reports.
          </p>
          <div className="flex justify-center">
            <WalletConnect />
          </div>
        </div>
      </div>
    );
  }

  // Render admin content if connected
  return <>{children}</>;
}
```

---

## 📜 On-Chain Bounty Creation (`page.tsx`)
We built a clean, intuitive form allowing admins to create multi-sig or single-sig managed bounties natively on-chain. This interfaces directly with Wagmi's `useWriteContract`.

**Key Integration Snippet**:
```tsx
// Using wagmi to execute the createBounty transaction on our deployed BugBountyPlatform

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { platformAbi, platformAddress } from '@/services/contracts';

// ... inside the CreateBountyComponent ...
const { writeContract, data: txHash } = useWriteContract();

const handleCreate = async (formData: any) => {
  writeContract({
    address: platformAddress,
    abi: platformAbi,
    functionName: 'createBounty',
    args: [
      formData.title,                               // string memory _title
      parseEther(formData.reward.toString()),       // uint256 _reward
      parseEther(formData.stake.toString()),        // uint256 _requiredStake
      formData.deadlineTimestamp,                   // uint256 _deadline
      formData.committeeMembers                     // address[] memory _committee
    ],
    // The value attached covers the full reward pool funded by the deployer
    value: parseEther(formData.reward.toString())
  });
};
```

---

## 🛠️ Smart Contract Adjustments / Forge Deployments

To properly connect the frontend to the local testnet, we generated Anvil scripts utilizing `forge-std`. The script auto-sources default local testnet keys.

**Location**: `contracts/script/Deploy.s.sol`
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {BugBountyPlatform} from "../src/BugBountyPlatform.sol";
import {MockUSDC} from "../src/MockUSDC.sol"; 

contract DeployScript is Script {
    function run() external {
        // Reads from WSL / terminal env variables
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address treasury = vm.envAddress("TREASURY_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);

        MockUSDC usdc = new MockUSDC(msg.sender);
        
        // Deploys the Bug Bounty core gateway architecture
        BugBountyPlatform platform = new BugBountyPlatform(treasury);

        vm.stopBroadcast();
    }
}
```

### Typical Deployment Pipeline:
*From the WSL (`ubuntu`) terminal:*
```bash
# 1. Start anvil node in one terminal
anvil

# 2. In a second terminal, inject variables and broadcast standard script
export PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
export TREASURY_ADDRESS=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
```

---

## 📊 Summary of Modified Locations:
1. `frontend/app/providers.tsx` — Added broader context boundaries.
2. `frontend/services/contracts.ts` — Hydrated the ABIs for our `viem` integrations to recognize endpoints (e.g. `createBounty`, `fetchReports`).
3. `contracts/foundry.toml` — Standardized artifact compilation output for local network debugging (`--via-ir=true`).
