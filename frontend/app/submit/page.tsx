'use client'

import React, { useState } from 'react';
import { useAccount, useWriteContract, useChainId } from 'wagmi';
import { generateKey, encryptData, exportKey } from '@/services/encryption';
import { uploadToIPFS } from '@/services/ipfs';
import { BUG_BOUNTY_PLATFORM_ABI, CONTRACT_ADDRESS } from '@/services/contracts';
import { ethers } from 'ethers';
import { WalletConnect } from '@/components/WalletConnect';
import Link from 'next/link';

export default function SubmitReportPage() {
    const { isConnected } = useAccount();
    const chainId = useChainId();
    const { writeContractAsync } = useWriteContract();
    
    const [bountyIdStr, setBountyIdStr] = useState('0');
    const [title, setTitle] = useState('');
    const [steps, setSteps] = useState('');
    const [impact, setImpact] = useState('');
    const [poc, setPoc] = useState('');
    
    const [status, setStatus] = useState('');
    const [savedKey, setSavedKey] = useState('');
    const [hasSavedKey, setHasSavedKey] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isConnected) {
            alert("Please connect your wallet first");
            return;
        }

        if (!hasSavedKey) {
            alert("You must securely save your decryption key and check the box to proceed.");
            return;
        }

        if (steps.length < 50 || impact.length < 50 || poc.length < 50) {
            alert("Quality Control Failed: Content too short. Please provide rigorous detail.");
            return;
        }

        try {
            setStatus('Generating encryption keys...');
            const key = await generateKey();
            const exportedRawKey = await exportKey(key);
            setSavedKey(exportedRawKey);

            setStatus('Encrypting report locally...');
            const payload = JSON.stringify({ title, steps, impact, poc });
            const bountyId = parseInt(bountyIdStr);

            // Using AAD (chainId, bountyId)
            const { ciphertext, iv } = await encryptData(key, payload, chainId, bountyId);

            setStatus('Uploading payload to IPFS (Pinata)...');
            const ipfsData = {
                v: "1.0",
                ciphertext,
                iv,
            };
            
            const cid = await uploadToIPFS(ipfsData);

            setStatus('Awaiting wallet signature for on-chain submission...');
            
            const hSteps = ethers.keccak256(ethers.toUtf8Bytes(steps));
            const hImpact = ethers.keccak256(ethers.toUtf8Bytes(impact));
            const hPoc = ethers.keccak256(ethers.toUtf8Bytes(poc));
            const cidDigest = ethers.keccak256(ethers.toUtf8Bytes(cid));

            const saltBytes = window.crypto.getRandomValues(new Uint8Array(32));
            const salt = ethers.hexlify(saltBytes);

            await writeContractAsync({
                abi: BUG_BOUNTY_PLATFORM_ABI as any,
                address: CONTRACT_ADDRESS as `0x${string}`,
                functionName: 'submitReport',
                args: [
                    BigInt(bountyId),
                    salt as `0x${string}`,
                    cidDigest as `0x${string}`,
                    hSteps as `0x${string}`,
                    hImpact as `0x${string}`,
                    hPoc as `0x${string}`
                ],
            });

            setStatus('Success! Report submitted securely. Your stake has been locked.');
            
        } catch (error: any) {
            console.error(error);
            setStatus(`Transaction failed: ${error.message || 'Unknown error'}`);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10">
            <header className="w-full max-w-2xl flex justify-between items-center mb-6 px-5">
                <Link href="/" className="text-blue-600 hover:text-blue-800 text-sm font-semibold">
                    &larr; Back to Dashboard
                </Link>
                <WalletConnect />
            </header>

            <main className="w-full max-w-2xl px-5 bg-white p-8 rounded-lg shadow border border-gray-100">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">Submit Vulnerability Report</h1>
                
                {savedKey && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md text-sm text-green-800">
                        <strong className="block mb-1">Save your decryption key securely!</strong>
                        <code className="break-all">{savedKey}</code>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Target Bounty ID</label>
                        <input type="number" value={bountyIdStr} onChange={e => setBountyIdStr(e.target.value)} required min="0" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:border-blue-500 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Vulnerability Title</label>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:border-blue-500 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Steps to Reproduce</label>
                        <textarea value={steps} onChange={e => setSteps(e.target.value)} required rows={4} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:border-blue-500 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Impact</label>
                        <textarea value={impact} onChange={e => setImpact(e.target.value)} required rows={4} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:border-blue-500 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Proof of Concept (PoC)</label>
                        <textarea value={poc} onChange={e => setPoc(e.target.value)} required rows={4} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border font-mono text-sm focus:border-blue-500 focus:ring-blue-500" />
                    </div>
                    
                    <div className="flex items-start mt-4">
                        <div className="flex items-center h-5">
                            <input id="key-saved" type="checkbox" checked={hasSavedKey} onChange={(e) => setHasSavedKey(e.target.checked)} className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded" />
                        </div>
                        <div className="ml-3 text-sm">
                            <label htmlFor="key-saved" className="font-medium text-gray-700">I confirm that I will securely store my decryption key (generated upon submission)</label>
                            <p className="text-gray-500 text-xs mt-1">Losing this key means the committee cannot review your report and you will forfeit your stake and bounty reward.</p>
                        </div>
                    </div>

                    <div className="pt-4 border-t">
                        <button type="submit" disabled={!isConnected || !hasSavedKey} className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${(isConnected && hasSavedKey) ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'}`}>
                            {isConnected ? 'Encrypt & Submit Report (Dynamic Stake Required)' : 'Connect Wallet First'}
                        </button>
                    </div>
                    
                    {status && (
                        <div className={`mt-4 text-center text-sm font-medium ${status.includes('Success') ? 'text-green-600' : 'text-blue-600'}`}>
                            {status}
                        </div>
                    )}
                </form>
            </main>
        </div>
    );
}
