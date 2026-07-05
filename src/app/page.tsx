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
  ShieldCheck,
  Download,
  Copy,
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

// Market Cap milestones for the simulator slider
const MARKET_CAP_MILESTONES = [
  10000000,    // $10M
  25000000,    // $25M
  50000000,    // $50M
  100000000,   // $100M
  250000000,   // $250M
  500000000,   // $500M
  1000000000,  // $1B
  2500000000,  // $2.5B
  5000000000,  // $5B
  10000000000, // $10B
];

export default function Home() {
  // Tab Switcher state
  const [activeTab, setActiveTab] = useState<'scanner' | 'simulator'>('scanner');

  // Input fields (Scanner)
  const [walletInput, setWalletInput] = useState('');
  const [xInput, setXInput] = useState('');

  // Live Price State
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);

  // Checker State (Scanner)
  const [balanceData, setBalanceData] = useState<BalanceData | null>(null);
  const [checkerLoading, setCheckerLoading] = useState(false);
  const [checkerError, setCheckerError] = useState<string | null>(null);

  // Dynamic Avatar State
  const [avatarUrl, setAvatarUrl] = useState('/black-bull-logo.jpg');

  // Simulator Sliders State
  const [simHoldings, setSimHoldings] = useState(50000);
  const [simImpressions, setSimImpressions] = useState(100000);
  const [simSupplyPct, setSimSupplyPct] = useState(10);
  const [simCapIndex, setSimCapIndex] = useState(3); // Defaults to index 3 ($100M cap)

  // Card Generation States
  const [generatingCard, setGeneratingCard] = useState(false);
  const [copyingCard, setCopyingCard] = useState(false);

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

  // 3. Resolve X profile picture when checked data or manual input updates
  useEffect(() => {
    const handle = activeTab === 'scanner' ? balanceData?.xHandle : xInput;
    if (handle?.trim()) {
      const cleanHandle = handle.trim().replace(/^@/, '');
      setAvatarUrl(`https://unavatar.io/twitter/${cleanHandle}`);
    } else {
      setAvatarUrl('/black-bull-logo.jpg');
    }
  }, [balanceData, xInput, activeTab]);

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

  // Run allocation check (Scanner)
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

  // HTML2Canvas Image download trigger for Scanner Card
  const downloadShareCard = async () => {
    const cardElement = document.getElementById('allocation-card');
    if (!cardElement) return;

    setGeneratingCard(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 150));

      const canvas = await html2canvas(cardElement, {
        scale: 2, // High DPI capture
        backgroundColor: '#000000',
        useCORS: true,
        allowTaint: false,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `black-bull-allocation-${xInput.trim() || 'anon'}.png`;
      downloadLink.href = imgData;
      downloadLink.click();
    } catch (err) {
      console.error('[Canvas] Failed to capture card:', err);
      alert('Failed to generate PNG image card, calf!');
    } finally {
      setGeneratingCard(false);
    }
  };

  // Copy Image to Clipboard for Scanner Card
  const copyShareCard = async () => {
    const cardElement = document.getElementById('allocation-card');
    if (!cardElement) return;

    setCopyingCard(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 150));

      const canvas = await html2canvas(cardElement, {
        scale: 2, // High DPI capture
        backgroundColor: '#000000',
        useCORS: true,
        allowTaint: false,
        logging: false,
      });

      canvas.toBlob(async (blob) => {
        if (!blob) {
          alert('Failed to generate image blob, calf!');
          setCopyingCard(false);
          return;
        }
        try {
          const item = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          alert('📋 Card image copied to clipboard! You can now paste (Ctrl+V) it directly into your X post.');
        } catch (clipErr: any) {
          console.error('[Clipboard] Failed to write image:', clipErr);
          alert('Direct clipboard write blocked by browser permissions! Downloading card instead...');
          downloadShareCard();
        } finally {
          setCopyingCard(false);
        }
      }, 'image/png');
    } catch (err) {
      console.error('[Canvas] Failed to copy card:', err);
      alert('Failed to copy card to clipboard.');
      setCopyingCard(false);
    }
  };

  // Open Twitter Web Intent for Scanner results
  const shareToX = () => {
    if (!balanceData) return;

    const baseText = `Simulated my potential $ANSEM rewards on The Black Bull AI Oracle! 🐂🔥\n\nClassification: ${balanceData.tier}\nSimulated Allocation: ${balanceData.allocationAmount.toLocaleString()} $ANSEM\n\nCheck yours here: ${window.location.origin}\n\n$ANSEM to the moon! 🚀`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(baseText)}`;
    window.open(twitterUrl, '_blank');
  };

  // --- SIMULATOR FUNCTIONS ---
  const selectedMarketCap = MARKET_CAP_MILESTONES[simCapIndex];
  const simTokenPrice = selectedMarketCap / 1000000000;
  const simAllocation = Math.round((simHoldings * 0.15) + (simImpressions * 0.45) * (simSupplyPct / 10));
  const simUsdValue = simAllocation * simTokenPrice;

  const formatMarketCap = (val: number) => {
    if (val >= 1000000000) return `$${(val / 1000000000).toFixed(1).replace(/\.0$/, '')}B`;
    return `$${(val / 1000000).toFixed(0)}M`;
  };

  // HTML2Canvas Image download trigger for Simulator Card
  const downloadSimCard = async () => {
    const cardElement = document.getElementById('simulator-card');
    if (!cardElement) return;

    setGeneratingCard(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 150));

      const canvas = await html2canvas(cardElement, {
        scale: 2, // High DPI capture
        backgroundColor: '#000000',
        useCORS: true,
        allowTaint: false,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `black-bull-simulation-${xInput.trim() || 'anon'}.png`;
      downloadLink.href = imgData;
      downloadLink.click();
    } catch (err) {
      console.error('[Canvas] Failed to capture simulator card:', err);
      alert('Failed to generate PNG image card, calf!');
    } finally {
      setGeneratingCard(false);
    }
  };

  // Copy Image to Clipboard for Simulator Card
  const copySimCard = async () => {
    const cardElement = document.getElementById('simulator-card');
    if (!cardElement) return;

    setCopyingCard(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 150));

      const canvas = await html2canvas(cardElement, {
        scale: 2, // High DPI capture
        backgroundColor: '#000000',
        useCORS: true,
        allowTaint: false,
        logging: false,
      });

      canvas.toBlob(async (blob) => {
        if (!blob) {
          alert('Failed to generate image blob, calf!');
          setCopyingCard(false);
          return;
        }
        try {
          const item = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          alert('📋 Simulation card copied to clipboard! You can now paste (Ctrl+V) it directly into your X post.');
        } catch (clipErr: any) {
          console.error('[Clipboard] Failed to write image:', clipErr);
          alert('Direct clipboard write blocked by browser permissions! Downloading card instead...');
          downloadSimCard();
        } finally {
          setCopyingCard(false);
        }
      }, 'image/png');
    } catch (err) {
      console.error('[Canvas] Failed to copy simulator card:', err);
      alert('Failed to copy card to clipboard.');
      setCopyingCard(false);
    }
  };

  // Open Twitter Web Intent for Simulator results
  const shareSimToX = () => {
    const formatMcVal = formatMarketCap(selectedMarketCap);
    const baseText = `Simulated my potential $ANSEM rewards on The Black Bull AI Oracle! 🐂🔥\n\nEstimated Allocation: ${simAllocation.toLocaleString()} $ANSEM\nProjected USD Worth: $${simUsdValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} (at ${formatMcVal} MC)\n\nCheck yours here: ${window.location.origin}\n\n$ANSEM to the moon! 🚀`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(baseText)}`;
    window.open(twitterUrl, '_blank');
  };

  // --- COMMON CHAT HELPERS ---
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

  const handleAvatarError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = '/black-bull-logo.jpg';
  };

  return (
    <div className="flex-1 w-full trench-grid bg-brand-black flex flex-col justify-between py-6 px-4 sm:px-8 max-w-7xl mx-auto relative">
      
      {/* ---------------- OFF-SCREEN IMAGE GENERATION CANVASES ---------------- */}
      {/* Scanner Card Canvas */}
      {balanceData && (
        <div
          id="allocation-card"
          className="fixed right-0 bottom-0 w-[600px] h-[350px] bg-black border-2 border-brand-green flex flex-col justify-between p-6 text-white font-sans overflow-hidden z-[-50] opacity-[0.01] pointer-events-none"
        >
          <img
            src="/black-bull-logo.jpg"
            className="absolute inset-0 w-full h-full object-cover object-center z-0"
            alt="bull bg"
          />
          <div className="absolute inset-0 bg-black/80 z-10" />

          <div className="flex justify-between items-center border-b border-white/10 pb-4 relative z-20">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden border border-brand-green relative">
                <img
                  src={avatarUrl}
                  className="w-full h-full object-cover"
                  alt="logo"
                  onError={handleAvatarError}
                />
              </div>
              <div>
                <h2 className="text-lg font-black text-white leading-none tracking-tight">THE BLACK BULL AI</h2>
                <span className="text-[9px] text-brand-green font-bold tracking-widest uppercase">SOLANA ORACLE</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-base font-black text-brand-gold">$ANSEM</span>
              <p className="text-[7px] text-gray-500 font-bold uppercase tracking-widest">Mint: 9cRC...TGpump</p>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center gap-3 py-4 text-center relative z-20">
            <div className="text-[9px] text-gray-400 font-extrabold uppercase tracking-widest">
              Trench Classification
            </div>
            <div className="text-2xl font-black text-white uppercase tracking-wider glow-text-green leading-none">
              {balanceData.tier}
            </div>

            <div className="bg-black/60 border border-white/10 py-3 px-6 rounded-xl inline-block mx-auto min-w-[240px]">
              <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">
                Simulated Airdrop Allocation
              </span>
              <span className="text-3xl font-black text-brand-green font-mono block my-0.5">
                {balanceData.allocationAmount.toLocaleString()}
              </span>
              <span className="text-[9px] text-gray-400 block font-bold uppercase tracking-widest">
                $ANSEM tokens
              </span>
            </div>
          </div>

          <div className="flex justify-between items-end border-t border-white/10 pt-4 text-[10px] text-gray-500 font-bold relative z-20">
            <div className="flex flex-col gap-0.5">
              <span>User: {balanceData.xHandle ? `@${balanceData.xHandle}` : 'Anon Calf'}</span>
              <span className="text-[8px] text-gray-600 font-mono">
                Wallet: {balanceData.wallet.slice(0, 8)}...{balanceData.wallet.slice(-8)}
              </span>
            </div>
            <div className="text-right flex flex-col gap-0.5">
              <span className="text-brand-green">Built by @kellycryptos</span>
              <span className="text-[8px] text-gray-600 font-mono">the-black-bull-ai.vercel.app</span>
            </div>
          </div>
        </div>
      )}

      {/* Simulator Card Canvas */}
      <div
        id="simulator-card"
        className="fixed right-0 bottom-0 w-[600px] h-[350px] bg-black border-2 border-brand-green flex flex-col justify-between p-6 text-white font-sans overflow-hidden z-[-50] opacity-[0.01] pointer-events-none"
      >
        <img
          src="/black-bull-logo.jpg"
          className="absolute inset-0 w-full h-full object-cover object-center z-0"
          alt="bull bg"
        />
        <div className="absolute inset-0 bg-black/85 z-10" />

        <div className="flex justify-between items-center border-b border-white/10 pb-4 relative z-20">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden border border-brand-green relative">
              <img
                src={avatarUrl}
                className="w-full h-full object-cover"
                alt="logo"
                onError={handleAvatarError}
              />
            </div>
            <div>
              <h2 className="text-lg font-black text-white leading-none tracking-tight">THE BLACK BULL AI</h2>
              <span className="text-[9px] text-brand-green font-bold tracking-widest uppercase">SIMULATION ORACLE</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-base font-black text-brand-gold">$ANSEM</span>
            <p className="text-[7px] text-gray-500 font-bold uppercase tracking-widest">Mint: 9cRC...TGpump</p>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center gap-2 py-4 text-center relative z-20">
          <div className="text-[9px] text-gray-400 font-extrabold uppercase tracking-widest">
            Speculative Bull Allocation
          </div>
          <div className="text-2xl font-black text-brand-green font-mono tracking-tight glow-text-green leading-none">
            {simAllocation.toLocaleString()} $ANSEM
          </div>

          <div className="bg-black/60 border border-white/10 py-2.5 px-6 rounded-xl inline-block mx-auto min-w-[260px]">
            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">
              Projected Valuation (at {formatMarketCap(selectedMarketCap)} MC)
            </span>
            <span className="text-2xl font-black text-brand-gold font-mono block my-0.5">
              ${simUsdValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} USD
            </span>
          </div>
        </div>

        <div className="flex justify-between items-end border-t border-white/10 pt-4 text-[10px] text-gray-500 font-bold relative z-20">
          <div className="flex flex-col gap-0.5">
            <span>User: {xInput.trim() ? `@${xInput.trim().replace(/^@/, '')}` : 'Anon Calf'}</span>
            <span className="text-[8px] text-gray-600 font-mono">
              Holdings: {simHoldings.toLocaleString()} $ANSEM | Impressions: {simImpressions.toLocaleString()}
            </span>
          </div>
          <div className="text-right flex flex-col gap-0.5">
            <span className="text-brand-green">Built by @kellycryptos</span>
            <span className="text-[8px] text-gray-600 font-mono">the-black-bull-ai.vercel.app</span>
          </div>
        </div>
      </div>

      {/* ---------------- 1. HEADER HERO ---------------- */}
      <header className="w-full mb-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 glass-panel p-5 rounded-2xl green-glow-border">
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-brand-green green-glow-border">
              <img
                src="/black-bull-logo.jpg"
                alt="Black Bull Logo"
                className="object-cover w-full h-full"
              />
            </div>
            <div className="text-center md:text-left">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white glow-text-green">
                The Black Bull <span className="text-brand-green">AI Oracle</span>
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
                <span className="text-sm font-mono text-brand-green animate-pulse">Loading...</span>
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
              className="p-2 rounded-lg bg-white/5 hover:bg-brand-green/10 hover:text-brand-green transition-all duration-300 disabled:opacity-40"
              title="Refresh Price"
            >
              <RefreshCw className={`w-4 h-4 ${priceLoading ? 'animate-spin text-brand-green' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* ---------------- 2. MAIN WORKSPACE ---------------- */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* LEFT COLUMN: Allocation Checker, Onboarding Guide & FAQ */}
        <section className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Main Simulator/Scanner Glass Panel */}
          <div className="glass-panel rounded-3xl p-6 flex flex-col gap-5 green-glow-border relative overflow-hidden justify-start">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-green/5 blur-3xl rounded-full -z-10" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-brand-gold/5 blur-3xl rounded-full -z-10" />

            {/* Banner logo */}
            <div className="relative w-full h-40 rounded-2xl overflow-hidden border border-brand-green/30 green-glow-border mb-1">
              <img
                src="/black-bull-logo.jpg"
                alt="Black Bull Official Banner"
                className="object-cover w-full h-full object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-card via-black/40 to-transparent" />
              <div className="absolute bottom-3 left-4">
                <span className="text-[10px] bg-brand-green/20 border border-brand-green/40 text-brand-green px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Oracle Active
                </span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex bg-black/40 border border-white/5 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('scanner')}
                className={`flex-1 text-center py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                  activeTab === 'scanner'
                    ? 'bg-brand-green text-black font-extrabold shadow-md shadow-brand-green/10'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Airdrop Scanner
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('simulator')}
                className={`flex-1 text-center py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                  activeTab === 'simulator'
                    ? 'bg-brand-green text-black font-extrabold shadow-md shadow-brand-green/10'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Bull Simulator
              </button>
            </div>

            {/* TAB 1: Scanner View */}
            {activeTab === 'scanner' && (
              <div className="flex flex-col gap-4 animate-fadeIn">
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
                        className="w-full bg-black/50 border border-white/10 hover:border-white/20 focus:border-brand-green focus:ring-1 focus:ring-brand-green focus:outline-none rounded-xl pl-8 pr-4 py-3 text-sm text-white font-mono placeholder:text-gray-600 transition-all duration-300"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                      <Wallet className="w-3.5 h-3.5 text-brand-green" /> Solana Wallet Address
                    </label>
                    <input
                      type="text"
                      placeholder="9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM... (or yours)"
                      value={walletInput}
                      onChange={(e) => setWalletInput(e.target.value)}
                      disabled={checkerLoading}
                      className="w-full bg-black/50 border border-white/10 hover:border-white/20 focus:border-brand-green focus:ring-1 focus:ring-brand-green focus:outline-none rounded-xl px-4 py-3 text-sm text-white font-mono placeholder:text-gray-600 transition-all duration-300"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={checkerLoading}
                    className="w-full bg-brand-green hover:bg-brand-green-dark text-black font-extrabold uppercase py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-brand-green/10 hover:shadow-brand-green/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm tracking-wider"
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

                {/* Scanner Result details */}
                {balanceData && (
                  <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-5 flex flex-col gap-4 animate-fadeIn">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden border border-brand-green relative">
                          <img
                            src={avatarUrl}
                            className="w-full h-full object-cover"
                            alt="user avatar"
                            onError={handleAvatarError}
                          />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                            Detected Weight
                          </span>
                          <span className="text-sm font-mono font-bold text-white">
                            {balanceData.formattedBalance} $ANSEM
                          </span>
                        </div>
                      </div>
                      <div className="bg-brand-green/10 border border-brand-green/30 text-brand-green font-extrabold px-3 py-1 rounded-full text-xs uppercase tracking-wider">
                        {balanceData.tier}
                      </div>
                    </div>

                    <div className="flex flex-col items-center py-2 bg-black/30 rounded-xl border border-white/5 relative overflow-hidden">
                      <div className="absolute top-0 left-0 bg-brand-green text-black font-extrabold text-[8px] uppercase px-1.5 py-0.5 rounded-br-lg tracking-wider">
                        Simulated Allocation
                      </div>
                      <span className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-2">
                        Airdrop Share
                      </span>
                      <span className="text-3xl font-black text-brand-green font-mono tracking-tight glow-text-green">
                        {balanceData.allocationAmount.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-gray-400 font-extrabold uppercase mt-1">
                        $ANSEM tokens
                      </span>
                    </div>

                    <p className="text-xs text-gray-300 leading-relaxed bg-brand-green/5 border-l-2 border-brand-green p-3 rounded-r-lg font-medium italic">
                      "{balanceData.message}"
                    </p>

                    <div className="bg-brand-green/10 border border-brand-green/20 p-4 rounded-xl flex flex-col gap-2">
                      <span className="text-[9px] font-black text-brand-green uppercase tracking-widest block">
                        Claim Real $ANSEM Rewards
                      </span>
                      <p className="text-xs text-gray-300 font-semibold leading-relaxed">
                        Want to claim $ANSEM airdrop / rewards? Use my Bullpen referral:
                      </p>
                      <a
                        href="https://app.bullpen.fi/claim?ref=Kellycryptos"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-brand-green hover:bg-brand-green-dark text-black text-center font-black uppercase py-2.5 px-4 rounded-xl text-[10px] tracking-widest transition-all duration-300 hover:scale-[1.02] shadow-md shadow-brand-green/10"
                      >
                        🚀 Claim via Bullpen
                      </a>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-1">
                      <button
                        onClick={downloadShareCard}
                        disabled={generatingCard || copyingCard}
                        className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs transition-all duration-300 cursor-pointer disabled:opacity-50"
                      >
                        <Download className="w-4 h-4 text-brand-green" />
                        {generatingCard ? 'Capturing...' : 'Download Card'}
                      </button>
                      <button
                        onClick={copyShareCard}
                        disabled={generatingCard || copyingCard}
                        className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs transition-all duration-300 cursor-pointer disabled:opacity-50"
                      >
                        <Copy className="w-4 h-4 text-brand-green" />
                        {copyingCard ? 'Copying...' : 'Copy Image'}
                      </button>
                    </div>

                    <button
                      onClick={shareToX}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-xs transition-all duration-300 cursor-pointer shadow-md shadow-blue-600/10"
                    >
                      <Twitter className="w-4 h-4 fill-current" />
                      Post to X (Twitter)
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Speculative Simulator View */}
            {activeTab === 'simulator' && (
              <div className="flex flex-col gap-4 animate-fadeIn">
                <div className="bg-brand-green/5 border-l-2 border-brand-green p-3 rounded-r-lg">
                  <p className="text-xs text-gray-300 leading-relaxed font-semibold">
                    Simulate your potential $ANSEM rewards based on your holdings, posting activity, and community allocation!
                  </p>
                </div>

                {/* Optional X username input to show on simulation card */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    <Twitter className="w-3 h-3 text-blue-400" /> Enter X Handle (for Simulation Card)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-mono text-xs">
                      @
                    </span>
                    <input
                      type="text"
                      placeholder="kellycryptos"
                      value={xInput}
                      onChange={(e) => setXInput(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 hover:border-white/20 focus:border-brand-green focus:outline-none rounded-xl pl-8 pr-4 py-2 text-xs text-white font-mono placeholder:text-gray-600 transition-all duration-300"
                    />
                  </div>
                </div>

                {/* Holdings Slider */}
                <div className="flex flex-col gap-1.5 mt-1">
                  <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider">
                    <span className="text-gray-400">Your $ANSEM Holdings</span>
                    <span className="text-brand-green font-mono">{simHoldings.toLocaleString()}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1000000"
                    step="5000"
                    value={simHoldings}
                    onChange={(e) => setSimHoldings(parseInt(e.target.value))}
                    className="w-full accent-brand-green bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-gray-500 font-bold font-mono">
                    <span>0</span>
                    <span>500K</span>
                    <span>1M</span>
                  </div>
                </div>

                {/* Impressions Slider */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider">
                    <span className="text-gray-400">X Impressions / Score</span>
                    <span className="text-brand-green font-mono">{simImpressions.toLocaleString()}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="500000"
                    step="10000"
                    value={simImpressions}
                    onChange={(e) => setSimImpressions(parseInt(e.target.value))}
                    className="w-full accent-brand-green bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-gray-500 font-bold font-mono">
                    <span>0</span>
                    <span>250K</span>
                    <span>500K</span>
                  </div>
                </div>

                {/* Supply Pct Slider */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider">
                    <span className="text-gray-400">Supply Pct to Community</span>
                    <span className="text-brand-green font-mono">{simSupplyPct}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    step="1"
                    value={simSupplyPct}
                    onChange={(e) => setSimSupplyPct(parseInt(e.target.value))}
                    className="w-full accent-brand-green bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-gray-500 font-bold font-mono">
                    <span>5%</span>
                    <span>27.5%</span>
                    <span>50%</span>
                  </div>
                </div>

                {/* Market Cap Slider */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider">
                    <span className="text-gray-400">Projected Market Cap</span>
                    <span className="text-brand-gold font-mono">{formatMarketCap(selectedMarketCap)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={MARKET_CAP_MILESTONES.length - 1}
                    step="1"
                    value={simCapIndex}
                    onChange={(e) => setSimCapIndex(parseInt(e.target.value))}
                    className="w-full accent-brand-green bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-gray-500 font-bold font-mono">
                    <span>$10M</span>
                    <span>$500M</span>
                    <span>$10B</span>
                  </div>
                </div>

                {/* Live Simulation Results Panel */}
                <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-5 flex flex-col gap-4 mt-2">
                  <div className="flex flex-col items-center py-2 bg-black/30 rounded-xl border border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 left-0 bg-brand-green text-black font-extrabold text-[8px] uppercase px-1.5 py-0.5 rounded-br-lg tracking-wider">
                      Simulation Result
                    </div>
                    <span className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-2">
                      Simulated Allocation
                    </span>
                    <span className="text-2xl font-black text-brand-green font-mono tracking-tight glow-text-green">
                      {simAllocation.toLocaleString()} $ANSEM
                    </span>
                    <span className="text-[10px] text-gray-400 font-extrabold uppercase mt-1">
                      Projected Value: <span className="text-brand-gold font-black">${simUsdValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} USD</span>
                    </span>
                  </div>

                  {/* Referral CTA removed for cleaner simulation focus */}

                  {/* Canvas Buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={downloadSimCard}
                      disabled={generatingCard || copyingCard}
                      className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs transition-all duration-300 cursor-pointer disabled:opacity-50"
                    >
                      <Download className="w-4 h-4 text-brand-green" />
                      {generatingCard ? 'Capturing...' : 'Download Card'}
                    </button>
                    <button
                      onClick={copySimCard}
                      disabled={generatingCard || copyingCard}
                      className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs transition-all duration-300 cursor-pointer disabled:opacity-50"
                    >
                      <Copy className="w-4 h-4 text-brand-green" />
                      {copyingCard ? 'Copying...' : 'Copy Image'}
                    </button>
                  </div>

                  <button
                    onClick={shareSimToX}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-xs transition-all duration-300 cursor-pointer shadow-md shadow-blue-600/10"
                  >
                    <Twitter className="w-4 h-4 fill-current" />
                    Post Simulation to X
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Collapsible Onboarding Guide Card */}
          <div className="glass-panel rounded-3xl p-5 green-glow-border flex flex-col gap-3">
            <details className="group">
              <summary className="list-none flex items-center justify-between cursor-pointer font-extrabold text-xs text-white uppercase tracking-wider select-none">
                <span className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-brand-green animate-pulse" />
                  How to Get Involved & Claim Guide
                </span>
                <span className="transition-transform duration-300 group-open:rotate-180 text-brand-green text-[10px]">
                  ▼
                </span>
              </summary>
              <div className="mt-4 border-t border-white/5 pt-4 flex flex-col gap-3.5 text-xs text-gray-300 leading-relaxed">
                <div className="flex gap-3">
                  <span className="bg-brand-green/20 text-brand-green font-mono font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0">1</span>
                  <div>
                    <p className="font-bold text-white mb-0.5">Visit Bullpen</p>
                    <p>Go to the Kellycryptos profile at <a href="https://bullpen.fi/@Kellycryptos" target="_blank" rel="noopener noreferrer" className="text-brand-green hover:underline font-bold">bullpen.fi/@Kellycryptos</a></p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <span className="bg-brand-green/20 text-brand-green font-mono font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0">2</span>
                  <div>
                    <p className="font-bold text-white mb-0.5">Connect X (Twitter) Account</p>
                    <p>Link your Twitter account to sync your active social profile with the bullpen platform.</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="bg-brand-green/20 text-brand-green font-mono font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0">3</span>
                  <div>
                    <p className="font-bold text-white mb-0.5">Link Your Solana Wallet</p>
                    <p>Connect or import the specific Solana wallet containing your $ANSEM memecoins to register your holding weight.</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="bg-brand-green/20 text-brand-green font-mono font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0">4</span>
                  <div>
                    <p className="font-bold text-white mb-0.5">Participate & Multiply Rewards</p>
                    <p>Interact with active threads, write community bullposts, and secure your real allocations on the platform!</p>
                  </div>
                </div>
              </div>
            </details>
          </div>

          {/* Collapsible FAQ Onboarding Card */}
          <div className="glass-panel rounded-3xl p-5 green-glow-border flex flex-col gap-3">
            <details className="group">
              <summary className="list-none flex items-center justify-between cursor-pointer font-extrabold text-xs text-white uppercase tracking-wider select-none">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-brand-green animate-pulse" />
                  FAQ - New to Crypto? Start Here
                </span>
                <span className="transition-transform duration-300 group-open:rotate-180 text-brand-green text-[10px]">
                  ▼
                </span>
              </summary>
              
              <div className="mt-4 border-t border-white/5 pt-4 flex flex-col gap-3.5 text-xs text-gray-300 leading-relaxed">
                
                <details className="group/item border-b border-white/5 pb-2">
                  <summary className="list-none flex items-center justify-between cursor-pointer font-bold text-xs text-gray-200 select-none">
                    <span>1. What is $ANSEM (The Black Bull)?</span>
                    <span className="transition-transform duration-300 group-open/item:rotate-180 text-brand-green text-[10px]">▼</span>
                  </summary>
                  <p className="mt-2 text-xs text-gray-400 leading-relaxed">
                    $ANSEM is the official community token inspired by the legend of the Black Bull—the ultimate force in the Solana trenches. It is more than just a coin; it's a movement focused on community, strength, and charging forward together!
                  </p>
                </details>

                <details className="group/item border-b border-white/5 pb-2">
                  <summary className="list-none flex items-center justify-between cursor-pointer font-bold text-xs text-gray-200 select-none">
                    <span>2. How do I buy $ANSEM?</span>
                    <span className="transition-transform duration-300 group-open/item:rotate-180 text-brand-green text-[10px]">▼</span>
                  </summary>
                  <div className="mt-2 text-xs text-gray-400 leading-relaxed flex flex-col gap-1.5">
                    <p>Buying $ANSEM is easy, even for beginners:</p>
                    <ol className="list-decimal pl-4 flex flex-col gap-1">
                      <li>Create a Solana wallet (like <a href="https://phantom.app" target="_blank" rel="noopener noreferrer" className="text-brand-green hover:underline">Phantom</a> or <a href="https://solflare.com" target="_blank" rel="noopener noreferrer" className="text-brand-green hover:underline">Solflare</a>).</li>
                      <li>Fund it with SOL (buy SOL from an exchange like Coinbase, Binance, or Kraken and send it to your wallet address).</li>
                      <li>Go to a decentralized swap like <a href="https://jup.ag" target="_blank" rel="noopener noreferrer" className="text-brand-green hover:underline font-bold">Jupiter</a> or Raydium, paste the mint address: <code className="bg-black/45 px-1 py-0.5 rounded font-mono text-[10px] text-brand-gold select-all">9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump</code>, and swap SOL for $ANSEM.</li>
                    </ol>
                  </div>
                </details>

                <details className="group/item border-b border-white/5 pb-2">
                  <summary className="list-none flex items-center justify-between cursor-pointer font-bold text-xs text-gray-200 select-none">
                    <span>3. What is Bullpen and why should I use it?</span>
                    <span className="transition-transform duration-300 group-open/item:rotate-180 text-brand-green text-[10px]">▼</span>
                  </summary>
                  <p className="mt-2 text-xs text-gray-400 leading-relaxed">
                    Bullpen is the all-in-one platform for the Solana memecoin community. Instead of hopping between various websites, Bullpen combines reward claims, community tracking, and social bullposting in one single profile! Claim here using our referral: <a href="https://app.bullpen.fi/claim?ref=Kellycryptos" target="_blank" rel="noopener noreferrer" className="text-brand-green hover:underline font-bold">app.bullpen.fi/claim?ref=Kellycryptos</a>.
                  </p>
                </details>

                <details className="group/item border-b border-white/5 pb-2">
                  <summary className="list-none flex items-center justify-between cursor-pointer font-bold text-xs text-gray-200 select-none">
                    <span>4. How do I claim rewards / airdrop on Bullpen?</span>
                    <span className="transition-transform duration-300 group-open/item:rotate-180 text-brand-green text-[10px]">▼</span>
                  </summary>
                  <p className="mt-2 text-xs text-gray-400 leading-relaxed">
                    Claiming is simple: visit the Kellycryptos profile at <a href="https://bullpen.fi/@Kellycryptos" target="_blank" rel="noopener noreferrer" className="text-brand-green hover:underline font-bold">bullpen.fi/@Kellycryptos</a>, connect your X (Twitter) account to verify your active status, import the Solana wallet holding your $ANSEM tokens, and participate on the platform to multiply your rewards!
                  </p>
                </details>

                <details className="group/item border-b border-white/5 pb-2">
                  <summary className="list-none flex items-center justify-between cursor-pointer font-bold text-xs text-gray-200 select-none">
                    <span>5. Is this safe? (Wallet + security tips)</span>
                    <span className="transition-transform duration-300 group-open/item:rotate-180 text-brand-green text-[10px]">▼</span>
                  </summary>
                  <div className="mt-2 text-xs text-gray-400 leading-relaxed flex flex-col gap-1.5">
                    <p>Yes, 100% safe! This Oracle only scans public blockchain balances. We will <b>never</b> ask for your private keys, seed phrases, or credentials.</p>
                    <p className="font-bold text-white">Critical Security Tips:</p>
                    <ul className="list-disc pl-4 flex flex-col gap-1">
                      <li>Never share your seed phrase or private key with anyone.</li>
                      <li>Always double-check website URLs before linking your wallet.</li>
                      <li>Consider using a separate "burner" wallet for testing new tools.</li>
                    </ul>
                  </div>
                </details>

                <details className="group/item border-b border-white/5 pb-2">
                  <summary className="list-none flex items-center justify-between cursor-pointer font-bold text-xs text-gray-200 select-none">
                    <span>6. What is my allocation card for?</span>
                    <span className="transition-transform duration-300 group-open/item:rotate-180 text-brand-green text-[10px]">▼</span>
                  </summary>
                  <p className="mt-2 text-xs text-gray-400 leading-relaxed">
                    Your allocation card ranks your Solana wallet holdings and calculates your simulated airdrop. Click <b>Copy Image</b> to copy it directly, or <b>Download Card</b>, and paste it into your X posts to show off your rank, invite others to test their bags, and build the herd!
                  </p>
                </details>

                <details className="group/item">
                  <summary className="list-none flex items-center justify-between cursor-pointer font-bold text-xs text-gray-200 select-none">
                    <span>7. How can I join the community?</span>
                    <span className="transition-transform duration-300 group-open/item:rotate-180 text-brand-green text-[10px]">▼</span>
                  </summary>
                  <p className="mt-2 text-xs text-gray-400 leading-relaxed">
                    Follow <a href="https://x.com/kellycryptos" target="_blank" rel="noopener noreferrer" className="text-brand-green hover:underline font-bold">@kellycryptos</a> on X (Twitter), start creating bullposts on Bullpen, and join the active discussions online to learn, grow, and charge forward in the Solana ecosystem!
                  </p>
                </details>
                
              </div>
            </details>
          </div>
        </section>

        {/* RIGHT COLUMN: The Chat Terminal */}
        <section className="lg:col-span-7 flex flex-col glass-panel rounded-3xl green-glow-border overflow-hidden min-h-[480px]">
          {/* Chat Header */}
          <div className="bg-brand-slate px-5 py-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-green animate-pulse-slow" />
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
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 custom-scrollbar max-h-[440px]">
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
                      ? 'bg-brand-green text-black font-bold rounded-tr-none'
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
              className="text-xs bg-white/5 border border-white/5 hover:border-brand-green/40 hover:text-brand-green text-gray-300 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all duration-300 cursor-pointer"
            >
              <TrendingUp className="w-3.5 h-3.5 text-brand-green" /> Price Prediction
            </button>
            <button
              onClick={() => triggerQuickAction('lore')}
              className="text-xs bg-white/5 border border-white/5 hover:border-brand-green/40 hover:text-brand-green text-gray-300 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all duration-300 cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-400" /> Teach Me Lore
            </button>
            <button
              onClick={() => triggerQuickAction('roast')}
              className="text-xs bg-white/5 border border-white/5 hover:border-brand-green/40 hover:text-brand-green text-gray-300 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all duration-300 cursor-pointer"
            >
              <Skull className="w-3.5 h-3.5 text-brand-red animate-pulse" /> Roast Me
            </button>
            <button
              onClick={() => triggerQuickAction('motivate')}
              className="text-xs bg-white/5 border border-white/5 hover:border-brand-green/40 hover:text-brand-green text-gray-300 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all duration-300 cursor-pointer"
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
                className="flex-1 bg-black border border-white/10 focus:border-brand-green focus:ring-1 focus:ring-brand-green focus:outline-none rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 transition-all duration-300"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || chatLoading}
                className="bg-brand-green hover:bg-brand-green-dark text-black p-3 rounded-xl flex items-center justify-center transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-brand-green/10 animate-pulse-slow"
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
            className="text-brand-green hover:text-brand-green-dark hover:underline flex items-center gap-1 transition-all duration-300"
          >
            <Twitter className="w-3.5 h-3.5 fill-current" /> Built by @kellycryptos
          </a>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <a
            href="https://app.bullpen.fi/claim?ref=Kellycryptos"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-gold hover:text-brand-gold-dark hover:underline font-bold transition-all duration-300"
          >
            🔥 Claim $ANSEM Rewards (Ref: Kellycryptos)
          </a>
          <span className="hidden sm:inline text-gray-700">|</span>
          <span className="text-[10px] text-gray-600 font-mono">
            Mint Address: 9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump
          </span>
        </div>
      </footer>
    </div>
  );
}
