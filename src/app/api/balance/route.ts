import { NextRequest, NextResponse } from 'next/server';
import { validateSolanaAddress, getSolanaTokenBalance } from '@/utils/solana';

const MINT_ADDRESS = '9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get('wallet');
  const xHandle = searchParams.get('x');

  if (!wallet) {
    return NextResponse.json(
      { success: false, error: 'Paste a wallet address first, calf!' },
      { status: 400 }
    );
  }

  // 1. Validate Solana Address format
  if (!validateSolanaAddress(wallet)) {
    return NextResponse.json(
      { success: false, error: 'Invalid Solana address format' },
      { status: 400 }
    );
  }

  let balance = 0;
  let source = 'rpc';

  // 2. Fetch Balance (Birdeye with RPC Fallback)
  const birdeyeApiKey = process.env.BIRDEYE_API_KEY;
  if (birdeyeApiKey) {
    try {
      console.log(`[API] Fetching balance for ${wallet} via Birdeye...`);
      const response = await fetch(
        `https://public-api.birdeye.so/v1/wallet/token_balance?wallet=${wallet.trim()}&token_address=${MINT_ADDRESS}`,
        {
          headers: {
            'X-API-KEY': birdeyeApiKey,
            'accept': 'application/json',
          },
        }
      );

      if (response.ok) {
        const payload = await response.json();
        if (payload.success && payload.data) {
          balance = parseFloat(payload.data.uiAmount || '0');
          source = 'birdeye';
        }
      } else {
        console.warn(`[API] Birdeye balance fetch failed. Status: ${response.status}. Falling back to RPC...`);
      }
    } catch (err: any) {
      console.error('[API] Birdeye balance fetch error, falling back to RPC:', err.message || err);
    }
  }

  // Fallback to Solana RPC if Birdeye was skipped or failed
  if (source === 'rpc') {
    try {
      const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
      console.log(`[API] Fetching balance for ${wallet} via public RPC (${rpcUrl})...`);
      balance = await getSolanaTokenBalance(wallet, MINT_ADDRESS, rpcUrl);
    } catch (err: any) {
      console.error('[API] Solana RPC balance fetch error:', err.message || err);
      return NextResponse.json(
        {
          success: false,
          error: 'The trenches are congested right now... try again in a few seconds.',
        },
        { status: 503 }
      );
    }
  }

  // 3. Generate humorous allocation & tier message
  let tier = 'Calf';
  let allocationAmount = 0;
  let message = '';

  const formattedBalance = balance.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  const formattedX = xHandle ? `@${xHandle.replace(/^@/, '')}` : 'anon calf';

  if (balance === 0) {
    tier = 'Trench Calf';
    allocationAmount = 69; // Funny mock allocation
    message = `No $ANSEM yet? The Bull still welcomes new calves! We simulated a baseline 69 $ANSEM airdrop allocation for ${formattedX}, but you need real weight to charge forward in the trenches!`;
  } else if (balance >= 0.5 && balance <= 100) {
    tier = 'Early Cadet Bull';
    allocationAmount = Math.floor(balance * 500); // 500x booster!
    message = `WAIT, HOLY BULL ENERGY! You hold ${formattedBalance} $ANSEM, ${formattedX}! You are the raw, pure muscle of the trenches, a true early bull in the making! Small bags build empires. We boosted your simulated allocation by 500x to ${allocationAmount.toLocaleString()} $ANSEM! Keep charging forward, future king!`;
  } else if (balance > 0 && balance < 0.5) {
    tier = 'Micro Calf';
    allocationAmount = 420;
    message = `Holding a micro weight of ${formattedBalance} $ANSEM, ${formattedX}. You're technically in the trenches, but you're just dipping your hoof in. Simulated allocation: 420 $ANSEM. Buy the dip, calf!`;
  } else if (balance > 100 && balance <= 10000) {
    tier = 'Puddle Calf';
    allocationAmount = Math.floor(balance * 0.1);
    message = `Holding a modest ${formattedBalance} $ANSEM! You are technically in the trenches, but you're sipping water from a puddle, ${formattedX}. We simulated a ${allocationAmount.toLocaleString()} $ANSEM premium airdrop. Size up to run with the bulls!`;
  } else if (balance > 10000 && balance <= 100000) {
    tier = 'Trench Survivor';
    allocationAmount = Math.floor(balance * 0.25);
    message = `Holding ${formattedBalance} $ANSEM. Respectable, ${formattedX}. You've survived the roundtripped charts and are packing actual gear. Simulated allocation: ${allocationAmount.toLocaleString()} $ANSEM. The Bull acknowledges your service.`;
  } else if (balance > 100000 && balance <= 1000000) {
    tier = 'Chad Bull';
    allocationAmount = Math.floor(balance * 0.5);
    message = `BOOM! Holding ${formattedBalance} $ANSEM. Absolute Chad Bull behavior, ${formattedX}! You've roundtripped a few times but you're still standing tall. Simulated allocation: ${allocationAmount.toLocaleString()} $ANSEM. You're charging forward!`;
  } else {
    tier = 'GIGACHAD BULL GOD';
    allocationAmount = Math.floor(balance * 1.5);
    message = `HOLY BULL ENERGY! holding ${formattedBalance} $ANSEM! You are a GIGACHAD BULL GOD, ${formattedX}! You literally feed the calves in the trenches. Simulated allocation: ${allocationAmount.toLocaleString()} $ANSEM (150% booster). The Bull bows to no one, but he nods in deep respect to you.`;
  }

  return NextResponse.json({
    success: true,
    wallet,
    xHandle: xHandle || null,
    balance,
    formattedBalance,
    tier,
    allocationAmount,
    message,
    source,
  });
}
export const dynamic = 'force-dynamic';
