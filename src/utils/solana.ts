import { PublicKey } from '@solana/web3.js';

/**
 * Validates if a string is a valid Solana wallet address.
 */
export function validateSolanaAddress(address: string): boolean {
  if (!address || address.trim() === '') return false;
  try {
    const pubkey = new PublicKey(address.trim());
    // Wallet addresses are on-curve.
    return PublicKey.isOnCurve(pubkey.toBytes());
  } catch {
    return false;
  }
}

/**
 * Queries the public Solana RPC for the balance of a specific mint address owned by a wallet.
 * Fallback to standard HTTP JSON-RPC to avoid needing third-party API keys.
 */
export async function getSolanaTokenBalance(
  walletAddress: string,
  mintAddress: string,
  rpcUrl: string = 'https://api.mainnet-beta.solana.com'
): Promise<number> {
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'token-balance-check',
      method: 'getTokenAccountsByOwner',
      params: [
        walletAddress.trim(),
        {
          mint: mintAddress.trim(),
        },
        {
          encoding: 'jsonParsed',
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Solana RPC query failed with status: ${response.status}`);
  }

  const payload = await response.json();
  if (payload.error) {
    throw new Error(`Solana RPC error: ${payload.error.message}`);
  }

  const value = payload.result?.value;
  if (!Array.isArray(value) || value.length === 0) {
    // If no token account exists for this mint, the owner holds 0 tokens.
    return 0;
  }

  let totalBalance = 0;
  for (const item of value) {
    const tokenAmount = item.account?.data?.parsed?.info?.tokenAmount;
    if (tokenAmount) {
      const amount = parseFloat(tokenAmount.uiAmountString || '0');
      totalBalance += amount;
    }
  }

  return totalBalance;
}
