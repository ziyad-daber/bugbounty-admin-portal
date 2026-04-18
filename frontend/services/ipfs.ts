// IPFS Service with Client-Side AES-256-GCM Encryption
// Uploads encrypted reports to IPFS via Pinata

import { ethers } from 'ethers';

export interface VulnerabilityReport {
  steps: string;
  impact: string;
  poc: string;
  metadata?: {
    severity?: 'critical' | 'high' | 'medium' | 'low';
    cvss?: number;
    tags?: string[];
  };
}

export interface EncryptedReport {
  ciphertext: string;
  iv: string;
  authTag: string;
  cid: string;
}

export interface SubmissionData {
  salt: string;
  cidDigest: string;
  hSteps: string;
  hImpact: string;
  hPoc: string;
}

const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT || '';

/**
 * Calculate quality score for a report (anti-spam client-side check)
 * Returns score 0-100 based on completeness
 */
export function calculateQualityScore(report: VulnerabilityReport): number {
  let score = 0;

  const stepsLength = report.steps.trim().length;
  if (stepsLength > 500) score += 35;
  else if (stepsLength > 200) score += 25;
  else if (stepsLength > 50) score += 15;
  else if (stepsLength > 0) score += 5;

  const impactLength = report.impact.trim().length;
  if (impactLength > 300) score += 35;
  else if (impactLength > 150) score += 25;
  else if (impactLength > 50) score += 15;
  else if (impactLength > 0) score += 5;

  const pocLength = report.poc.trim().length;
  if (pocLength > 400) score += 30;
  else if (pocLength > 200) score += 20;
  else if (pocLength > 50) score += 10;
  else if (pocLength > 0) score += 5;

  if (report.metadata?.severity) score += 5;
  if (report.metadata?.cvss) score += 3;
  if (report.metadata?.tags && report.metadata.tags.length > 0) score += 2;

  return Math.min(score, 100);
}

export function generateEncryptionKey(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

export async function encryptReport(
  report: VulnerabilityReport,
  key: Uint8Array,
  chainId: number,
  bountyId: number
): Promise<{ ciphertext: ArrayBuffer; iv: Uint8Array; authTag: Uint8Array }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const reportData = encoder.encode(JSON.stringify(report));

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  const aad = encoder.encode(`${chainId}:${bountyId}`);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: aad },
    cryptoKey,
    reportData
  );

  const ctArray = new Uint8Array(ciphertext);
  const authTag = ctArray.slice(-16);
  const actualCiphertext = ctArray.slice(0, -16);

  return { ciphertext: actualCiphertext.buffer, iv, authTag };
}

export async function uploadToIPFS(
  encryptedData: ArrayBuffer,
  iv: Uint8Array,
  authTag: Uint8Array
): Promise<string> {
  if (!PINATA_JWT) {
    throw new Error('Pinata JWT not configured');
  }

  const combined = new Uint8Array(iv.length + encryptedData.byteLength + authTag.length);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encryptedData), iv.length);
  combined.set(authTag, iv.length + encryptedData.byteLength);

  const blob = new Blob([combined], { type: 'application/octet-stream' });
  const formData = new FormData();
  formData.append('file', blob, 'encrypted-report.bin');

  const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${PINATA_JWT}` },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`IPFS upload failed: ${error}`);
  }

  const result = await response.json();
  return result.IpfsHash;
}

export function keccak256(data: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(data));
}

export async function prepareSubmission(
  report: VulnerabilityReport,
  bountyId: number,
  chainId: number
): Promise<{ encrypted: EncryptedReport; submission: SubmissionData; qualityScore: number }> {
  const qualityScore = calculateQualityScore(report);
  if (qualityScore < 30) {
    throw new Error(`Report quality too low (${qualityScore}/100). Provide more details.`);
  }

  const key = generateEncryptionKey();
  const { ciphertext, iv, authTag } = await encryptReport(report, key, chainId, bountyId);
  const cid = await uploadToIPFS(ciphertext, iv, authTag);

  const salt = '0x' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0')).join('');

  const hSteps = keccak256(report.steps);
  const hImpact = keccak256(report.impact);
  const hPoc = keccak256(report.poc);
  const cidDigest = keccak256(cid);

  return {
    encrypted: {
      ciphertext: Buffer.from(ciphertext).toString('base64'),
      iv: Buffer.from(iv).toString('base64'),
      authTag: Buffer.from(authTag).toString('base64'),
      cid
    },
    submission: { salt, cidDigest, hSteps, hImpact, hPoc },
    qualityScore
  };
}

export async function fetchFromIPFS(cid: string): Promise<Uint8Array> {
  const res = await fetch(`https://gateway.pinata.cloud/ipfs/${cid}`);
  if (!res.ok) throw new Error('IPFS fetch failed');
  return new Uint8Array(await res.arrayBuffer());
}

export async function decryptReport(
  encryptedData: Uint8Array,
  key: Uint8Array,
  chainId: number,
  bountyId: number
): Promise<VulnerabilityReport> {
  const iv = encryptedData.slice(0, 12);
  const authTag = encryptedData.slice(-16);
  const ciphertext = encryptedData.slice(12, -16);

  const fullCiphertext = new Uint8Array(ciphertext.length + authTag.length);
  fullCiphertext.set(ciphertext, 0);
  fullCiphertext.set(authTag, ciphertext.length);

  const cryptoKey = await crypto.subtle.importKey(
    'raw', key, { name: 'AES-GCM', length: 256 },
    false, ['decrypt']
  );

  const encoder = new TextEncoder();
  const aad = encoder.encode(`${chainId}:${bountyId}`);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv, additionalData: aad },
    cryptoKey, fullCiphertext
  );

  return JSON.parse(new TextDecoder().decode(decrypted));
}

export function keyToHex(key: Uint8Array): string {
  return '0x' + Array.from(key).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function hexToKey(hex: string): Uint8Array {
  const clean = hex.replace('0x', '');
  return new Uint8Array(clean.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
}
