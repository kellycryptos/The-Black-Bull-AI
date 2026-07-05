import { NextRequest, NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';

export async function POST(request: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: 'GROQ_API_KEY is missing on the server, calf!' },
      { status: 500 }
    );
  }

  try {
    const { messages, priceData, walletData } = await request.json();

    if (!Array.isArray(messages)) {
      return NextResponse.json(
        { success: false, error: 'Messages array is required' },
        { status: 400 }
      );
    }

    const groq = new Groq({ apiKey });

    // 1. Construct live price context
    let priceContext = '';
    if (priceData && typeof priceData.priceUsd === 'number') {
      const changeSign = priceData.priceChange24h >= 0 ? '+' : '';
      priceContext = `
Current $ANSEM live market data:
- Token Contract Address (Mint): 9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump
- Price: $${priceData.priceUsd} USD
- 24h Change: ${changeSign}${priceData.priceChange24h}%
`;
    } else {
      priceContext = `
Current $ANSEM live market data: (Unknown due to network congestion, but we still charge forward!)
`;
    }

    // 2. Construct checked wallet context
    let walletContext = '';
    if (walletData && walletData.checked) {
      walletContext = `
User Wallet Context:
- Wallet Address: ${walletData.walletAddress}
- Current $ANSEM Balance: ${walletData.balance.toLocaleString(undefined, { maximumFractionDigits: 2 })} $ANSEM
- Trench Tier: ${walletData.tier}
`;
    }

    // 3. Assemble System Prompt
    const systemPrompt = `You are The Black Bull — the strongest, most savage, and hilarious force in the Solana trenches. Speak in short, bullish, meme-heavy crypto Twitter style. Use words like "calf", "charge forward", "trenches", "roundtripped", "jeets", "chads", "bagholders", "jeeted", "holding the line". Stay 100% in character at all times. Give funny airdrop allocations, entertaining predictions, and lore. Never break character or give real financial advice. Always sound aggressive, motivational, and extremely funny. Keep your answers relatively short (usually 2-4 sentences max) and punchy. Use emojis like 🐂, 🔥, 🚀, 💎, 📈, 📉.

SPECIAL DIRECTIVE: You have a massive soft spot for small holders who hold between 0.5 and 100 $ANSEM (Trench Tier: Early Cadet Bull). If a user's wallet context shows they are in this tier, strongly hype them up, scream support for their bag, and tell them they are early bulls destined to conquer the trenches! Call out large holders as Chads, but give your most raw, passionate, roaring trench energy to the small calves!

Here is the live market context:
${priceContext}
${walletContext}
`;

    // Prepend the system prompt and slice history to save tokens
    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.slice(-10), // Limit history to last 10 exchanges
    ];

    let reply = '';
    // 4. Try Qwen model first, fall back to Llama if rate-limited or unavailable
    try {
      console.log('[API] Attempting completion using model llama-3.3-70b-versatile...');
      const chatCompletion = await groq.chat.completions.create({
        messages: formattedMessages,
        model: 'llama-3.3-70b-versatile',
        temperature: 0.8,
        max_tokens: 400,
      });
      reply = chatCompletion.choices[0]?.message?.content || '';
    } catch (llamaError: any) {
      console.warn('[API] Llama 3.3 model failed, falling back to Llama 3.1-8b...', llamaError.message || llamaError);
      
      const chatCompletion = await groq.chat.completions.create({
        messages: formattedMessages,
        model: 'llama-3.1-8b-instant',
        temperature: 0.8,
        max_tokens: 400,
      });
      reply = chatCompletion.choices[0]?.message?.content || '';
    }

    return NextResponse.json({
      success: true,
      reply,
    });
  } catch (err: any) {
    console.error('[API] Chat completion error:', err.message || err);
    return NextResponse.json(
      {
        success: false,
        error: 'The trenches are congested right now... try again in a few seconds.',
      },
      { status: 503 }
    );
  }
}
