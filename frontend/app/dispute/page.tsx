'use client'
import React, { useState } from 'react';
import { useAccount, useWriteContract } from 'wagmi';
import { BUG_BOUNTY_PLATFORM_ABI, CONTRACT_ADDRESS } from '@/services/contracts';
import { WalletConnect } from '@/components/WalletConnect';
import Link from 'next/link';

export default function DisputePage() {
    const { isConnected } = useAccount();
    const { writeContractAsync } = useWriteContract();
    
    const [bountyId, setBountyId] = useState('0');
    const [reportId, setReportId] = useState('0');
    const [status, setStatus] = useState('');

    const handleRaiseDispute = async () => {
        try {
            setStatus('Raising dispute...');
            await writeContractAsync({
                abi: BUG_BOUNTY_PLATFORM_ABI as any,
                address: CONTRACT_ADDRESS as `0x${string}`,
                functionName: 'raiseDispute',
                args: [BigInt(bountyId), BigInt(reportId)]
            });
            setStatus('Dispute raised. Bond paid.');
        } catch(e: any) {
            setStatus(`Error: ${e.message}`);
        }
    }

    const handleEscalate = async () => {
        try {
            setStatus('Escalating...');
            await writeContractAsync({
                abi: BUG_BOUNTY_PLATFORM_ABI as any,
                address: CONTRACT_ADDRESS as `0x${string}`,
                functionName: 'triggerEscalation',
                args: [BigInt(bountyId), BigInt(reportId)]
            });
            setStatus('Escalated due to SLA missed.');
        } catch(e: any) {
            setStatus(`Error: ${e.message}`);
        }
    }

    const handleResolve = async () => {
        try {
            setStatus('Resolving dispute...');
            await writeContractAsync({
                abi: BUG_BOUNTY_PLATFORM_ABI as any,
                address: CONTRACT_ADDRESS as `0x${string}`,
                functionName: 'resolveDispute',
                args: [BigInt(bountyId), BigInt(reportId)]
            });
            setStatus('Dispute resolved! Tokens distributed accordingly.');
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
                <h1 className="text-2xl font-bold">Dispute Management</h1>
                
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

                <div className="space-y-4 pt-4 border-t">
                    <button onClick={handleRaiseDispute} className="w-full bg-yellow-600 text-white px-4 py-3 rounded">Raise Dispute (Researcher - Requires Appeal Bond)</button>
                    <button onClick={handleEscalate} className="w-full bg-red-600 text-white px-4 py-3 rounded">Force Escalate (If SLA Missed)</button>
                    <button onClick={handleResolve} className="w-full bg-blue-600 text-white px-4 py-3 rounded">Finalize & Resolve Dispute (Post-Reveal)</button>
                </div>

                {status && <div className="text-sm font-semibold text-blue-800">{status}</div>}
            </main>
        </div>
    )
}
