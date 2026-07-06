import { NextRequest, NextResponse } from 'next/server';

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

export async function GET(request: NextRequest) {
  // Check if cache is still fresh
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

  let apiCallsCount = 0;

  try {
    // 1. Fetch current price from Birdeye
    let currentPrice = 0.30;
    try {
      console.log('[Intel API] Fetching current price from Birdeye...');
      const priceRes = await fetch(
        `https://public-api.birdeye.so/v1/xtoken/price?address=${MINT_ADDRESS}`,
        {
          headers: {
            'X-API-KEY': birdeyeApiKey,
            'accept': 'application/json',
            'x-chain': 'solana',
          },
        }
      );
      apiCallsCount++;
      if (priceRes.ok) {
        const priceData = await priceRes.json();
        if (priceData.success && priceData.data?.value) {
          currentPrice = priceData.data.value;
        }
      }
    } catch (e: any) {
      console.warn('[Intel API] Price fetch error, fallback to $0.30:', e.message || e);
    }

    // 2. Fetch current holder list + balances
    console.log('[Intel API] Fetching holder list from Birdeye...');
    const holdersMap = new Map<string, number>();
    
    // Paginate to fetch top 1,500 holders (15 pages of 100)
    for (let offset = 0; offset < 1500; offset += 100) {
      const holdersRes = await fetch(
        `https://public-api.birdeye.so/defi/v3/token/holder?address=${MINT_ADDRESS}&offset=${offset}&limit=100&ui_amount_mode=scaled`,
        {
          headers: {
            'X-API-KEY': birdeyeApiKey,
            'accept': 'application/json',
            'x-chain': 'solana',
          },
        }
      );
      apiCallsCount++;
      
      if (!holdersRes.ok) {
        throw new Error(`Birdeye Token Holder API returned status ${holdersRes.status}`);
      }
      
      const payload = await holdersRes.json();
      if (!payload.success || !payload.data?.items) {
        break;
      }
      
      const items = payload.data.items;
      if (items.length === 0) {
        break;
      }
      
      for (const item of items) {
        if (item.owner) {
          holdersMap.set(item.owner, item.ui_amount || 0);
        }
      }
      
      if (items.length < 100) {
        break;
      }
    }
    
    console.log(`[Intel API] Loaded ${holdersMap.size} unique holders from Birdeye.`);

    // 3. Fetch outbound airdrop transactions from Ansem's wallet
    console.log('[Intel API] Fetching wallet tx history from Birdeye (Beta)...');
    
    // Note: /v1/wallet/tx_list is in Beta. Wrap defensively.
    const txListRes = await fetch(
      `https://public-api.birdeye.so/v1/wallet/tx_list?wallet=${SOURCE_WALLET}&limit=100&ui_amount_mode=scaled`,
      {
        headers: {
          'X-API-KEY': birdeyeApiKey,
          'accept': 'application/json',
          'x-chain': 'solana',
        },
      }
    );
    apiCallsCount++;

    if (!txListRes.ok) {
      if (txListRes.status === 401) {
        throw new Error('Birdeye transaction history API returned 401: API key lacks permission to access Beta endpoints.');
      }
      throw new Error(`Birdeye Transaction History API returned status ${txListRes.status}`);
    }

    const txPayload = await txListRes.json();
    if (!txPayload.success || !txPayload.data?.items) {
      throw new Error('Birdeye Transaction History API returned unsuccessful or empty payload.');
    }

    const txItems = txPayload.data.items;
    console.log(`[Intel API] Retrieved ${txItems.length} transactions from Birdeye. Total Birdeye API calls in this cycle: ${apiCallsCount}`);

    // Map to group and accumulate received amounts per recipient wallet
    // We also track the first block time to compute timeline growth
    const recipientMap = new Map<string, { wallet: string; received: number; firstTime: number }>();

    for (const tx of txItems) {
      const timestamp = tx.timestamp || 0;
      const actions = tx.actions || [];

      for (const action of actions) {
        // We filter for SPL token transfers of the target mint from the source wallet
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
            // Exclude common liquidity pool / AMM / system addresses
            if (
              toAddr === '5Q52f7tz7vrMRoxdgzM7DZ9xgf68119srf482CbdczEM' || // Raydium Pool
              toAddr === 'GV6UUmNxz2RpKxmNAPadYKb7uQpszwqQAu3qLJxVdC52' // Ansem itself
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
    console.log(`[Intel API] Processed ${uniqueRecipients.length} unique recipient wallets from transaction log.`);

    // 4. Join datasets
    const recipientsData: IntelRecipient[] = uniqueRecipients.map((r) => {
      // Look up current balance in holder list. If not found in top holder list, set to 0.
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
      // Approximation using current price, since historical price isn't cheaply retrievable
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

    // 5. Build holdersOverTime growth timeline if timestamps are present and valid
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

    // Cache the result
    memoryCache = {
      timestamp: Date.now(),
      data: finalResult
    };

    return NextResponse.json(finalResult);
  } catch (err: any) {
    console.error('[Intel API] Birdeye fetch failed:', err.message || err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to retrieve on-chain distribution history from Birdeye API.',
      },
      { status: 502 }
    );
  }
}

export const dynamic = 'force-dynamic';
