'use client'
import React, { useState } from 'react';
import { useAccount, useWriteContract } from 'wagmi';
import { BUG_BOUNTY_PLATFORM_ABI, CONTRACT_ADDRESS } from '@/services/contracts';
import { WalletConnect } from '@/components/WalletConnect';
import Link from 'next/link';
import { ethers } from 'ethers';

export default function CommitteePage() {
    const { isConnected } = useAccount();
    const { writeContractAsync } = useWriteContract();
    const [bountyId, setBountyId] = useState('0');
    const [reportId, setReportId] = useState('0');
    const [salt, setSalt] = useState('');
    const [status, setStatus] = useState('');

    const handleVote = async (accepted: boolean) => {
        try {
            setStatus('Submitting vote...');
            await writeContractAsync({
                abi: BUG_BOUNTY_PLATFORM_ABI as any,
                address: CONTRACT_ADDRESS as `0x${string}`,
                functionName: 'voteReport',
                args: [BigInt(bountyId), BigInt(reportId), accepted]
            });
            setStatus('Vote submitted successfully');
        } catch(e: any) {
            setStatus(`Error: ${e.message}`);
        }
    }

    const handleCommit = async (accepted: boolean) => {
        try {
            if(!salt) return alert("Please enter a salt for the commit");
            setStatus('Committing vote for dispute...');
            // commitHash = keccak256(abi.encodePacked(vote, salt))
            const encoded = ethers.solidityPacked(['bool', 'string'], [accepted, salt]);
            const commitHash = ethers.keccak256(encoded);

            await writeContractAsync({
                abi: BUG_BOUNTY_PLATFORM_ABI as any,
                address: CONTRACT_ADDRESS as `0x${string}`,
                functionName: 'commitVote',
                args: [BigInt(bountyId), BigInt(reportId), commitHash as `0x${string}`]
            });
            setStatus('Vote committed successfully');
        } catch(e: any) {
            setStatus(`Error: ${e.message}`);
        }
    }

    const handleReveal = async (accepted: boolean) => {
        try {
            if(!salt) return alert("Please enter a salt for the reveal");
            setStatus('Revealing vote...');
            await writeContractAsync({
                abi: BUG_BOUNTY_PLATFORM_ABI as any,
                address: CONTRACT_ADDRESS as `0x${string}`,
                functionName: 'revealVote',
                args: [BigInt(bountyId), BigInt(reportId), accepted, salt]
            });
            setStatus('Vote revealed successfully');
        } catch(e: any) {
            setStatus(`Error: ${e.message}`);
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10">
            <header className="w-full max-w-2xl flex justify-between items-center mb-6 px-5">
                <Link href="/" className="text-blue-600 hover:text-blue-800 text-sm font-semibold">&larr; Back</Link>
                <WalletConnect />
            </header>
            <main className="w-full max-w-2xl px-5 bg-white p-8 rounded-lg shadow border border-gray-100 space-y-6">
                <h1 className="text-2xl font-bold">Committee Action Panel</h1>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label>Bounty ID</label>
                        <input type="number" value={bountyId} onChange={e=>setBountyId(e.target.value)} className="w-full border p-2 rounded" />
                    </div>
                    <div>
                        <label>Report ID</label>
                        <input type="number" value={reportId} onChange={e=>setReportId(e.target.value)} className="w-full border p-2 rounded" />
                    </div>
                </div>
                
                <div className="p-4 border rounded bg-blue-50">
                    <h2 className="font-semibold mb-2">Phase 1: Initial Review</h2>
                    <div className="flex gap-4">
                        <button onClick={() => handleVote(true)} className="bg-green-600 text-white px-4 py-2 rounded">Accept</button>
                        <button onClick={() => handleVote(false)} className="bg-red-600 text-white px-4 py-2 rounded">Reject</button>
                    </div>
                </div>

                <div className="p-4 border rounded bg-yellow-50">
                    <h2 className="font-semibold mb-2">Phase 2: Dispute (Commit/Reveal)</h2>
                    <input type="text" placeholder="Secret Salt (required)" value={salt} onChange={e=>setSalt(e.target.value)} className="w-full border p-2 rounded mb-4" />
                    
                    <div className="flex gap-4 mb-4">
                        <button onClick={() => handleCommit(true)} className="bg-green-700 text-white px-4 py-2 rounded">Commit Accept</button>
                        <button onClick={() => handleCommit(false)} className="bg-red-700 text-white px-4 py-2 rounded">Commit Reject</button>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={() => handleReveal(true)} className="bg-green-500 text-white px-4 py-2 rounded">Reveal Accept</button>
                        <button onClick={() => handleReveal(false)} className="bg-red-500 text-white px-4 py-2 rounded">Reveal Reject</button>
                    </div>
                </div>
                
                {status && <div className="text-sm font-semibold text-blue-800">{status}</div>}
            </main>
        </div>
    )
}
