import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Configures maximum duration limit for Vercel execution environment

const SOURCE_WALLET = 'GV6UUmNxz2RpKxmNAPadYKb7uQpszwqQAu3qLJxVdC52'; // Ansem's wallet
const MINT_ADDRESS = '9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump';

interface IntelRecipient {
  wallet: string;
  received: number;
  heldBefore: number;
  status: 'holding' | 'sold_some' | 'sold_all';
  stillHolds: number;
  estSoldFor: number;
}

interface CacheData {
  timestamp: number;
  data: any;
}

// Module-level in-memory cache
let memoryCache: CacheData | null = null;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes cache duration

// Fetch with hard internal timeout guard using AbortController
async function fetchWithTimeout(url: string, apiKey: string, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const res = await fetch(url, {
      headers: {
        'X-API-KEY': apiKey,
        'accept': 'application/json',
        'x-chain': 'solana',
      },
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function GET(request: NextRequest) {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return NextResponse.json({ success: true, message: 'Build phase skip' });
  }

  // 1. Serving from fresh cache if still within TTL
  if (memoryCache && Date.now() - memoryCache.timestamp < CACHE_TTL) {
    console.log('[Intel API] Serving from fresh in-memory cache');
    return NextResponse.json(memoryCache.data);
  }

  const birdeyeApiKey = process.env.BIRDEYE_API_KEY;
  if (!birdeyeApiKey) {
    return NextResponse.json(
      {
        success: false,
        error: 'Birdeye API key is missing. Please configure BIRDEYE_API_KEY in environment variables.',
      },
      { status: 500 }
    );
  }

  // 2. If a stale cache exists, we race our fetch attempt with a tight timeout (e.g. 5 seconds).
  // If the fetch takes longer, we immediately serve the stale cache to prevent Vercel execution timeout.
  // If no cache exists, we use a longer timeout (15s) to try to fetch the initial data.
  const hasStaleCache = !!memoryCache;
  const fetchTimeoutLimit = hasStaleCache ? 5000 : 15000;

  try {
    const freshData = await Promise.race([
      fetchFreshData(birdeyeApiKey),
      new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('Fetch timeout limit reached')), fetchTimeoutLimit)
      )
    ]);

    if (freshData) {
      return NextResponse.json(freshData);
    }
    throw new Error('Failed to retrieve fresh data.');
  } catch (err: any) {
    console.warn(`[Intel API] Fresh query failed or timed out (${err.message || err}).`);

    if (memoryCache) {
      console.log('[Intel API] Falling back to stale memory cache.');
      const staleData = {
        ...memoryCache.data,
        stale: true,
        lastUpdated: new Date(memoryCache.timestamp).toISOString()
      };
      return NextResponse.json(staleData);
    }

    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to retrieve on-chain distribution history from Birdeye API.',
      },
      { status: 502 }
    );
  }
}

async function fetchFreshData(birdeyeApiKey: string) {
  let currentPrice = 0.30;

  // 1. Fetch current price from Birdeye
  try {
    const priceRes = await fetchWithTimeout(
      `https://public-api.birdeye.so/v1/xtoken/price?address=${MINT_ADDRESS}`,
      birdeyeApiKey,
      4000
    );
    if (priceRes.ok) {
      const priceData = await priceRes.json();
      if (priceData.success && priceData.data?.value) {
        currentPrice = priceData.data.value;
      }
    }
  } catch (e: any) {
    console.warn('[Intel API] Price fetch timed out or failed, fallback to $0.30:', e.message || e);
  }

  // 2. Fetch current holder list + balances (Parallelized queries, capped at top 500)
  const holdersMap = new Map<string, number>();
  const pageCount = 5; // fetch top 500 holders (5 pages of 100)
  const offsets = Array.from({ length: pageCount }, (_, i) => i * 100);

  console.log('[Intel API] Parallelizing holders query...');
  const holderPromises = offsets.map(offset =>
    fetchWithTimeout(
      `https://public-api.birdeye.so/defi/v3/token/holder?address=${MINT_ADDRESS}&offset=${offset}&limit=100&ui_amount_mode=scaled`,
      birdeyeApiKey,
      6000
    )
  );

  const holderResults = await Promise.allSettled(holderPromises);

  for (let i = 0; i < holderResults.length; i++) {
    const result = holderResults[i];
    if (result.status === 'fulfilled' && result.value.ok) {
      try {
        const payload = await result.value.json();
        if (payload.success && payload.data?.items) {
          for (const item of payload.data.items) {
            if (item.owner) {
              holdersMap.set(item.owner, item.ui_amount || 0);
            }
          }
        }
      } catch (jsonErr) {
        console.warn(`[Intel API] Failed to parse holders page ${i + 1}:`, jsonErr);
      }
    } else {
      console.warn(`[Intel API] Holder page ${i + 1} request rejected or failed.`);
    }
  }

  console.log(`[Intel API] Populated ${holdersMap.size} unique holders.`);

  // 3. Fetch outbound airdrop transactions from Ansem's wallet
  let txItems: any[] = [];
  try {
    const txListRes = await fetchWithTimeout(
      `https://public-api.birdeye.so/v1/wallet/tx_list?wallet=${SOURCE_WALLET}&limit=100&ui_amount_mode=scaled`,
      birdeyeApiKey,
      6000
    );
    if (txListRes.ok) {
      const txPayload = await txListRes.json();
      if (txPayload.success && txPayload.data?.items) {
        txItems = txPayload.data.items;
      }
    }
  } catch (txErr: any) {
    console.warn('[Intel API] Failed to fetch transaction list:', txErr.message || txErr);
  }

  // Ensure we have some data before building metrics, otherwise trigger stale cache fallback
  if (holdersMap.size === 0 && txItems.length === 0) {
    throw new Error('Empty payload returned from Birdeye API endpoints');
  }

  // 4. Map transactions to group received amounts per recipient
  const recipientMap = new Map<string, { wallet: string; received: number; firstTime: number }>();

  for (const tx of txItems) {
    const timestamp = tx.timestamp || 0;
    const actions = tx.actions || [];

    for (const action of actions) {
      if (
        action.type === 'token_transfer' ||
        (action.type && action.type.includes('transfer'))
      ) {
        const info = action.info || {};
        const fromAddr = info.from || info.sender;
        const toAddr = info.to || info.receiver;
        const mintAddr = info.mint || info.token_address;
        const amount = parseFloat(info.ui_amount || info.uiAmount || info.amount || '0');

        if (
          fromAddr === SOURCE_WALLET &&
          toAddr &&
          toAddr !== SOURCE_WALLET &&
          mintAddr === MINT_ADDRESS &&
          amount > 0
        ) {
          // Filter out Raydium pool / self transfers
          if (
            toAddr === '5Q52f7tz7vrMRoxdgzM7DZ9xgf68119srf482CbdczEM' ||
            toAddr === SOURCE_WALLET
          ) {
            continue;
          }

          const existing = recipientMap.get(toAddr);
          if (existing) {
            existing.received += amount;
            if (timestamp < existing.firstTime && timestamp > 0) {
              existing.firstTime = timestamp;
            }
          } else {
            recipientMap.set(toAddr, {
              wallet: toAddr,
              received: amount,
              firstTime: timestamp
            });
          }
        }
      }
    }
  }

  const uniqueRecipients = Array.from(recipientMap.values());

  // 5. Join datasets and calculate recipient metrics
  const recipientsData: IntelRecipient[] = uniqueRecipients.map((r) => {
    const currentBalance = holdersMap.get(r.wallet) || 0;
    const received = r.received;

    let status: 'holding' | 'sold_some' | 'sold_all' = 'holding';
    const holdsThreshold = received * 0.95;
    if (currentBalance >= holdsThreshold) {
      status = 'holding';
    } else if (currentBalance > 0) {
      status = 'sold_some';
    } else {
      status = 'sold_all';
    }

    const soldAmount = Math.max(0, received - currentBalance);
    const estSoldFor = Math.round(soldAmount * currentPrice);

    return {
      wallet: r.wallet,
      received,
      heldBefore: currentBalance > received ? Math.round(currentBalance - received) : 0,
      status,
      stillHolds: currentBalance,
      estSoldFor
    };
  });

  // 6. Build holdersOverTime growth timeline from timestamps
  const holdersOverTime: { day: string; holders: number }[] = [];
  const validTimeRecipients = uniqueRecipients.filter(r => r.firstTime > 0);

  if (validTimeRecipients.length > 0) {
    validTimeRecipients.sort((a, b) => a.firstTime - b.firstTime);
    const minTime = validTimeRecipients[0].firstTime;
    const maxTime = validTimeRecipients[validTimeRecipients.length - 1].firstTime;
    const totalDuration = maxTime - minTime;

    if (totalDuration === 0) {
      holdersOverTime.push({ day: 'Day 1', holders: validTimeRecipients.length });
    } else {
      const step = totalDuration / 6;
      for (let stepIdx = 0; stepIdx <= 6; stepIdx++) {
        const thresholdTime = minTime + (step * stepIdx);
        const count = validTimeRecipients.filter(r => r.firstTime <= thresholdTime).length;
        holdersOverTime.push({
          day: `Day ${stepIdx + 1}`,
          holders: count
        });
      }
    }
  }

  const totalRecipients = recipientsData.length;
  const totalDistributed = recipientsData.reduce((acc, r) => acc + r.received, 0);
  const valueAtAirdrop = totalDistributed * 0.01;
  const valueNow = totalDistributed * currentPrice;
  const stillHoldingCount = recipientsData.filter(r => r.status === 'holding').length;
  const soldCount = recipientsData.filter(r => r.status === 'sold_all').length;

  const finalResult = {
    success: true,
    isMock: false,
    stale: false,
    recipients: recipientsData,
    totalRecipients,
    totalDistributed,
    valueAtAirdrop,
    valueNow,
    stillHoldingCount,
    soldCount,
    ...(holdersOverTime.length > 0 ? { holdersOverTime } : {}),
    lastUpdated: new Date().toISOString()
  };

  // Cache updated result
  memoryCache = {
    timestamp: Date.now(),
    data: finalResult
  };

  return finalResult;
}
