'use client'
import React, { useState } from 'react';
import { useAccount, useWriteContract, useReadContract, useReadContracts, useChainId } from 'wagmi';
import { erc20Abi } from 'viem';
import { generateKey, encryptData, exportKey } from '@/services/encryption';
import { uploadToIPFS } from '@/services/ipfs';
import { BUG_BOUNTY_PLATFORM_ABI, CONTRACT_ADDRESS } from '@/services/contracts';
import { ethers } from 'ethers';
import { Lock, Upload, Send, CheckCircle, Shield, AlertCircle, Key, Target } from 'lucide-react';

const steps = [
  { icon: Lock, label: 'Encrypt' },
  { icon: Upload, label: 'Upload IPFS' },
  { icon: Send, label: 'Submit On-Chain' },
];

export default function SubmitReportPage() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { writeContractAsync } = useWriteContract();

  const { data: bountyCountStr } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: BUG_BOUNTY_PLATFORM_ABI as any,
    functionName: 'bountyCount'
  });
  
  const bountyCalls = Array.from({ length: Number(bountyCountStr || 0) }).map((_, i) => ({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: BUG_BOUNTY_PLATFORM_ABI as any,
    functionName: 'getBountyCore',
    args: [i],
  }));
  
  const { data: activeBountiesData } = useReadContracts({ contracts: bountyCalls });
  const activeBounties = activeBountiesData
    ?.map((res, i) => res.status === 'success' && res.result ? { id: i, core: res.result as any[] } : null)
    .filter(b => b !== null) || [];

  const [bountyIdStr, setBountyIdStr] = useState('0');
  const [title, setTitle] = useState('');
  const [stepsText, setStepsText] = useState('');
  const [impact, setImpact] = useState('');
  const [poc, setPoc] = useState('');

  const { data: bountyCore } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: BUG_BOUNTY_PLATFORM_ABI as any,
    functionName: 'getBountyCore',
    args: [parseInt(bountyIdStr || '0')]
  });

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setPdfFile(null);
      setPdfBase64('');
      return;
    }
    if (file.type !== 'application/pdf') {
      alert('Only PDF files are allowed!');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds the 5MB limit.');
      return;
    }
    setPdfFile(file);
    const reader = new FileReader();
    reader.onload = (event) => setPdfBase64(event.target?.result as string);
    reader.readAsDataURL(file);
  };

  const [status, setStatus] = useState('');
  const [savedKey, setSavedKey] = useState('');
  const [hasSavedKey, setHasSavedKey] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [completed, setCompleted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) return alert('Please connect your wallet first');
    if (!hasSavedKey) return alert('You must check the key confirmation box.');
    if (stepsText.length < 50 || impact.length < 50 || poc.length < 50) return alert('Content too short. Provide rigorous detail.');
    if (!bountyCore) return alert('Could not fetch bounty details. Is the ID correct?');

    try {
      setCurrentStep(0);
      setStatus('Generating encryption keys...');
      const key = await generateKey();
      const exportedRawKey = await exportKey(key);
      setSavedKey(exportedRawKey);

      setStatus('Encrypting report locally...');
      const payload = JSON.stringify({ title, steps: stepsText, impact, poc, pdfAttachment: pdfBase64 });
      const bountyId = parseInt(bountyIdStr);
      const { ciphertext, iv } = await encryptData(key, payload, 421614, bountyId);

      setCurrentStep(1);
      setStatus('Uploading encrypted payload to IPFS...');
      const cid = await uploadToIPFS({ v: '1.0', ciphertext, iv });

      setCurrentStep(2);

      const tokenAddress = (bountyCore as any)[1];
      const stakeAmount = (bountyCore as any)[3];

      if (BigInt(stakeAmount) > 0n) {
        setStatus('Approving stake tokens...');
        await writeContractAsync({
          abi: erc20Abi,
          address: tokenAddress as `0x${string}`,
          functionName: 'approve',
          args: [CONTRACT_ADDRESS as `0x${string}`, BigInt(stakeAmount)],
          chainId: 421614,
          maxFeePerGas: BigInt(50000000000),
          maxPriorityFeePerGas: BigInt(1000000000),
        });
      }

      setStatus('Awaiting wallet signature for submission...');
      const hSteps = ethers.keccak256(ethers.toUtf8Bytes(stepsText));
      const hImpact = ethers.keccak256(ethers.toUtf8Bytes(impact));
      const hPoc = ethers.keccak256(ethers.toUtf8Bytes(poc));
      const cidDigest = ethers.keccak256(ethers.toUtf8Bytes(cid));
      const saltBytes = window.crypto.getRandomValues(new Uint8Array(32));
      const salt = ethers.hexlify(saltBytes);

      await writeContractAsync({
        abi: BUG_BOUNTY_PLATFORM_ABI as any,
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: 'submitReport',
        args: [BigInt(bountyId), salt as `0x${string}`, cidDigest as `0x${string}`, hSteps as `0x${string}`, hImpact as `0x${string}`, hPoc as `0x${string}`],
        chainId: 421614,
        maxFeePerGas: BigInt(50000000000),
        maxPriorityFeePerGas: BigInt(1000000000),
      });

      setCurrentStep(3);
      setCompleted(true);
      setStatus('Report submitted successfully!');
    } catch (error: any) {
      setStatus(`Failed: ${error.message || 'Unknown error'}`);
    }
  };

  return (
    <div className="animate-fade-in max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex p-3 rounded-2xl bg-brand-50 dark:bg-brand-500/10 mb-4">
          <Shield className="w-8 h-8 text-brand-600 dark:text-brand-400" />
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Submit Vulnerability Report</h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">Your report is encrypted client-side before leaving your browser.</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {steps.map((s, i) => (
          <React.Fragment key={i}>
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
              currentStep > i ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : currentStep === i ? 'bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 animate-pulse-glow'
              : 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-gray-500'}`}>
              {currentStep > i ? <CheckCircle className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < steps.length - 1 && <div className={`w-8 h-0.5 rounded ${currentStep > i ? 'bg-emerald-400' : 'bg-gray-200 dark:bg-slate-700'}`} />}
          </React.Fragment>
        ))}
      </div>

      {/* Key Display */}
      {savedKey && (
        <div className="glass-card p-4 mb-6 border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/5">
          <div className="flex items-start gap-3">
            <Key className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-emerald-800 dark:text-emerald-300 text-sm">Decryption Key — Save This!</p>
              <code className="text-xs break-all text-emerald-700 dark:text-emerald-400 mt-1 block">{savedKey}</code>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="glass-card p-6 sm:p-8 space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Select Target Bounty</label>
          {activeBounties.length === 0 ? (
            <div className="p-4 border border-dashed border-gray-300 dark:border-slate-700 rounded-xl text-center text-sm text-gray-500">
              Loading active bounties...
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
              {activeBounties.map(b => {
                const isSelected = bountyIdStr === String(b.id);
                return (
                  <div
                    key={b.id!}
                    onClick={() => setBountyIdStr(String(b.id))}
                    className={`p-4 rounded-xl cursor-pointer border transition-all duration-200 flex items-start gap-4 ${
                      isSelected 
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10 shadow-sm shadow-brand-500/20 ring-1 ring-brand-500' 
                        : 'border-gray-200 dark:border-slate-700 hover:border-brand-300 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className={`p-2 rounded-lg flex-shrink-0 ${isSelected ? 'bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400' : 'bg-gray-100 dark:bg-slate-800 text-gray-400'}`}>
                       <Target className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={`font-bold ${isSelected ? 'text-brand-700 dark:text-brand-300' : 'text-gray-900 dark:text-white'}`}>
                        Bounty #{b.id}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 font-mono truncate" title={String(b.core![1])}>
                        {String(b.core![1]).slice(0, 10)}...{String(b.core![1]).slice(-8)}
                      </div>
                    </div>
                    {isSelected && <CheckCircle className="w-5 h-5 text-brand-500 ml-auto flex-shrink-0" />}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Vulnerability Title</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} required placeholder="e.g. Reentrancy in withdraw()" className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Steps to Reproduce</label>
          <textarea value={stepsText} onChange={e => setStepsText(e.target.value)} required rows={4} placeholder="Detailed steps to reproduce the vulnerability..." className="input-field resize-none" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Impact Assessment</label>
          <textarea value={impact} onChange={e => setImpact(e.target.value)} required rows={3} placeholder="Describe the severity and potential damage..." className="input-field resize-none" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Proof of Concept</label>
          <textarea value={poc} onChange={e => setPoc(e.target.value)} required rows={4} placeholder="Working exploit code or proof..." className="input-field resize-none font-mono text-sm" />
        </div>
        
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Attachment (PDF, Max 5MB)</label>
          <input 
            type="file" 
            accept="application/pdf"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2.5 file:px-4
              file:rounded-xl file:border border-gray-200 dark:border-slate-800
              file:text-sm file:font-semibold
              file:bg-brand-50 file:text-brand-700
              hover:file:bg-brand-100 transition-colors
              dark:file:bg-brand-500/10 dark:file:text-brand-400 dark:hover:file:bg-brand-500/20"
          />
        </div>

        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20">
          <input id="key-saved" type="checkbox" checked={hasSavedKey} onChange={e => setHasSavedKey(e.target.checked)} className="mt-1 w-4 h-4 rounded text-brand-600 focus:ring-brand-500" />
          <label htmlFor="key-saved" className="text-sm">
            <span className="font-semibold text-amber-800 dark:text-amber-300">I will securely store my decryption key.</span>
            <span className="block text-amber-700/70 dark:text-amber-400/70 text-xs mt-0.5">Losing it means the committee cannot decrypt your report — your stake will be forfeited.</span>
          </label>
        </div>

        <button type="submit" disabled={!isConnected || !hasSavedKey || completed} className="btn-primary w-full text-base">
          {!isConnected ? 'Connect Wallet to Submit' : completed ? '✓ Report Submitted' : 'Encrypt & Submit Report'}
        </button>

        {status && (
          <div className={`flex items-center gap-2 p-3 rounded-xl text-sm font-medium ${completed
            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
            : status.includes('Failed') ? 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300'
            : 'bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300'}`}>
            {completed ? <CheckCircle className="w-4 h-4" /> : status.includes('Failed') ? <AlertCircle className="w-4 h-4" /> : <div className="w-4 h-4 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />}
            {status}
          </div>
        )}
      </form>
    </div>
  );
}
