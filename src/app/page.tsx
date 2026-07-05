'use client';

import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Send,
  Coins,
  Twitter,
  Wallet,
  Flame,
  Zap,
  Skull,
  BookOpen,
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
  Download,
  Share2,
} from 'lucide-react';

interface PriceData {
  priceUsd: number;
  priceChange24h: number;
  source: string;
}

interface BalanceData {
  success: boolean;
  wallet: string;
  xHandle: string | null;
  balance: number;
  formattedBalance: string;
  tier: string;
  allocationAmount: number;
  message: string;
  source: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function Home() {
  // Input fields
  const [walletInput, setWalletInput] = useState('');
  const [xInput, setXInput] = useState('');

  // Live Price State
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);

  // Checker State
  const [balanceData, setBalanceData] = useState<BalanceData | null>(null);
  const [checkerLoading, setCheckerLoading] = useState(false);
  const [checkerError, setCheckerError] = useState<string | null>(null);

  // Card Generation State
  const [generatingCard, setGeneratingCard] = useState(false);

  // Chat State
  const [chatMessages, setChatMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        "LISTEN UP, CALF! 🐂 I am The Black Bull, and I run these Solana trenches. Paste your wallet address above to check your $ANSEM weight, claim your simulated allocation, and let's see if you're a jeet or a certified Chad! Ask me anything, or hit the buttons below to charge forward!",
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Auto-scroll ref
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 1. Fetch live token price on mount
  useEffect(() => {
    fetchPrice();
    const interval = setInterval(fetchPrice, 30000);
    return () => clearInterval(interval);
  }, []);

  // 2. Auto-scroll chat to bottom when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  // Fetch token price function
  const fetchPrice = async () => {
    setPriceLoading(true);
    setPriceError(null);
    try {
      const res = await fetch('/api/price');
      if (!res.ok) {
        throw new Error('Trenches congested...');
      }
      const data = await res.json();
      if (data.success) {
        setPriceData({
          priceUsd: data.priceUsd,
          priceChange24h: data.priceChange24h,
          source: data.source,
        });
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err: any) {
      console.error('Error fetching price:', err);
      setPriceError('Congested');
    } finally {
      setPriceLoading(false);
    }
  };

  // Run allocation check
  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletInput.trim()) {
      setCheckerError('Paste a wallet address first, calf!');
      return;
    }

    setCheckerLoading(true);
    setCheckerError(null);
    setBalanceData(null);

    try {
      const sanitizedWallet = walletInput.trim();
      const sanitizedX = xInput.trim().replace(/^@/, '');
      const query = new URLSearchParams({
        wallet: sanitizedWallet,
        ...(sanitizedX && { x: sanitizedX }),
      });

      const res = await fetch(`/api/balance?${query.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'The trenches are congested right now... try again in a few seconds.');
      }

      setBalanceData(data);

      // Trigger instant price refresh
      fetchPrice();

      // Add a funny greeting from The Black Bull directly in the chat logs
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'user',
          content: `Checked wallet ${sanitizedWallet.slice(0, 4)}...${sanitizedWallet.slice(-4)}${
            sanitizedX ? ` (@${sanitizedX})` : ''
          }.`,
        },
        {
          role: 'assistant',
          content: `🚨 **BAG DETECTED!** 🚨\n\n${data.message}\n\nBalance: **${data.formattedBalance} $ANSEM**\nTier: **${data.tier}**\nSimulated Airdrop Allocation: **${data.allocationAmount.toLocaleString()} $ANSEM**\n\nWhat are you going to do now, calf? Hold the line or jeet it? Ask me anything!`,
        },
      ]);
    } catch (err: any) {
      console.error('Checker error:', err);
      setCheckerError(err.message || 'The trenches are congested right now... try again in a few seconds.');
    } finally {
      setCheckerLoading(false);
    }
  };

  // HTML2Canvas Image download trigger
  const downloadShareCard = async () => {
    const cardElement = document.getElementById('share-card-canvas-source');
    if (!cardElement) return;

    setGeneratingCard(true);
    try {
      // Small timeout to allow canvas-source rendering to settle
      await new Promise((resolve) => setTimeout(resolve, 150));

      const canvas = await html2canvas(cardElement, {
        scale: 2, // High DPI capture
        backgroundColor: '#000000',
        useCORS: true,
        allowTaint: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `black-bull-allocation-${xInput.trim() || 'anon'}.png`;
      downloadLink.href = imgData;
      downloadLink.click();
    } catch (err) {
      console.error('[Canvas] Failed to capture card:', err);
    } finally {
      setGeneratingCard(false);
    }
  };

  // Open Twitter Web Intent
  const shareToX = () => {
    if (!balanceData) return;

    const baseText = `Just scanned my bags on The Black Bull AI Oracle! 🐂🔥\n\nClassification: ${balanceData.tier}\nSimulated Allocation: ${balanceData.allocationAmount.toLocaleString()} $ANSEM\n\nBuilt by @kellycryptos\nCheck yours here: ${window.location.origin}\n\n$ANSEM to the moon! 🚀`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(baseText)}`;
    window.open(twitterUrl, '_blank');
  };

  // Send message helper
  const handleSendMessage = async (textToSend?: string) => {
    const input = textToSend || chatInput;
    if (!input.trim() || chatLoading) return;

    // Local user message
    const userMsg: Message = { role: 'user', content: input };
    const updatedMessages = [...chatMessages, userMsg];

    setChatMessages(updatedMessages);
    if (!textToSend) setChatInput('');
    setChatLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          priceData,
          walletData: balanceData
            ? {
                checked: true,
                walletAddress: balanceData.wallet,
                balance: balanceData.balance,
                tier: balanceData.tier,
              }
            : { checked: false },
        }),
      });

      if (!res.ok) {
        throw new Error('Trenches congested...');
      }

      const data = await res.json();
      if (data.success && data.reply) {
        setChatMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
      } else {
        throw new Error(data.error || 'Server error');
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            "🚨 The trenches are congested right now! My vocal chords are clogged with dust. Try asking again in a few seconds, calf! 🐂",
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // Quick Action triggers
  const triggerQuickAction = (actionType: 'price' | 'lore' | 'roast' | 'motivate') => {
    let prompt = '';
    switch (actionType) {
      case 'price':
        prompt = 'Give me a savage price prediction for $ANSEM. Do not hold back, use the current price if you know it!';
        break;
      case 'lore':
        prompt = 'Explain the sacred lore of $ANSEM and the legend of the Black Bull.';
        break;
      case 'roast':
        prompt = 'Savage roast my bags and status. Call me out if I am holding zero $ANSEM!';
        break;
      case 'motivate':
        prompt = 'GIVE ME THE STRONGEST TRENCH MOTIVATION! Charge forward!';
        break;
    }
    handleSendMessage(prompt);
  };

  return (
    <div className="flex-1 w-full trench-grid bg-brand-black flex flex-col justify-between py-6 px-4 sm:px-8 max-w-7xl mx-auto relative">
      
      {/* Hidden container designed strictly for html2canvas generation (fixed 600x350 box) */}
      {balanceData && (
        <div
          id="share-card-canvas-source"
          className="absolute left-[-9999px] top-[-9999px] w-[600px] h-[350px] bg-black border-2 border-brand-gold flex flex-col justify-between p-6 text-white font-sans relative overflow-hidden"
          style={{
            backgroundImage: 'radial-gradient(circle at center, #101011 0%, #000000 100%)',
          }}
        >
          {/* Ambient Card Glow elements */}
          <div className="absolute top-0 right-0 w-44 h-44 bg-brand-gold/15 blur-3xl rounded-full" />
          <div className="absolute bottom-0 left-0 w-44 h-44 bg-brand-red/10 blur-3xl rounded-full" />

          {/* Card Header */}
          <div className="flex justify-between items-center border-b border-white/10 pb-4 relative z-10">
            <div className="flex items-center gap-3">
              <span className="text-4xl">🐂</span>
              <div>
                <h2 className="text-lg font-black text-white leading-none tracking-tight">THE BLACK BULL AI</h2>
                <span className="text-[9px] text-brand-gold font-bold tracking-widest uppercase">SOLANA ORACLE</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-base font-black text-brand-gold">$ANSEM</span>
              <p className="text-[7px] text-gray-500 font-bold uppercase tracking-widest">Mint: 9cRC...TGpump</p>
            </div>
          </div>

          {/* Card Body */}
          <div className="flex-1 flex flex-col justify-center gap-3 py-4 text-center relative z-10">
            <div className="text-[9px] text-gray-400 font-extrabold uppercase tracking-widest">
              Trench Classification
            </div>
            <div className="text-2xl font-black text-white uppercase tracking-wider glow-text-gold leading-none">
              {balanceData.tier}
            </div>

            <div className="bg-white/[0.03] border border-white/10 py-3 px-6 rounded-xl inline-block mx-auto min-w-[240px]">
              <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">
                Simulated Airdrop Allocation
              </span>
              <span className="text-3xl font-black text-brand-gold font-mono block my-0.5">
                {balanceData.allocationAmount.toLocaleString()}
              </span>
              <span className="text-[9px] text-gray-400 block font-bold uppercase tracking-widest">
                $ANSEM tokens
              </span>
            </div>
          </div>

          {/* Card Footer */}
          <div className="flex justify-between items-end border-t border-white/10 pt-4 text-[10px] text-gray-500 font-bold relative z-10">
            <div className="flex flex-col gap-0.5">
              <span>User: {balanceData.xHandle ? `@${balanceData.xHandle}` : 'Anon Calf'}</span>
              <span className="text-[8px] text-gray-600 font-mono">
                Wallet: {balanceData.wallet.slice(0, 8)}...{balanceData.wallet.slice(-8)}
              </span>
            </div>
            <div className="text-right flex flex-col gap-0.5">
              <span className="text-brand-gold">Built by @kellycryptos</span>
              <span className="text-[8px] text-gray-600 font-mono">the-black-bull-ai.vercel.app</span>
            </div>
          </div>
        </div>
      )}

      {/* 1. Header Hero & Price Banner */}
      <header className="w-full mb-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 glass-panel p-5 rounded-2xl gold-glow-border">
          <div className="flex items-center gap-3">
            <span className="text-4xl sm:text-5xl animate-bounce">🐂</span>
            <div className="text-center md:text-left">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white glow-text-gold">
                The Black Bull <span className="text-brand-gold">AI Oracle</span>
              </h1>
              <p className="text-xs sm:text-sm text-gray-400 font-semibold tracking-widest uppercase">
                "Charge Forward in the Trenches"
              </p>
            </div>
          </div>

          {/* Live Price Display */}
          <div className="flex items-center gap-4 bg-black/40 border border-white/5 py-2 px-4 rounded-xl">
            <div className="flex flex-col text-right">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">
                $ANSEM Price
              </span>
              {priceLoading && !priceData ? (
                <span className="text-sm font-mono text-brand-gold animate-pulse">Loading...</span>
              ) : priceError ? (
                <span className="text-sm font-mono text-brand-red flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Congested
                </span>
              ) : priceData ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm sm:text-base font-mono font-bold text-white glow-text-white">
                    ${priceData.priceUsd.toFixed(6)}
                  </span>
                  <span
                    className={`text-xs font-mono font-bold flex items-center ${
                      priceData.priceChange24h >= 0 ? 'text-green-500' : 'text-brand-red'
                    }`}
                  >
                    {priceData.priceChange24h >= 0 ? (
                      <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5 mr-0.5" />
                    )}
                    {priceData.priceChange24h >= 0 ? '+' : ''}
                    {priceData.priceChange24h.toFixed(2)}%
                  </span>
                </div>
              ) : (
                <span className="text-sm font-mono text-gray-400">Unavailable</span>
              )}
            </div>
            <button
              onClick={fetchPrice}
              disabled={priceLoading}
              className="p-2 rounded-lg bg-white/5 hover:bg-brand-gold/10 hover:text-brand-gold transition-all duration-300 disabled:opacity-40"
              title="Refresh Price"
            >
              <RefreshCw className={`w-4 h-4 ${priceLoading ? 'animate-spin text-brand-gold' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* 2. Main content area: Checker + Chat */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* LEFT COLUMN: Allocation Checker */}
        <section className="lg:col-span-5 flex flex-col gap-6">
          <div className="glass-panel rounded-3xl p-6 flex flex-col gap-5 gold-glow-border relative overflow-hidden flex-1 justify-center">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-gold/5 blur-3xl rounded-full -z-10" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-brand-red/5 blur-3xl rounded-full -z-10" />

            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <Coins className="w-5 h-5 text-brand-gold" />
              <h2 className="text-lg font-bold text-white tracking-wide uppercase">
                Airdrop Simulator
              </h2>
            </div>

            {/* Input Form */}
            <form onSubmit={handleCheck} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Twitter className="w-3.5 h-3.5 text-blue-400" /> X Handle (Optional)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-mono text-sm">
                    @
                  </span>
                  <input
                    type="text"
                    placeholder="kellycryptos"
                    value={xInput}
                    onChange={(e) => setXInput(e.target.value)}
                    disabled={checkerLoading}
                    className="w-full bg-black/50 border border-white/10 hover:border-white/20 focus:border-brand-gold focus:ring-1 focus:ring-brand-gold focus:outline-none rounded-xl pl-8 pr-4 py-3 text-sm text-white font-mono placeholder:text-gray-600 transition-all duration-300"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Wallet className="w-3.5 h-3.5 text-brand-gold" /> Solana Wallet Address
                </label>
                <input
                  type="text"
                  placeholder="9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM... (or yours)"
                  value={walletInput}
                  onChange={(e) => setWalletInput(e.target.value)}
                  disabled={checkerLoading}
                  className="w-full bg-black/50 border border-white/10 hover:border-white/20 focus:border-brand-gold focus:ring-1 focus:ring-brand-gold focus:outline-none rounded-xl px-4 py-3 text-sm text-white font-mono placeholder:text-gray-600 transition-all duration-300"
                />
              </div>

              <button
                type="submit"
                disabled={checkerLoading}
                className="w-full bg-brand-gold hover:bg-brand-gold-dark text-black font-extrabold uppercase py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-brand-gold/10 hover:shadow-brand-gold/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm tracking-wider"
              >
                {checkerLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Scanning the Trenches...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-current" />
                    Check My Allocation
                  </>
                )}
              </button>
            </form>

            {/* Error Message Panel */}
            {checkerError && (
              <div className="bg-brand-red/10 border border-brand-red/30 p-4 rounded-xl flex items-start gap-3 animate-shake">
                <AlertTriangle className="w-5 h-5 text-brand-red shrink-0 mt-0.5" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold text-brand-red uppercase tracking-wider">
                    Scan Failed
                  </span>
                  <p className="text-xs text-gray-300 leading-relaxed font-semibold">
                    {checkerError}
                  </p>
                </div>
              </div>
            )}

            {/* Allocation Results Panel */}
            {balanceData && (
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 flex flex-col gap-4 animate-fadeIn">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                      Detected Weight
                    </span>
                    <span className="text-sm font-mono font-bold text-white">
                      {balanceData.formattedBalance} $ANSEM
                    </span>
                  </div>
                  <div className="bg-brand-gold/10 border border-brand-gold/30 text-brand-gold font-extrabold px-3 py-1 rounded-full text-xs uppercase tracking-wider">
                    {balanceData.tier}
                  </div>
                </div>

                <div className="flex flex-col items-center py-2 bg-black/30 rounded-xl border border-white/5 relative overflow-hidden">
                  <div className="absolute top-0 left-0 bg-brand-gold text-black font-extrabold text-[8px] uppercase px-1.5 py-0.5 rounded-br-lg tracking-wider">
                    Simulated Allocation
                  </div>
                  <span className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-2">
                    Airdrop Share
                  </span>
                  <span className="text-3xl font-black text-brand-gold font-mono tracking-tight glow-text-gold">
                    {balanceData.allocationAmount.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-gray-400 font-extrabold uppercase mt-1">
                    $ANSEM tokens
                  </span>
                </div>

                <p className="text-xs text-gray-300 leading-relaxed bg-brand-gold/5 border-l-2 border-brand-gold p-3 rounded-r-lg font-medium italic">
                  "{balanceData.message}"
                </p>

                {/* Viral Sharing Controls */}
                <div className="grid grid-cols-2 gap-3 mt-1">
                  <button
                    onClick={downloadShareCard}
                    disabled={generatingCard}
                    className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs transition-all duration-300 cursor-pointer disabled:opacity-50"
                  >
                    <Download className="w-4 h-4 text-brand-gold" />
                    {generatingCard ? 'Capturing...' : 'Download Card'}
                  </button>
                  <button
                    onClick={shareToX}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs transition-all duration-300 cursor-pointer shadow-md shadow-blue-600/10"
                  >
                    <Twitter className="w-4 h-4 fill-current" />
                    Share to X
                  </button>
                </div>
                
                <p className="text-[10px] text-center text-gray-500 font-semibold leading-relaxed">
                  💡 Tip: Download the card, then upload it in the X window to show off your rank!
                </p>

                <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-bold justify-end border-t border-white/5 pt-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                  Verified via Solana RPC
                </div>
              </div>
            )}
          </div>
        </section>

        {/* RIGHT COLUMN: The Chat Terminal */}
        <section className="lg:col-span-7 flex flex-col glass-panel rounded-3xl red-glow-border overflow-hidden min-h-[480px]">
          {/* Chat Header */}
          <div className="bg-brand-slate px-5 py-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-red animate-pulse-slow" />
              <span className="text-xs font-black uppercase text-gray-400 tracking-wider">
                Trench Communicator v1.0
              </span>
            </div>
            {balanceData && (
              <span className="text-[10px] font-mono text-gray-500 font-bold">
                Wallet: {balanceData.wallet.slice(0, 6)}...{balanceData.wallet.slice(-6)}
              </span>
            )}
          </div>

          {/* Chat Messages Log */}
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 custom-scrollbar max-h-[380px]">
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col max-w-[85%] ${
                  msg.role === 'user' ? 'self-end items-end' : 'self-start items-start'
                }`}
              >
                <span className="text-[9px] text-gray-500 uppercase tracking-widest font-black mb-1">
                  {msg.role === 'user' ? 'TRENCHER' : 'THE BLACK BULL 🐂'}
                </span>
                <div
                  className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-brand-gold text-black font-semibold rounded-tr-none'
                      : 'bg-white/[0.03] border border-white/5 text-gray-200 rounded-tl-none font-medium'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {chatLoading && (
              <div className="self-start flex flex-col items-start max-w-[85%] animate-pulse">
                <span className="text-[9px] text-gray-500 uppercase tracking-widest font-black mb-1">
                  THE BLACK BULL 🐂 (Typing...)
                </span>
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl rounded-tl-none px-4 py-3 text-sm flex gap-1.5 items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Quick Action Suggestion Buttons */}
          <div className="px-5 py-2.5 border-t border-white/5 flex flex-wrap gap-2 bg-brand-slate/40">
            <button
              onClick={() => triggerQuickAction('price')}
              className="text-xs bg-white/5 border border-white/5 hover:border-brand-gold/40 hover:text-brand-gold text-gray-300 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all duration-300 cursor-pointer"
            >
              <TrendingUp className="w-3.5 h-3.5 text-brand-gold" /> Price Prediction
            </button>
            <button
              onClick={() => triggerQuickAction('lore')}
              className="text-xs bg-white/5 border border-white/5 hover:border-brand-gold/40 hover:text-brand-gold text-gray-300 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all duration-300 cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-400" /> Teach Me Lore
            </button>
            <button
              onClick={() => triggerQuickAction('roast')}
              className="text-xs bg-white/5 border border-white/5 hover:border-brand-red/40 hover:text-brand-red text-gray-300 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all duration-300 cursor-pointer"
            >
              <Skull className="w-3.5 h-3.5 text-brand-red" /> Roast Me
            </button>
            <button
              onClick={() => triggerQuickAction('motivate')}
              className="text-xs bg-white/5 border border-white/5 hover:border-brand-gold/40 hover:text-brand-gold text-gray-300 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all duration-300 cursor-pointer"
            >
              <Flame className="w-3.5 h-3.5 text-orange-500 animate-pulse" /> Bull Motivation
            </button>
          </div>

          {/* Chat Form Input */}
          <div className="p-4 bg-brand-slate border-t border-white/5">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                placeholder="Talk to the Bull... 'Roast my bag, calf!'"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={chatLoading}
                className="flex-1 bg-black border border-white/10 focus:border-brand-red focus:ring-1 focus:ring-brand-red focus:outline-none rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 transition-all duration-300"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || chatLoading}
                className="bg-brand-red hover:bg-red-600 text-white p-3 rounded-xl flex items-center justify-center transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-brand-red/10"
              >
                <Send className="w-4 h-4 fill-current" />
              </button>
            </form>
          </div>
        </section>

      </main>

      {/* 3. Footer */}
      <footer className="mt-6 text-center text-xs text-gray-500 font-semibold tracking-wider flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/15 pt-5">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <span>The Black Bull AI Oracle © 2026. Stay bullish.</span>
          <span className="hidden sm:inline text-gray-700">|</span>
          <a
            href="https://x.com/kellycryptos"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-gold hover:text-brand-gold-dark hover:underline flex items-center gap-1 transition-all duration-300"
          >
            <Twitter className="w-3.5 h-3.5 fill-current" /> Built by @kellycryptos
          </a>
        </div>
        <span className="text-[10px] text-gray-600 font-mono">
          Mint Address: 9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump
        </span>
      </footer>
    </div>
  );
}
