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

// Helper to preload external images with CORS configuration
const preloadImage = (src: string) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });

interface IntelRecipient {
  wallet: string;
  received: number;
  heldBefore: number;
  status: 'holding' | 'sold_some' | 'sold_all';
  stillHolds: number;
  estSoldFor: number;
}

const MOCK_INTEL_RECIPIENTS: IntelRecipient[] = [
  { wallet: '8xG2P9vD2mKswT19K3h4j8y6LqWzR9p23xMv', received: 1250000, heldBefore: 0, status: 'holding', stillHolds: 1250000, estSoldFor: 0 },
  { wallet: 'D9sP3xMf5kGvQ7t9L3h4j8y6LqWzR9p23xMv', received: 750000, heldBefore: 50000, status: 'sold_some', stillHolds: 300000, estSoldFor: 112500 },
  { wallet: 'FpQ1tQw2sLf5kGvQ7t9L3h4j8y6LqWzR9p23xMv', received: 500000, heldBefore: 120000, status: 'sold_all', stillHolds: 0, estSoldFor: 125000 },
  { wallet: 'J7sT9pLm8xG2P9vD2mKswT19K3h4j8y6LqWz', received: 350000, heldBefore: 0, status: 'holding', stillHolds: 350000, estSoldFor: 0 },
  { wallet: 'K3pW5vNx7sT9pLm8xG2P9vD2mKswT19K3h4', received: 200000, heldBefore: 10000, status: 'sold_some', stillHolds: 50000, estSoldFor: 37500 },
  { wallet: 'A2rT8mKp5vNx7sT9pLm8xG2P9vD2mKswT19K', received: 150000, heldBefore: 5000, status: 'holding', stillHolds: 150000, estSoldFor: 0 },
  { wallet: 'H6yG3xWzD9sP3xMf5kGvQ7t9L3h4j8y6LqWz', received: 100000, heldBefore: 0, status: 'sold_all', stillHolds: 0, estSoldFor: 25000 },
  { wallet: 'B5tP7nLkK3pW5vNx7sT9pLm8xG2P9vD2mKsw', received: 75000, heldBefore: 2000, status: 'sold_some', stillHolds: 25000, estSoldFor: 12500 },
  { wallet: 'C9yQ2pQwA2rT8mKp5vNx7sT9pLm8xG2P9vD2m', received: 50000, heldBefore: 500, status: 'holding', stillHolds: 50000, estSoldFor: 0 },
  { wallet: 'E1wD6tRxH6yG3xWzD9sP3xMf5kGvQ7t9L3h4', received: 25000, heldBefore: 0, status: 'sold_all', stillHolds: 0, estSoldFor: 6250 }
];

const MOCK_HOLDERS_OVER_TIME = [
  { day: 'Day 1', holders: 10500 },
  { day: 'Day 2', holders: 11200 },
  { day: 'Day 3', holders: 11800 },
  { day: 'Day 4', holders: 12100 },
  { day: 'Day 5', holders: 12450 },
  { day: 'Day 6', holders: 12650 },
  { day: 'Day 7', holders: 12854 }
];

export default function Home() {
  // Tab Switcher state
  const [activeTab, setActiveTab] = useState<'scanner' | 'simulator' | 'intel'>('scanner');

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

  // Dynamic Avatar States (unavatar.io)
  const [avatarUrl, setAvatarUrl] = useState('/black-bull-logo.jpg');
  const [cardAvatarUrl, setCardAvatarUrl] = useState('/black-bull-logo.jpg');

  // Simulator Sliders State
  const [simHoldings, setSimHoldings] = useState(50000);
  const [simImpressions, setSimImpressions] = useState(100000);
  const [simSupplyPct, setSimSupplyPct] = useState(10);
  const [simCapIndex, setSimCapIndex] = useState(3); // Defaults to index 3 ($100M cap)

  // Airdrop Intel States
  const [intelData, setIntelData] = useState<{
    success: boolean;
    isMock: boolean;
    recipients: IntelRecipient[];
    totalRecipients: number;
    totalDistributed: number;
    valueAtAirdrop: number;
    valueNow: number;
    stillHoldingCount: number;
    soldCount: number;
    holdersOverTime: { day: string; holders: number }[];
    lastUpdated: string;
  } | null>(null);
  const [intelLoading, setIntelLoading] = useState(false);
  const [intelError, setIntelError] = useState<string | null>(null);
  const [intelFilter, setIntelFilter] = useState<'all' | 'holding' | 'sold_some' | 'sold_all'>('all');
  const [intelSortField, setIntelSortField] = useState<'wallet' | 'received' | 'heldBefore' | 'stillHolds' | 'estSoldFor'>('received');
  const [intelSortDirection, setIntelSortDirection] = useState<'asc' | 'desc'>('desc');

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

  // Airdrop Intel Helpers
  const handleSort = (field: 'wallet' | 'received' | 'heldBefore' | 'stillHolds' | 'estSoldFor') => {
    if (intelSortField === field) {
      setIntelSortDirection(intelSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setIntelSortField(field);
      setIntelSortDirection('desc');
    }
  };

  const renderSortIndicator = (field: 'wallet' | 'received' | 'heldBefore' | 'stillHolds' | 'estSoldFor') => {
    if (intelSortField !== field) return null;
    return intelSortDirection === 'asc' ? ' ▲' : ' ▼';
  };

  const getSortedRecipients = () => {
    let filtered = [...(intelData?.recipients || [])];
    if (intelFilter !== 'all') {
      filtered = filtered.filter(r => r.status === intelFilter);
    }
    filtered.sort((a, b) => {
      const aVal = a[intelSortField];
      const bVal = b[intelSortField];
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const comp = aVal.toLowerCase().localeCompare(bVal.toLowerCase());
        return intelSortDirection === 'asc' ? comp : -comp;
      }
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return intelSortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      return 0;
    });
    return filtered;
  };

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

  // Sync card avatar URL with source avatar URL
  useEffect(() => {
    setCardAvatarUrl(avatarUrl);
  }, [avatarUrl]);

  // Fetch Airdrop Intel data function
  const fetchIntel = async () => {
    setIntelLoading(true);
    setIntelError(null);
    try {
      const res = await fetch('/api/airdrop-intel');
      if (!res.ok) {
        throw new Error('Airdrop intelligence node congested...');
      }
      const data = await res.json();
      if (data.success) {
        setIntelData(data);
      } else {
        setIntelError(data.error || 'Failed to fetch on-chain distribution history.');
      }
    } catch (err: any) {
      console.error('[Frontend] Airdrop Intel fetch failed:', err);
      setIntelError(err.message || 'Failed to connect to indexer node.');
    } finally {
      setIntelLoading(false);
    }
  };

  // Trigger Airdrop Intel fetch when activeTab changes to 'intel'
  useEffect(() => {
    if (activeTab === 'intel') {
      fetchIntel();
    }
  }, [activeTab]);

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

  // Helper to capture a card element to a PNG blob with pre-flight check and fallback
  const captureCardToBlob = async (cardElement: HTMLElement): Promise<Blob> => {
    const avatarImgEl = cardElement.querySelector('img[alt="logo"]') as HTMLImageElement | null;
    const targetSrc = cardAvatarUrl;
    
    console.log('[Avatar Debug] targetSrc:', targetSrc, '| initial DOM src:', avatarImgEl?.src);

    if (avatarImgEl && targetSrc) {
      // 1. Force the target URL directly onto the DOM element to bypass React render batching
      if (avatarImgEl.getAttribute('src') !== targetSrc) {
        avatarImgEl.src = targetSrc;
      }

      // 2. Synchronously await the load event of this specific DOM element
      try {
        await new Promise<void>((resolve, reject) => {
          if (avatarImgEl.complete && avatarImgEl.naturalWidth > 0) {
            console.log('[Avatar Debug] DOM image already complete and verified.');
            return resolve();
          }
          console.log('[Avatar Debug] Waiting for onload/onerror on actual DOM image...');
          avatarImgEl.onload = () => {
            console.log('[Avatar Debug] DOM image loaded successfully.');
            resolve();
          };
          avatarImgEl.onerror = (e) => {
            console.warn('[Avatar Debug] DOM image load failed:', e);
            reject(new Error('DOM image load failed'));
          };
          // 2.5s safety timeout
          setTimeout(() => {
            console.warn('[Avatar Debug] Safety timeout reached on DOM image load.');
            resolve();
          }, 2500);
        });
      } catch (err) {
        console.warn('[Avatar Debug] Load promise failed, using fallback image in DOM:', err);
        avatarImgEl.src = '/black-bull-logo.jpg';
        await new Promise<void>((resolve) => {
          if (avatarImgEl.complete && avatarImgEl.naturalWidth > 0) return resolve();
          avatarImgEl.onload = () => resolve();
          avatarImgEl.onerror = () => resolve();
          setTimeout(resolve, 1000);
        });
      }
    }

    // 3. Final pre-flight verification on DOM element
    if (avatarImgEl && !(avatarImgEl.complete && avatarImgEl.naturalWidth > 0)) {
      console.log('[Avatar Debug] Final validation failed (naturalWidth <= 0), forcing local logo fallback...');
      avatarImgEl.src = '/black-bull-logo.jpg';
      await new Promise<void>((resolve) => {
        if (avatarImgEl.complete) return resolve();
        avatarImgEl.onload = () => resolve();
        avatarImgEl.onerror = () => resolve();
        setTimeout(resolve, 1000);
      });
    }

    console.log('[Avatar Debug] Final state before capture:', {
      src: avatarImgEl?.src,
      complete: avatarImgEl?.complete,
      naturalWidth: avatarImgEl?.naturalWidth
    });

    console.log('[Card Debug] Element outerHTML length:', cardElement.outerHTML.length);
    const rect = cardElement.getBoundingClientRect();
    console.log('[Card Debug] Element bounding box:', { width: rect.width, height: rect.height, top: rect.top, left: rect.left });

    try {
      const canvas = await html2canvas(cardElement, {
        scale: 2,
        backgroundColor: '#000000',
        useCORS: true,
        allowTaint: false,
        logging: true, // Verbose logging enabled for debugging
      });

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Blob generation returned null');
      return blob;
    } catch (err: any) {
      console.error('[CAPTURE ERROR] Standard capture failed:', {
        name: err?.name,
        message: err?.message,
        stack: err?.stack,
        raw: err
      });
      
      console.log('[Card Debug] Standard capture failed, attempting fallback to local logo...');
      if (avatarImgEl) {
        avatarImgEl.src = '/black-bull-logo.jpg';
        await new Promise<void>((resolve) => {
          if (avatarImgEl.complete) return resolve();
          avatarImgEl.onload = () => resolve();
          avatarImgEl.onerror = () => resolve();
          setTimeout(resolve, 1000);
        });
      }
      
      try {
        console.log('[Card Debug] Fallback Element outerHTML length:', cardElement.outerHTML.length);
        const fallbackRect = cardElement.getBoundingClientRect();
        console.log('[Card Debug] Fallback Element bounding box:', { width: fallbackRect.width, height: fallbackRect.height, top: fallbackRect.top, left: fallbackRect.left });

        const canvas = await html2canvas(cardElement, {
          scale: 2,
          backgroundColor: '#000000',
          useCORS: true,
          allowTaint: false,
          logging: true, // Verbose logging enabled for debugging
        });
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
        if (!blob) throw new Error('Fallback blob generation returned null');
        return blob;
      } catch (fallbackErr: any) {
        console.error('[CAPTURE ERROR] Fallback capture failed:', {
          name: fallbackErr?.name,
          message: fallbackErr?.message,
          stack: fallbackErr?.stack,
          raw: fallbackErr
        });
        throw fallbackErr;
      }
    } finally {
      // Revert the DOM element src back to the React state cardAvatarUrl to preserve hydration/virtual DOM alignment
      if (avatarImgEl) {
        avatarImgEl.src = cardAvatarUrl;
      }
    }
  };

  const downloadShareCard = async () => {
    const cardElement = document.getElementById('allocation-card') as HTMLElement | null;
    if (!cardElement) return;

    setGeneratingCard(true);
    cardElement.style.opacity = '1'; // Reveal for capture — html2canvas respects CSS opacity
    try {
      const blob = await captureCardToBlob(cardElement);
      const imgData = URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');
      downloadLink.download = `black-bull-allocation-${xInput.trim() || 'anon'}.png`;
      downloadLink.href = imgData;
      downloadLink.click();
      URL.revokeObjectURL(imgData);
    } catch (err: any) {
      console.error('[Canvas] PNG download failed:', err);
      alert('Failed to generate PNG image card, calf!');
    } finally {
      cardElement.style.opacity = ''; // Restore hidden state
      setGeneratingCard(false);
    }
  };

  // Copy Image to Clipboard for Scanner Card
  const copyShareCard = async () => {
    const cardElement = document.getElementById('allocation-card') as HTMLElement | null;
    if (!cardElement) return;

    setCopyingCard(true);
    cardElement.style.opacity = '1'; // Reveal for capture

    // Construct the Promise<Blob> and immediately pass to write to satisfy browser activation timing constraints
    const blobPromise = captureCardToBlob(cardElement);

    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blobPromise,
        }),
      ]);
      alert('📋 Card image copied to clipboard! You can now paste (Ctrl+V) it directly into your X post.');
    } catch (clipErr: any) {
      console.error('[Clipboard] Failed to write image:', clipErr);
      alert('Direct clipboard write blocked by browser permissions! Downloading card instead...');
      downloadShareCard();
    } finally {
      cardElement.style.opacity = ''; // Restore hidden state
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
    const cardElement = document.getElementById('simulator-card') as HTMLElement | null;
    if (!cardElement) return;

    setGeneratingCard(true);
    cardElement.style.opacity = '1'; // Reveal for capture
    try {
      const blob = await captureCardToBlob(cardElement);
      const imgData = URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');
      downloadLink.download = `black-bull-simulation-${xInput.trim() || 'anon'}.png`;
      downloadLink.href = imgData;
      downloadLink.click();
      URL.revokeObjectURL(imgData);
    } catch (err: any) {
      console.error('[Canvas] Simulator PNG download failed:', err);
      alert('Failed to generate PNG image card, calf!');
    } finally {
      cardElement.style.opacity = ''; // Restore hidden state
      setGeneratingCard(false);
    }
  };

  // Copy Image to Clipboard for Simulator Card
  const copySimCard = async () => {
    const cardElement = document.getElementById('simulator-card') as HTMLElement | null;
    if (!cardElement) return;

    setCopyingCard(true);
    cardElement.style.opacity = '1'; // Reveal for capture

    // Construct the Promise<Blob> and immediately pass to write to satisfy browser activation timing constraints
    const blobPromise = captureCardToBlob(cardElement);

    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blobPromise,
        }),
      ]);
      alert('📋 Simulation card copied to clipboard! You can now paste (Ctrl+V) it directly into your X post.');
    } catch (clipErr: any) {
      console.error('[Clipboard] Failed to write image:', clipErr);
      alert('Direct clipboard write blocked by browser permissions! Downloading card instead...');
      downloadSimCard();
    } finally {
      cardElement.style.opacity = ''; // Restore hidden state
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
      {/* WARNING: inside this element, only use literal hex/rgba values (bg-[#...], text-[rgba(...)]) — do NOT use default Tailwind palette classes OR /opacity modifier syntax (e.g. bg-black/60, text-gray-400). Tailwind v4 compiles both to oklch()/color-mix(), which html2canvas cannot parse and will silently break PNG/clipboard export. */}
      {balanceData && (
        <div
          id="allocation-card"
          className="fixed right-0 bottom-0 w-[600px] h-[350px] bg-[#000000] border-2 border-[#10b981] flex flex-col justify-between p-6 text-[#ffffff] font-sans overflow-hidden z-[-50] opacity-[0.01] pointer-events-none"
        >
          <img
            src="/black-bull-logo.jpg"
            className="absolute inset-0 w-full h-full object-cover object-center z-0"
            alt="bull bg"
          />
          <div className="absolute inset-0 bg-[rgba(0,0,0,0.45)] z-10" />

          <div className="flex justify-between items-center border-b border-[rgba(255,255,255,0.1)] pb-4 relative z-20">
            <div>
              <h2 className="text-lg font-black text-[#ffffff] leading-none tracking-tight">THE BLACK BULL AI</h2>
              <span className="text-[9px] text-[#10b981] font-bold tracking-widest uppercase">ANSEM ORACLE</span>
            </div>
            <div className="text-right">
              <span className="text-xs font-black text-[#fbbf24]">$ANSEM</span>
              <p className="text-[7px] text-[#6b7280] font-bold uppercase tracking-widest">Mint: 9cRC...TGpump</p>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center gap-2.5 py-3 text-center relative z-20">
            {/* Centered User Avatar */}
            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-[#10b981] mx-auto relative" style={{ boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }}>
              <img
                src={cardAvatarUrl}
                className="w-full h-full object-cover"
                alt="logo"
                crossOrigin="anonymous"
                referrerPolicy="no-referrer"
                onError={handleAvatarError}
              />
            </div>
            
            <div className="text-[9px] text-[#9ca3af] font-extrabold uppercase tracking-widest mt-1">
              Trench Classification
            </div>
            <div className="text-xl font-black text-[#ffffff] uppercase tracking-wider glow-text-green leading-none">
              {balanceData.tier}
            </div>

            <div className="bg-[rgba(0,0,0,0.6)] border border-[rgba(255,255,255,0.1)] py-2.5 px-6 rounded-xl inline-block mx-auto min-w-[240px]">
              <span className="text-[9px] text-[#9ca3af] font-bold uppercase tracking-wider block">
                Simulated Airdrop Allocation
              </span>
              <span className="text-2xl font-black text-[#10b981] font-mono block my-0.5">
                {balanceData.allocationAmount.toLocaleString()}
              </span>
              <span className="text-[9px] text-[#9ca3af] block font-bold uppercase tracking-widest">
                $ANSEM tokens
              </span>
              <span className="text-lg font-black text-[#fbbf24] font-mono block mt-0.5">
                ${(balanceData.allocationAmount * 0.3).toLocaleString(undefined, { maximumFractionDigits: 0 })} USD
              </span>
            </div>
          </div>

          <div className="flex justify-between items-end border-t border-[rgba(255,255,255,0.1)] pt-4 text-[10px] text-[#6b7280] font-bold relative z-20">
            <div className="flex flex-col gap-0.5">
              <span>User: {balanceData.xHandle ? `@${balanceData.xHandle}` : 'Anon Calf'}</span>
            </div>
            <div className="text-right flex flex-col gap-0.5">
              <span className="text-[#10b981]">Built by @kellycryptos</span>
              <span className="text-[8px] text-[#4b5563] font-mono">the-black-bull-ai.vercel.app</span>
            </div>
          </div>
        </div>
      )}

      {/* Simulator Card Canvas */}
      {/* WARNING: inside this element, only use literal hex/rgba values (bg-[#...], text-[rgba(...)]) — do NOT use default Tailwind palette classes OR /opacity modifier syntax (e.g. bg-black/60, text-gray-400). Tailwind v4 compiles both to oklch()/color-mix(), which html2canvas cannot parse and will silently break PNG/clipboard export. */}
      <div
        id="simulator-card"
        className="fixed right-0 bottom-0 w-[600px] h-[350px] bg-[#000000] border-2 border-[#10b981] flex flex-col justify-between p-6 text-[#ffffff] font-sans overflow-hidden z-[-50] opacity-[0.01] pointer-events-none"
      >
        <img
          src="/black-bull-logo.jpg"
          className="absolute inset-0 w-full h-full object-cover object-center z-0"
          alt="bull bg"
        />
        <div className="absolute inset-0 bg-[rgba(0,0,0,0.45)] z-10" />

        <div className="flex justify-between items-center border-b border-[rgba(255,255,255,0.1)] pb-4 relative z-20">
          <div>
            <h2 className="text-lg font-black text-[#ffffff] leading-none tracking-tight">THE BLACK BULL AI</h2>
            <span className="text-[9px] text-[#10b981] font-bold tracking-widest uppercase">SIMULATION ORACLE</span>
          </div>
          <div className="text-right">
            <span className="text-xs font-black text-[#fbbf24]">$ANSEM</span>
            <p className="text-[7px] text-[#6b7280] font-bold uppercase tracking-widest">Mint: 9cRC...TGpump</p>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center gap-2 py-3 text-center relative z-20">
          {/* Centered User Avatar */}
          <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-[#10b981] mx-auto relative" style={{ boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }}>
            <img
              src={cardAvatarUrl}
              className="w-full h-full object-cover"
              alt="logo"
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
              onError={handleAvatarError}
            />
          </div>

          <div className="text-[9px] text-[#9ca3af] font-extrabold uppercase tracking-widest mt-1">
            Speculative Bull Allocation
          </div>
          <div className="text-xl font-black text-[#10b981] font-mono tracking-tight glow-text-green leading-none">
            {simAllocation.toLocaleString()} $ANSEM
          </div>

          <div className="bg-[rgba(0,0,0,0.6)] border border-[rgba(255,255,255,0.1)] py-2.5 px-6 rounded-xl inline-block mx-auto min-w-[260px]">
            <span className="text-[9px] text-[#9ca3af] font-bold uppercase tracking-wider block">
              Projected Valuation (at {formatMarketCap(selectedMarketCap)} MC)
            </span>
            <span className="text-2xl font-black text-[#fbbf24] font-mono block my-0.5">
              ${simUsdValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} USD
            </span>
          </div>
        </div>

        <div className="flex justify-between items-end border-t border-[rgba(255,255,255,0.1)] pt-4 text-[10px] text-[#6b7280] font-bold relative z-20">
          <div className="flex flex-col gap-0.5">
            <span>User: {xInput.trim() ? `@${xInput.trim().replace(/^@/, '')}` : 'Anon Calf'}</span>
            <span className="text-[8px] text-[#4b5563] font-mono">
              Holdings: {simHoldings.toLocaleString()} $ANSEM | Impressions: {simImpressions.toLocaleString()}
            </span>
          </div>
          <div className="text-right flex flex-col gap-0.5">
            <span className="text-[#10b981]">Built by @kellycryptos</span>
            <span className="text-[8px] text-[#4b5563] font-mono">the-black-bull-ai.vercel.app</span>
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
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full overflow-hidden border-2 border-brand-green bg-black shadow-lg shadow-brand-green/30 ring-4 ring-black/40 z-20">
                <img
                  src={avatarUrl}
                  alt="user avatar"
                  className="w-full h-full object-cover"
                  onError={handleAvatarError}
                />
              </div>
              <div className="absolute bottom-3 left-4">
                <span className="text-[10px] bg-brand-green/20 border border-brand-green/40 text-brand-green px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Oracle Active
                </span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex bg-black/40 border border-white/5 p-1 rounded-xl gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('scanner')}
                className={`flex-1 text-center py-2 px-1 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
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
                className={`flex-1 text-center py-2 px-1 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                  activeTab === 'simulator'
                    ? 'bg-brand-green text-black font-extrabold shadow-md shadow-brand-green/10'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Bull Simulator
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('intel')}
                className={`flex-1 text-center py-2 px-1 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                  activeTab === 'intel'
                    ? 'bg-brand-green text-black font-extrabold shadow-md shadow-brand-green/10'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Airdrop Intel
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
                      <span className="text-2xl font-black text-brand-green font-mono tracking-tight glow-text-green">
                        {balanceData.allocationAmount.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-gray-400 font-extrabold uppercase mt-1">
                        $ANSEM tokens
                      </span>
                    </div>

                    <p className="text-xs text-gray-300 leading-relaxed bg-brand-green/5 border-l-2 border-brand-green p-3 rounded-r-lg font-medium italic">
                      "{balanceData.message}"
                    </p>


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

            {activeTab === 'intel' && (
              <div className="flex flex-col gap-4 animate-fadeIn">
                <div className="bg-brand-green/5 border-l-2 border-brand-green p-3 rounded-r-lg">
                  <p className="text-xs text-gray-300 leading-relaxed font-semibold">
                    Real-time stats and recipient behavior tracker. See who is holding, selling, or loading up!
                  </p>
                </div>

                {/* Loading Skeleton */}
                {intelLoading && !intelData && (
                  <div className="flex flex-col gap-4 animate-pulse">
                    <div className="grid grid-cols-2 gap-3">
                      {[1, 2, 3, 4].map((n) => (
                        <div key={n} className="bg-white/[0.02] border border-white/5 p-4 rounded-xl h-20 flex flex-col justify-between">
                          <div className="h-2 w-16 bg-white/10 rounded" />
                          <div className="h-4 w-24 bg-white/10 rounded mt-1" />
                        </div>
                      ))}
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl h-[130px] flex flex-col justify-between">
                      <div className="h-2 w-28 bg-white/10 rounded" />
                      <div className="h-12 w-full bg-white/5 rounded mt-2" />
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl h-48 flex flex-col justify-between">
                      <div className="h-4 w-full bg-white/10 rounded" />
                      <div className="h-4 w-full bg-white/5 rounded mt-2" />
                      <div className="h-4 w-full bg-white/5 rounded mt-2" />
                    </div>
                  </div>
                )}

                {/* Error Banner */}
                {intelError && !intelData && (
                  <div className="bg-brand-red/10 border border-brand-red/30 text-brand-red p-4 rounded-xl text-xs flex flex-col gap-2">
                    <div className="font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" /> Indexer Node Congested
                    </div>
                    <p>{intelError}</p>
                    <button
                      type="button"
                      onClick={fetchIntel}
                      className="bg-brand-red/20 hover:bg-brand-red/30 text-brand-red py-2 px-4 rounded-lg font-bold uppercase transition-colors self-start mt-1 cursor-pointer"
                    >
                      Retry Fetch
                    </button>
                  </div>
                )}

                {/* Loaded View */}
                {intelData && (
                  <>
                    {/* Mock Data Warning Notice */}
                    {intelData.isMock && (
                      <div className="bg-brand-gold/10 border border-brand-gold/30 text-brand-gold p-3.5 rounded-xl text-[10px] sm:text-xs flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 animate-pulse" />
                        <div>
                          <span className="font-bold">Simulated Data Active:</span> Configure <code className="bg-black/50 px-1 py-0.5 rounded font-mono">HELIUS_API_KEY</code> in environment variables to retrieve live on-chain distribution intelligence.
                        </div>
                      </div>
                    )}

                    {/* Aggregate Stats Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/[0.02] border border-white/5 p-3 rounded-xl flex flex-col justify-between">
                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Total Recipients</span>
                        <span className="text-lg font-black text-white font-mono mt-1">
                          {intelData.totalRecipients.toLocaleString()}
                        </span>
                      </div>
                      <div className="bg-white/[0.02] border border-white/5 p-3 rounded-xl flex flex-col justify-between">
                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Total Distributed</span>
                        <span className="text-lg font-black text-[#10b981] font-mono mt-1">
                          {(intelData.totalDistributed / 1e6).toFixed(2)}M <span className="text-[10px] text-gray-500 font-sans font-normal">$ANSEM</span>
                        </span>
                      </div>
                      <div className="bg-white/[0.02] border border-white/5 p-3 rounded-xl flex flex-col justify-between">
                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Airdrop Value (At Launch vs Now)</span>
                        <div className="flex flex-col mt-1">
                          <span className="text-xs text-gray-500 font-mono font-bold">
                            ${Math.round(intelData.valueAtAirdrop).toLocaleString()} <span className="text-[8px] font-sans font-normal">(@ $0.01)</span>
                          </span>
                          <span className="text-sm font-black text-[#fbbf24] font-mono">
                            ${Math.round(intelData.valueNow).toLocaleString()} <span className="text-[8px] font-sans font-normal">(Current Value)</span>
                          </span>
                        </div>
                      </div>
                      <div className="bg-white/[0.02] border border-white/5 p-3 rounded-xl flex flex-col justify-between">
                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Hold vs Sold Split</span>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-2 bg-brand-red rounded-full overflow-hidden flex">
                            <div
                              className="h-full bg-[#10b981]"
                              style={{ width: `${Math.round((intelData.stillHoldingCount / intelData.totalRecipients) * 100) || 0}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono font-bold text-white whitespace-nowrap">
                            {Math.round((intelData.stillHoldingCount / intelData.totalRecipients) * 100) || 0}% / {100 - (Math.round((intelData.stillHoldingCount / intelData.totalRecipients) * 100) || 0)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Holders Over Time Chart */}
                    <div className="bg-white/[0.02] border border-white/5 p-3 rounded-xl">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Holders Growth (Timeline Distribution)</span>
                        <span className="text-[10px] text-[#10b981] font-mono font-bold flex items-center gap-0.5">
                          <TrendingUp className="w-3 h-3" /> Growth Curve
                        </span>
                      </div>
                      <div className="w-full h-[100px] relative">
                        {(() => {
                          const chartPoints = intelData.holdersOverTime;
                          const maxHolders = Math.max(...chartPoints.map(p => p.holders), 1);
                          const minHolders = Math.min(...chartPoints.map(p => p.holders), 0);
                          const range = maxHolders - minHolders;
                          
                          const coords = chartPoints.map((p, idx) => {
                            const x = Math.round((idx / (chartPoints.length - 1)) * 500);
                            const y = range === 0 ? 50 : Math.round(90 - ((p.holders - minHolders) / range) * 80);
                            return { x, y };
                          });

                          const linePath = coords.map((c, idx) => (idx === 0 ? `M ${c.x},${c.y}` : `L ${c.x},${c.y}`)).join(' ');
                          const fillPath = `${linePath} L 500,100 L 0,100 Z`;

                          return (
                            <svg className="w-full h-full" viewBox="0 0 500 100" preserveAspectRatio="none">
                              <defs>
                                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                                </linearGradient>
                              </defs>
                              {/* Grid Lines */}
                              <line x1="0" y1="25" x2="500" y2="25" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                              <line x1="0" y1="50" x2="500" y2="50" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                              <line x1="0" y1="75" x2="500" y2="75" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                              
                              {/* Filled Area */}
                              <path d={fillPath} fill="url(#chartGradient)" />
                              {/* Line Path */}
                              <path
                                d={linePath}
                                fill="none"
                                stroke="#10b981"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                style={{ filter: 'drop-shadow(0px 0px 4px rgba(16, 185, 129, 0.4))' }}
                              />
                              {/* Data dots */}
                              {coords.map((c, idx) => (
                                <circle key={idx} cx={c.x} cy={c.y} r="3" fill="#10b981" />
                              ))}
                            </svg>
                          );
                        })()}
                      </div>
                      <div className="flex justify-between text-[8px] text-gray-500 font-mono font-bold mt-1.5 px-0.5">
                        <span>{intelData.holdersOverTime[0]?.holders || 0} Holders</span>
                        <span>{intelData.holdersOverTime[Math.floor(intelData.holdersOverTime.length / 2)]?.holders || 0}</span>
                        <span>{intelData.holdersOverTime[intelData.holdersOverTime.length - 1]?.holders || 0} Holders</span>
                      </div>
                    </div>

                    {/* Filter Tabs for table */}
                    <div className="flex bg-black/30 border border-white/5 p-0.5 rounded-lg text-[10px] font-bold">
                      {(['all', 'holding', 'sold_some', 'sold_all'] as const).map((filter) => (
                        <button
                          key={filter}
                          type="button"
                          onClick={() => setIntelFilter(filter)}
                          className={`flex-1 text-center py-1.5 rounded uppercase tracking-wider transition-all duration-300 ${
                            intelFilter === filter
                              ? 'bg-[#10b981]/15 text-[#10b981] font-extrabold'
                              : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          {filter.replace('_', ' ')}
                        </button>
                      ))}
                    </div>

                    {/* Recipients Table */}
                    <div className="bg-white/[0.01] border border-white/5 rounded-xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-[10px] text-left border-collapse">
                          <thead>
                            <tr className="border-b border-white/5 bg-black/30 text-gray-400 uppercase font-bold tracking-wider">
                              <th className="py-2.5 px-3 cursor-pointer select-none hover:text-white transition-colors" onClick={() => handleSort('wallet')}>
                                Recipient {renderSortIndicator('wallet')}
                              </th>
                              <th className="py-2.5 px-3 text-right cursor-pointer select-none hover:text-white transition-colors" onClick={() => handleSort('received')}>
                                Received {renderSortIndicator('received')}
                              </th>
                              <th className="py-2.5 px-3 text-right cursor-pointer select-none hover:text-white transition-colors" onClick={() => handleSort('heldBefore')}>
                                Held Before {renderSortIndicator('heldBefore')}
                              </th>
                              <th className="py-2.5 px-3 text-center">Status</th>
                              <th className="py-2.5 px-3 text-right cursor-pointer select-none hover:text-white transition-colors" onClick={() => handleSort('stillHolds')}>
                                Still Holds {renderSortIndicator('stillHolds')}
                              </th>
                              <th className="py-2.5 px-3 text-right cursor-pointer select-none hover:text-white transition-colors" onClick={() => handleSort('estSoldFor')}>
                                Est. Sold For {renderSortIndicator('estSoldFor')}
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 font-mono">
                            {getSortedRecipients().map((r) => {
                              const statusColors = {
                                holding: 'bg-[rgba(16,185,129,0.1)] border-[#10b981] text-[#10b981]',
                                sold_some: 'bg-[rgba(251,191,36,0.1)] border-[#fbbf24] text-[#fbbf24]',
                                sold_all: 'bg-[rgba(239,68,68,0.1)] border-brand-red text-brand-red'
                              };
                              
                              return (
                                <tr key={r.wallet} className="hover:bg-white/[0.01] transition-colors">
                                  <td className="py-2.5 px-3">
                                    <a
                                      href={`https://x.com/search?q=${r.wallet}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-400 hover:underline flex items-center gap-1 font-bold"
                                      title="Search wallet address on X"
                                    >
                                      {r.wallet.slice(0, 4)}...{r.wallet.slice(-4)}
                                      <Twitter className="w-2.5 h-2.5 fill-current opacity-70" />
                                    </a>
                                  </td>
                                  <td className="py-2.5 px-3 text-right text-white">{Math.round(r.received).toLocaleString()}</td>
                                  <td className="py-2.5 px-3 text-right text-gray-400">{Math.round(r.heldBefore).toLocaleString()}</td>
                                  <td className="py-2.5 px-3 text-center">
                                    <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] uppercase font-bold border ${statusColors[r.status]}`}>
                                      {r.status.replace('_', ' ')}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-right text-white font-bold">{Math.round(r.stillHolds).toLocaleString()}</td>
                                  <td className="py-2.5 px-3 text-right text-[#fbbf24] font-bold">
                                    {r.estSoldFor > 0 ? `$${Math.round(r.estSoldFor).toLocaleString()}` : '-'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className="py-2 px-3 bg-black/20 text-[9px] text-gray-500 font-bold text-center border-t border-white/5 uppercase tracking-wider">
                        Last Updated: {new Date(intelData.lastUpdated).toLocaleTimeString()}
                      </div>
                    </div>
                  </>
                )}

                {/* Community Section */}
                <div className="bg-white/[0.01] border border-white/5 rounded-xl p-3.5 mt-1 flex flex-col gap-2">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Community & Resources</span>
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
                    <a
                      href="https://dexscreener.com/solana/9cRCvJ471T58p7C1Y7vLgW777cT2N1K2m3n4"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white/5 hover:bg-brand-green/10 hover:text-brand-green border border-white/5 p-2 rounded-lg transition-all duration-300 flex items-center justify-between"
                    >
                      <span>Dexscreener Chart</span>
                      <span className="text-gray-500">➔</span>
                    </a>
                    <a
                      href="https://solscan.io/token/9cRCvJ471T58p7C1Y7vLgW777cT2N1K2m3n4"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white/5 hover:bg-brand-green/10 hover:text-brand-green border border-white/5 p-2 rounded-lg transition-all duration-300 flex items-center justify-between"
                    >
                      <span>Solscan Ledger</span>
                      <span className="text-gray-500">➔</span>
                    </a>
                    <a
                      href="https://app.bullpen.fi/claim?ref=Kellycryptos"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white/5 hover:bg-brand-gold/10 hover:text-brand-gold border border-white/5 p-2 rounded-lg transition-all duration-300 flex items-center justify-between"
                    >
                      <span>Bullpen Claims</span>
                      <span className="text-gray-500">➔</span>
                    </a>
                    <a
                      href="https://x.com/blknoiz06"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white/5 hover:bg-brand-green/10 hover:text-brand-green border border-white/5 p-2 rounded-lg transition-all duration-300 flex items-center justify-between"
                    >
                      <span>Ansem X Profile</span>
                      <span className="text-gray-500">➔</span>
                    </a>
                  </div>
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
                    <p>Go to the Bullpen claim page at <a href="https://app.bullpen.fi/claim?ref=Kellycryptos" target="_blank" rel="noopener noreferrer" className="text-brand-green hover:underline font-bold">app.bullpen.fi/claim</a></p>
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
                    <span>1. What is $ANSEM?</span>
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
                    Bullpen is the all-in-one platform for the $ANSEM community. Instead of hopping between different sites, Bullpen combines reward claims, community tracking, leaderboards, and social bullposting — all in one clean profile. You can visit the claim page directly at <a href="https://app.bullpen.fi/claim?ref=Kellycryptos" target="_blank" rel="noopener noreferrer" className="text-brand-green hover:underline font-bold">app.bullpen.fi/claim</a>.
                  </p>
                </details>

                <details className="group/item border-b border-white/5 pb-2">
                  <summary className="list-none flex items-center justify-between cursor-pointer font-bold text-xs text-gray-200 select-none">
                    <span>4. How do I claim rewards / airdrop on Bullpen?</span>
                    <span className="transition-transform duration-300 group-open/item:rotate-180 text-brand-green text-[10px]">▼</span>
                  </summary>
                  <p className="mt-2 text-xs text-gray-400 leading-relaxed">
                    Claiming is simple: visit the Bullpen claim page at <a href="https://app.bullpen.fi/claim?ref=Kellycryptos" target="_blank" rel="noopener noreferrer" className="text-brand-green hover:underline font-bold">app.bullpen.fi/claim</a>, connect your X (Twitter) account to verify your active status, import the Solana wallet holding your $ANSEM tokens, and participate on the platform to multiply your rewards!
                  </p>
                </details>

                <details className="group/item border-b border-white/5 pb-2">
                  <summary className="list-none flex items-center justify-between cursor-pointer font-bold text-xs text-gray-200 select-none">
                    <span>5. Is this safe? (Wallet + security tips)</span>
                    <span className="transition-transform duration-300 group-open/item:rotate-180 text-brand-green text-[10px]">▼</span>
                  </summary>
                  <div className="mt-2 text-xs text-gray-400 leading-relaxed flex flex-col gap-1.5">
                    <p>Yes, 105% safe! This Oracle only scans public blockchain balances. We will <b>never</b> ask for your private keys, seed phrases, or credentials.</p>
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
                    <span className="transition-transform duration-300 group-open:item:rotate-180 text-brand-green text-[10px]">▼</span>
                  </summary>
                  <p className="mt-2 text-xs text-gray-400 leading-relaxed">
                    Follow <a href="https://x.com/blknoiz06" target="_blank" rel="noopener noreferrer" className="text-brand-green hover:underline font-bold">@blknoiz06</a> on X (Twitter), start creating bullposts, and join the active discussions online to learn, grow, and charge forward in the Solana ecosystem!
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
