import { NextResponse } from 'next/server';

const MINT_ADDRESS = '9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump';

export async function GET() {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return NextResponse.json({ success: true, priceUsd: 0.30, priceChange24h: 0, source: 'build-mock' });
  }
  const birdeyeApiKey = process.env.BIRDEYE_API_KEY;

  // Try Birdeye first if API key is provided
  if (birdeyeApiKey) {
    try {
      console.log('[API] Attempting to fetch price from Birdeye...');
      const response = await fetch(
        `https://public-api.birdeye.so/defi/v3/token/market-data?address=${MINT_ADDRESS}`,
        {
          headers: {
            'X-API-KEY': birdeyeApiKey,
            'accept': 'application/json',
            'x-chain': 'solana',
          },
          next: { revalidate: 10 }, // cache for 10 seconds
        }
      );

      if (response.ok) {
        const payload = await response.json();
        if (payload.success && payload.data) {
          const priceUsd = payload.data.price || 0;
          const priceChange24h = payload.data.priceChange24h || 0;
          return NextResponse.json({
            success: true,
            priceUsd,
            priceChange24h,
            source: 'birdeye',
          });
        }
      }
      console.warn(`[API] Birdeye response not successful. Status: ${response.status}`);
    } catch (err: any) {
      console.error('[API] Birdeye price fetch error:', err.message || err);
    }
  }

  // Fallback to DexScreener (keyless & public)
  try {
    console.log('[API] Attempting to fetch price from DexScreener...');
    const response = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${MINT_ADDRESS}`,
      {
        next: { revalidate: 10 }, // cache for 10 seconds
      }
    );

    if (!response.ok) {
      throw new Error(`DexScreener returned status ${response.status}`);
    }

    const payload = await response.json();
    const pairs = payload.pairs || [];
    
    if (pairs.length > 0) {
      // Find the pair with highest liquidity or just take the first Solana/Raydium pair
      const mainPair = pairs[0];
      const priceUsd = parseFloat(mainPair.priceUsd || '0');
      const priceChange24h = parseFloat(mainPair.priceChange?.h24 || '0');
      
      return NextResponse.json({
        success: true,
        priceUsd,
        priceChange24h,
        source: 'dexscreener',
      });
    }

    throw new Error('No pairs found for token on DexScreener');
  } catch (err: any) {
    console.error('[API] DexScreener price fetch error:', err.message || err);
    
    // If everything fails, return 503 Service Unavailable so client can show congestion state
    return NextResponse.json(
      {
        success: false,
        error: 'The trenches are congested right now... try again in a few seconds.',
      },
      { status: 503 }
    );
  }
}
export const dynamic = 'force-dynamic';
