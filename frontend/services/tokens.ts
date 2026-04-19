/**
 * Token Registry
 * Maps ERC20 addresses to symbols, names, and logos.
 */

export interface TokenInfo {
  address: `0x${string}`;
  symbol: string;
  name: string;
  logoUrl: string;
  decimals: number;
}

// Get Mock USDC from environment
const MOCK_USDC_ADDRESS = (process.env.NEXT_PUBLIC_MOCK_USDC_ADDRESS || '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d') as `0x${string}`;

export const SUPPORTED_TOKENS: TokenInfo[] = [
  {
    address: MOCK_USDC_ADDRESS,
    symbol: 'USDC',
    name: 'Mock USDC',
    logoUrl: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png', // Fallback to public URL for now
    decimals: 6,
  },
  // Add more tokens here as needed
];

export function getTokenByAddress(address: string): TokenInfo | undefined {
  return SUPPORTED_TOKENS.find(t => t.address.toLowerCase() === address.toLowerCase());
}

export function formatTokenAmount(amount: bigint | string | number, decimals: number = 6): string {
  const val = typeof amount === 'bigint' ? Number(amount) : Number(amount);
  return (val / Math.pow(10, decimals)).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}
