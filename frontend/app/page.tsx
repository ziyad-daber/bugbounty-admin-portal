'use client'
import { WalletConnect } from '@/components/WalletConnect';
import Link from 'next/link';
import { useReadContract } from 'wagmi';
import { BUG_BOUNTY_PLATFORM_ABI, CONTRACT_ADDRESS } from '@/services/contracts';

export default function DashboardPage() {
    const { data: bountyCount } = useReadContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: BUG_BOUNTY_PLATFORM_ABI as any,
        functionName: 'bountyCount'
    });

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10">
            <header className="w-full max-w-5xl flex justify-between items-center mb-10 px-5">
                <h1 className="text-3xl font-bold text-blue-900">Decentralized Bug Bounty</h1>
                <WalletConnect />
            </header>
            
            <main className="w-full max-w-5xl px-5 grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Bounties Section */}
                <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800">Active Bounties</h2>
                    <div className="mb-4 text-sm text-gray-500">
                        Total Bounties on Platform: {bountyCount ? bountyCount.toString() : 'Loading...'}
                    </div>
                    <div className="space-y-4">
                        <div className="p-4 border border-blue-100 bg-blue-50/30 rounded-md">
                            <h3 className="font-bold text-lg text-blue-800">Submit a Report</h3>
                            <p className="text-gray-600 text-sm mt-1">Found a vulnerability? Submit encrypted details directly to the assigned committee.</p>
                            <Link href="/submit">
                                <button className="mt-4 w-full bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition">
                                    Open Submission Form
                                </button>
                            </Link>
                        </div>
                    </div>
                </section>

                {/* Portals Section */}
                <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800">Platform Portals</h2>
                    <div className="grid grid-cols-1 gap-4">
                        <div className="p-4 border rounded-md bg-gray-50 hover:bg-green-50 transition border-green-100">
                            <h3 className="font-semibold text-green-800">Committee Panel</h3>
                            <p className="text-gray-500 text-xs mt-1">Review reports, commit, and reveal votes securely.</p>
                            <Link href="/committee" className="text-green-600 text-sm font-semibold mt-2 inline-block">Access Panel &rarr;</Link>
                        </div>
                        <div className="p-4 border rounded-md bg-gray-50 hover:bg-yellow-50 transition border-yellow-100">
                            <h3 className="font-semibold text-yellow-800">Dispute Management</h3>
                            <p className="text-gray-500 text-xs mt-1">Raise protocol-level disputes, bond appeals, and escalate SLA timeouts.</p>
                            <Link href="/dispute" className="text-yellow-600 text-sm font-semibold mt-2 inline-block">Manage Disputes &rarr;</Link>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
