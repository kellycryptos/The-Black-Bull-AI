'use client';

// Skip static pre-render — prevents OOM during Next.js build's static generation phase.
// This page is a fully client-rendered component; dynamic serving has no UX cost.
export const dynamic = 'force-dynamic';


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
  Home as HomeIcon,
  Trophy,
  MessageSquare,
  Briefcase,
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



export default function Home() {
  // Tab Switcher / View state with localStorage persistence
  const [activeView, setActiveView] = useState<'overview' | 'bag' | 'leaderboard' | 'simulator' | 'chat' | 'guide'>('overview');

  // Load persisted view state on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('ansem_dashboard_view');
      if (saved) {
        // Safe check for valid view names
        const validViews = ['overview', 'bag', 'leaderboard', 'simulator', 'chat', 'guide'];
        if (validViews.includes(saved)) {
          setActiveView(saved as any);
        }
      }
    }
  }, []);

  // Save view state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('ansem_dashboard_view', activeView);
    }
  }, [activeView]);

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

  const getLeaderboardData = (): IntelRecipient[] => {
    const list = [...(intelData?.recipients || [])];
    list.sort((a, b) => {
      const aPct = a.received > 0 ? a.stillHolds / a.received : 0;
      const bPct = b.received > 0 ? b.stillHolds / b.received : 0;
      if (Math.abs(aPct - bPct) > 0.0001) {
        return bPct - aPct;
      }
      return b.received - a.received;
    });
    return list;
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
    const handle = xInput.trim() || balanceData?.xHandle || '';
    if (handle.trim()) {
      const cleanHandle = handle.trim().replace(/^@/, '');
      setAvatarUrl(`https://unavatar.io/twitter/${cleanHandle}`);
    } else {
      setAvatarUrl('/black-bull-logo.jpg');
    }
  }, [balanceData, xInput]);

  // Sync card avatar URL with source avatar URL
  useEffect(() => {
    setCardAvatarUrl(avatarUrl);
  }, [avatarUrl]);

  // 4. Debounced auto-fetch for top bar wallet input changes (checks for valid Solana address length)
  useEffect(() => {
    const sanitized = walletInput.trim();
    if (!sanitized || sanitized.length < 32 || sanitized.length > 44) return;

    const delayDebounce = setTimeout(() => {
      const mockEvent = { preventDefault: () => {} } as React.FormEvent;
      handleCheck(mockEvent);
    }, 600);

    return () => clearTimeout(delayDebounce);
  }, [walletInput]);

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

  // Trigger Airdrop Intel fetch when activeView changes to 'leaderboard' or 'overview'
  useEffect(() => {
    if (activeView === 'leaderboard' || activeView === 'overview') {
      fetchIntel();
    }
  }, [activeView]);

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
    <div className="min-h-screen bg-brand-black text-white flex flex-col md:flex-row relative">
      
      {/* ---------------- OFF-SCREEN IMAGE GENERATION CANVASES ---------------- */}
      {/* Scanner Card Canvas */}
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

      {/* ---------------- 1. FIXED LEFT SIDEBAR (DESKTOP) ---------------- */}
      <aside className="hidden md:flex md:w-60 bg-black/40 border-r border-white/5 flex-col justify-between p-5 shrink-0 select-none">
        <div className="flex flex-col gap-6">
          {/* Brand header */}
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 rounded-full overflow-hidden border border-brand-green">
              <img src="/black-bull-logo.jpg" alt="Logo" className="object-cover w-full h-full" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black tracking-tight text-white glow-text-green">THE BLACK BULL</span>
              <span className="text-[8px] text-brand-green font-bold tracking-widest uppercase">AI ORACLE</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1">
            {[
              { id: 'overview', label: 'Overview', icon: Home },
              { id: 'bag', label: 'My Bag', icon: Briefcase },
              { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
              { id: 'simulator', label: 'Simulator', icon: TrendingUp },
              { id: 'chat', label: 'Bull Chat', icon: MessageSquare },
              { id: 'guide', label: 'Guide / FAQ', icon: BookOpen },
            ].map((link) => {
              const Icon = link.icon;
              const isActive = activeView === link.id;
              return (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => setActiveView(link.id as any)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer text-left border ${
                    isActive
                      ? 'bg-brand-green/10 text-brand-green border-brand-green/20'
                      : 'text-gray-400 hover:text-white hover:bg-white/[0.02] border-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {link.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Creator stamp */}
        <div className="flex flex-col gap-2 pt-4 border-t border-white/5 text-[9px] text-gray-500 font-semibold">
          <a
            href="https://x.com/kellycryptos"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-brand-green transition-colors"
          >
            <Twitter className="w-3.5 h-3.5 fill-current" /> Built by @kellycryptos
          </a>
          <span className="text-[8px] text-gray-600 font-mono select-all">
            Mint: 9cRC...TGpump
          </span>
        </div>
      </aside>

      {/* ---------------- 2. MAIN CONTENT WRAPPER ---------------- */}
      <div className="flex-1 flex flex-col pb-20 md:pb-6 min-h-screen overflow-x-hidden">
        
        {/* TOP BAR */}
        <header className="w-full border-b border-white/5 bg-black/20 py-4 px-4 sm:px-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between shrink-0 z-10">
          <div className="flex items-center justify-between lg:justify-start gap-4">
            {/* Mobile brand logo header */}
            <div className="flex items-center gap-2 md:hidden">
              <div className="relative w-7 h-7 rounded-full overflow-hidden border border-brand-green">
                <img src="/black-bull-logo.jpg" alt="Logo" className="object-cover w-full h-full" />
              </div>
              <span className="text-xs font-black text-white uppercase tracking-wider">The Black Bull</span>
            </div>

            {/* Price Ticker */}
            <div className="flex items-center gap-3 bg-black/40 border border-white/5 py-1.5 px-3 rounded-xl">
              <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold">
                $ANSEM
              </span>
              {priceLoading && !priceData ? (
                <span className="text-xs font-mono text-brand-green animate-pulse">Loading...</span>
              ) : priceError ? (
                <span className="text-xs font-mono text-brand-red flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Congested
                </span>
              ) : priceData ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono font-bold text-white">
                    ${priceData.priceUsd.toFixed(6)}
                  </span>
                  <span
                    className={`text-[9px] font-mono font-bold flex items-center ${
                      priceData.priceChange24h >= 0 ? 'text-green-500' : 'text-brand-red'
                    }`}
                  >
                    {priceData.priceChange24h >= 0 ? '+' : ''}
                    {priceData.priceChange24h.toFixed(2)}%
                  </span>
                </div>
              ) : (
                <span className="text-xs font-mono text-gray-400">N/A</span>
              )}
              <button
                type="button"
                onClick={fetchPrice}
                disabled={priceLoading}
                className="p-1 rounded bg-white/5 hover:bg-brand-green/10 hover:text-brand-green transition-all duration-300 disabled:opacity-40 cursor-pointer"
                title="Refresh Price"
              >
                <RefreshCw className={`w-3 h-3 ${priceLoading ? 'animate-spin text-brand-green' : ''}`} />
              </button>
            </div>
          </div>

          {/* Shared Header input fields */}
          <form onSubmit={handleCheck} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
            <div className="relative flex-1 sm:w-36">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 font-mono text-xs">@</span>
              <input
                type="text"
                placeholder="X handle"
                value={xInput}
                onChange={(e) => setXInput(e.target.value)}
                className="w-full bg-black/50 border border-white/10 hover:border-white/20 focus:border-brand-green focus:outline-none rounded-xl pl-6 pr-2 py-2 text-xs text-white font-mono placeholder:text-gray-600 transition-all duration-300"
              />
            </div>
            <div className="relative flex-1 sm:w-60">
              <input
                type="text"
                placeholder="Solana wallet address"
                value={walletInput}
                onChange={(e) => setWalletInput(e.target.value)}
                className="w-full bg-black/50 border border-white/10 hover:border-white/20 focus:border-brand-green focus:outline-none rounded-xl px-3 py-2 text-xs text-white font-mono placeholder:text-gray-600 transition-all duration-300"
              />
            </div>
            <button
              type="submit"
              disabled={checkerLoading}
              className="bg-brand-green hover:bg-brand-green-dark text-black font-extrabold uppercase px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all duration-300 cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              {checkerLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 fill-current" />}
              Scan Bag
            </button>
          </form>
        </header>

        {/* VIEW CONTAINER */}
        <main className="flex-1 p-4 sm:p-6 max-w-5xl w-full mx-auto flex flex-col gap-6 overflow-y-auto">
          
          {/* 1. OVERVIEW VIEW */}
          {activeView === 'overview' && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              {/* Compact Live Vitals Row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">ANSEM Price</span>
                  <span className="text-base sm:text-lg font-black text-white font-mono mt-1">
                    {priceData ? `$${priceData.priceUsd.toFixed(6)}` : '$0.30'}
                  </span>
                </div>
                <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">24h Change</span>
                  <span className={`text-base sm:text-lg font-black font-mono mt-1 ${priceData && priceData.priceChange24h >= 0 ? 'text-[#10b981]' : 'text-brand-red'}`}>
                    {priceData ? `${priceData.priceChange24h >= 0 ? '+' : ''}${priceData.priceChange24h.toFixed(2)}%` : '+12.4%'}
                  </span>
                </div>
                <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Market Cap</span>
                  <span className="text-base sm:text-lg font-black text-[#fbbf24] font-mono mt-1">
                    {priceData ? `$${Math.round(priceData.priceUsd * 100).toLocaleString()}M` : '$30.0M'}
                  </span>
                </div>
              </div>

              {/* Personal Snapshot Card */}
              {balanceData ? (
                <div className="glass-panel p-5 rounded-2xl border border-brand-green/20 green-glow-border flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-brand-green/5 blur-2xl rounded-full" />
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-brand-green bg-black ring-4 ring-black/40 shrink-0">
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" onError={handleAvatarError} />
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black text-white">{balanceData.xHandle ? `@${balanceData.xHandle}` : 'Anon Calf'}</span>
                        <span className="text-[9px] bg-brand-green/20 border border-brand-green/40 text-brand-green px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                          {balanceData.tier}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 font-medium mt-1">
                        Holdings: <span className="text-white font-mono font-bold">{balanceData.formattedBalance} $ANSEM</span>
                      </span>
                      <span className="text-xs text-gray-400 font-medium">
                        Airdrop Allocation: <span className="text-[#10b981] font-mono font-bold">{balanceData.allocationAmount.toLocaleString()} $ANSEM</span>
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveView('bag')}
                    className="bg-brand-green hover:bg-brand-green/80 text-black text-xs font-black uppercase py-3 px-5 rounded-xl transition-all duration-300 cursor-pointer shrink-0 z-10 shadow-lg shadow-brand-green/10"
                  >
                    Export Share Card ➔
                  </button>
                </div>
              ) : (
                <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-black text-white">CALF! YOUR BAG IS UNTRACKED! 🐂</span>
                    <p className="text-xs text-gray-400 leading-relaxed max-w-md font-semibold">
                      Paste your Solana wallet address in the top bar to scan your holdings, qualify for your simulated allocation card, and access the leaderboards.
                    </p>
                  </div>
                  <div className="bg-brand-green/10 border border-brand-green/20 text-brand-green text-xs font-extrabold py-3 px-4 rounded-xl text-center select-none uppercase tracking-wider animate-pulse">
                    Paste Address Above
                  </div>
                </div>
              )}

              {/* Top 5 Diamond Hands mini-leaderboard */}
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Top 5 Diamond Hands Preview</span>
                  <button
                    type="button"
                    onClick={() => setActiveView('leaderboard')}
                    className="text-[10px] text-brand-green hover:underline font-extrabold uppercase cursor-pointer"
                  >
                    View Full Leaderboard ➔
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px] text-left border-collapse font-mono">
                    <thead>
                      <tr className="border-b border-white/5 text-gray-500 uppercase font-bold tracking-wider">
                        <th className="py-2 px-1">Rank</th>
                        <th className="py-2 px-1">Wallet</th>
                        <th className="py-2 px-1 text-right">Received</th>
                        <th className="py-2 px-1 text-center">Status</th>
                        <th className="py-2 px-1 text-right">% Held</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {(getLeaderboardData().slice(0, 5).length > 0 ? getLeaderboardData().slice(0, 5) : [
                        { wallet: '8xG2P9vD2mKswT19K3h4j8y6LqWzR9p23xMv', received: 1250000, status: 'holding', stillHolds: 1250000 },
                        { wallet: 'D9sP3xMf5kGvQ7t9L3h4j8y6LqWzR9p23xMv', received: 750000, status: 'sold_some', stillHolds: 300000 },
                        { wallet: 'J7sT9pLm8xG2P9vD2mKswT19K3h4j8y6LqWz', received: 350000, status: 'holding', stillHolds: 350000 },
                        { wallet: 'K3pW5vNx7sT9pLm8xG2P9vD2mKswT19K3h4', received: 200000, status: 'sold_some', stillHolds: 50000 },
                        { wallet: 'A2rT8mKp5vNx7sT9pLm8xG2P9vD2mKswT19K', received: 150000, status: 'holding', stillHolds: 150000 }
                      ]).map((r: any, idx: number) => {
                        const statusColors = {
                          holding: 'bg-[rgba(16,185,129,0.1)] border-[#10b981] text-[#10b981]',
                          sold_some: 'bg-[rgba(251,191,36,0.1)] border-[#fbbf24] text-[#fbbf24]',
                          sold_all: 'bg-[rgba(239,68,68,0.1)] border-brand-red text-brand-red'
                        };
                        const pct = r.received > 0 ? Math.min(100, Math.round((r.stillHolds / r.received) * 100)) : 0;
                        return (
                          <tr key={r.wallet} className="hover:bg-white/[0.01]">
                            <td className="py-2 px-1 text-gray-500 font-bold"># {idx + 1}</td>
                            <td className="py-2 px-1 text-white font-bold">{r.wallet.slice(0, 4)}...{r.wallet.slice(-4)}</td>
                            <td className="py-2 px-1 text-right text-gray-300">{Math.round(r.received).toLocaleString()}</td>
                            <td className="py-2 px-1 text-center">
                              <span className={`inline-block px-1.5 py-0.2 rounded text-[7px] uppercase font-bold border ${statusColors[r.status as 'holding' | 'sold_some' | 'sold_all']}`}>
                                {r.status.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="py-2 px-1 text-right text-brand-green font-bold">{pct}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Quick Action Navigation Shortcuts */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setActiveView('simulator')}
                  className="glass-panel p-5 rounded-2xl border border-white/5 hover:border-brand-green/30 hover:bg-brand-green/[0.02] flex flex-col items-start gap-2 text-left transition-all duration-300 group cursor-pointer"
                >
                  <span className="w-9 h-9 rounded-xl bg-brand-green/10 flex items-center justify-center text-brand-green group-hover:scale-110 transition-transform">
                    <TrendingUp className="w-5 h-5" />
                  </span>
                  <span className="text-sm font-black text-white mt-1">Speculative Simulator</span>
                  <p className="text-[11px] text-gray-400 leading-relaxed font-semibold">
                    Project ANSEM tokens value at hypothetical market cap valuations.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveView('chat')}
                  className="glass-panel p-5 rounded-2xl border border-white/5 hover:border-brand-green/30 hover:bg-brand-green/[0.02] flex flex-col items-start gap-2 text-left transition-all duration-300 group cursor-pointer"
                >
                  <span className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                    <MessageSquare className="w-5 h-5" />
                  </span>
                  <span className="text-sm font-black text-white mt-1">Trench Communicator</span>
                  <p className="text-[11px] text-gray-400 leading-relaxed font-semibold">
                    Engage with The Black Bull AI agent for savage roasts and motivators.
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* 2. MY BAG VIEW (Airdrop Scanner checker) */}
          {activeView === 'bag' && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              {/* Banner decoration */}
              <div className="relative w-full h-32 rounded-2xl overflow-hidden border border-brand-green/30 green-glow-border shrink-0">
                <img
                  src="/black-bull-logo.jpg"
                  alt="Banner"
                  className="object-cover w-full h-full object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-card via-black/40 to-transparent" />
                <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full overflow-hidden border-2 border-brand-green bg-black shadow-lg shadow-brand-green/30 ring-4 ring-black/40 z-20">
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" onError={handleAvatarError} />
                </div>
                <div className="absolute bottom-2.5 left-4">
                  <span className="text-[10px] bg-brand-green/20 border border-brand-green/40 text-brand-green px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    Oracle Active
                  </span>
                </div>
              </div>

              {checkerError && (
                <div className="bg-brand-red/10 border border-brand-red/30 p-4 rounded-xl flex items-start gap-3 animate-shake">
                  <AlertTriangle className="w-5 h-5 text-brand-red shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-brand-red uppercase tracking-wider">Scan Failed</span>
                    <p className="text-xs text-gray-300 leading-relaxed font-semibold">{checkerError}</p>
                  </div>
                </div>
              )}

              {balanceData ? (
                <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-5 flex flex-col gap-4 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden border border-brand-green relative">
                        <img src={avatarUrl} className="w-full h-full object-cover" alt="Avatar" onError={handleAvatarError} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Detected Weight</span>
                        <span className="text-sm font-mono font-bold text-white">{balanceData.formattedBalance} $ANSEM</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-gray-500 font-bold uppercase tracking-wider">
                      Verified On-Chain
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl flex flex-col justify-between">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Trench Classification</span>
                      <span className="text-base sm:text-lg font-black text-white uppercase tracking-wider mt-1">{balanceData.tier}</span>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl flex flex-col justify-between">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Simulated Allocation</span>
                      <span className="text-base sm:text-lg font-black text-brand-green font-mono mt-1">
                        {balanceData.allocationAmount.toLocaleString()} <span className="text-[10px] text-gray-500 font-sans font-normal">$ANSEM</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
                    <button
                      type="button"
                      onClick={downloadShareCard}
                      disabled={generatingCard || copyingCard}
                      className="w-full sm:flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs transition-all duration-300 cursor-pointer disabled:opacity-50"
                    >
                      <Download className="w-4 h-4 text-brand-green" />
                      {generatingCard ? 'Capturing...' : 'Download Card'}
                    </button>
                    <button
                      type="button"
                      onClick={copyShareCard}
                      disabled={generatingCard || copyingCard}
                      className="w-full sm:flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs transition-all duration-300 cursor-pointer disabled:opacity-50"
                    >
                      <Copy className="w-4 h-4 text-brand-green" />
                      {copyingCard ? 'Copying...' : 'Copy Image'}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={shareToX}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-xs transition-all duration-300 cursor-pointer shadow-md shadow-blue-600/10"
                  >
                    <Twitter className="w-4 h-4 fill-current" />
                    Post Allocation to X
                  </button>
                </div>
              ) : (
                <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-6 text-center flex flex-col items-center justify-center gap-4">
                  <div className="w-14 h-14 bg-brand-green/10 rounded-full flex items-center justify-center text-brand-green">
                    <Wallet className="w-6 h-6 animate-pulse" />
                  </div>
                  <div className="flex flex-col gap-1 max-w-sm">
                    <span className="text-sm font-black text-white uppercase tracking-wider">Unchecked Wallet Address</span>
                    <p className="text-xs text-gray-400 leading-relaxed font-semibold">
                      Please enter your Solana wallet address and optional Twitter handle in the top-bar header to retrieve your allocation status card!
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. LEADERBOARD VIEW */}
          {activeView === 'leaderboard' && (
            <div className="flex flex-col gap-4 animate-fadeIn">
              
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-brand-gold animate-bounce" /> Diamond Hands Leaderboard
                </h2>
                <p className="text-xs text-gray-400 font-semibold leading-relaxed">
                  Ranks airdrop recipients by the percentage of original tokens still held inside their Solana wallets.
                </p>
              </div>

              {intelLoading && !intelData && (
                <div className="flex flex-col gap-4 animate-pulse">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[1, 2, 3, 4].map((n) => (
                      <div key={n} className="bg-white/[0.02] border border-white/5 p-4 rounded-xl h-16 flex flex-col justify-between">
                        <div className="h-1.5 w-16 bg-white/10 rounded" />
                        <div className="h-3.5 w-24 bg-white/10 rounded mt-1" />
                      </div>
                    ))}
                  </div>
                  <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl h-24" />
                  <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl h-48" />
                </div>
              )}

              {intelError && !intelData && (
                <div className="bg-brand-red/10 border border-brand-red/30 text-brand-red p-4 rounded-xl text-xs flex flex-col gap-2">
                  <div className="font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 animate-pulse" /> Live data temporarily unavailable
                  </div>
                  <p className="font-semibold">{intelError}</p>
                  <button
                    type="button"
                    onClick={fetchIntel}
                    className="bg-brand-red/20 hover:bg-brand-red/30 text-brand-red py-2 px-4 rounded-lg font-bold uppercase transition-colors self-start mt-1 cursor-pointer"
                  >
                    Retry Scan
                  </button>
                </div>
              )}

              {intelData && (
                <>
                  {/* Aggregate Stats Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white/[0.02] border border-white/5 p-3 rounded-xl flex flex-col justify-between">
                      <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Total Recipients</span>
                      <span className="text-base sm:text-lg font-black text-white font-mono mt-1">
                        {intelData.totalRecipients.toLocaleString()}
                      </span>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 p-3 rounded-xl flex flex-col justify-between">
                      <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Total Distributed</span>
                      <span className="text-base sm:text-lg font-black text-brand-green font-mono mt-1">
                        {(intelData.totalDistributed / 1e6).toFixed(2)}M <span className="text-[9px] text-gray-500 font-sans font-normal">$ANSEM</span>
                      </span>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 p-3 rounded-xl flex flex-col justify-between">
                      <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Airdrop Value (At Launch vs Now)</span>
                      <div className="flex flex-col mt-1">
                        <span className="text-[10px] text-gray-500 font-mono font-bold leading-none">
                          Launch: ${Math.round(intelData.valueAtAirdrop).toLocaleString()}
                        </span>
                        <span className="text-sm font-black text-[#fbbf24] font-mono mt-0.5 leading-none">
                          Now: ${Math.round(intelData.valueNow).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 p-3 rounded-xl flex flex-col justify-between">
                      <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Hold vs Sold Split</span>
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className="flex-1 h-2 bg-brand-red rounded-full overflow-hidden flex">
                          <div
                            className="h-full bg-[#10b981]"
                            style={{ width: `${Math.round((intelData.stillHoldingCount / intelData.totalRecipients) * 100) || 0}%` }}
                          />
                        </div>
                        <span className="text-[9px] font-mono font-bold text-white whitespace-nowrap">
                          {Math.round((intelData.stillHoldingCount / intelData.totalRecipients) * 100) || 0}% Held
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Holders Over Time Chart */}
                  {intelData.holdersOverTime && intelData.holdersOverTime.length > 0 ? (
                    <div className="bg-white/[0.02] border border-white/5 p-3 rounded-xl">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Holders Growth (Timeline Distribution)</span>
                        <span className="text-[9px] text-[#10b981] font-mono font-bold flex items-center gap-0.5">
                          <TrendingUp className="w-3 h-3" /> Growth Curve
                        </span>
                      </div>
                      <div className="w-full h-[80px] relative">
                        {(() => {
                          const chartPoints = intelData.holdersOverTime;
                          const maxHolders = Math.max(...chartPoints.map(p => p.holders), 1);
                          const minHolders = Math.min(...chartPoints.map(p => p.holders), 0);
                          const range = maxHolders - minHolders;
                          
                          const coords = chartPoints.map((p, idx) => {
                            const x = Math.round((idx / (chartPoints.length - 1)) * 500);
                            const y = range === 0 ? 40 : Math.round(75 - ((p.holders - minHolders) / range) * 60);
                            return { x, y };
                          });

                          const linePath = coords.map((c, idx) => (idx === 0 ? `M ${c.x},${c.y}` : `L ${c.x},${c.y}`)).join(' ');
                          const fillPath = `${linePath} L 500,80 L 0,80 Z`;

                          return (
                            <svg className="w-full h-full" viewBox="0 0 500 80" preserveAspectRatio="none">
                              <defs>
                                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                                </linearGradient>
                              </defs>
                              <line x1="0" y1="20" x2="500" y2="20" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                              <line x1="0" y1="40" x2="500" y2="40" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                              <line x1="0" y1="60" x2="500" y2="60" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                              
                              <path d={fillPath} fill="url(#chartGradient)" />
                              <path
                                d={linePath}
                                fill="none"
                                stroke="#10b981"
                                strokeWidth="2"
                                strokeLinecap="round"
                                style={{ filter: 'drop-shadow(0px 0px 3px rgba(16, 185, 129, 0.3))' }}
                              />
                              {coords.map((c, idx) => (
                                <circle key={idx} cx={c.x} cy={c.y} r="2.5" fill="#10b981" />
                              ))}
                            </svg>
                          );
                        })()}
                      </div>
                      <div className="flex justify-between text-[7px] text-gray-500 font-mono font-bold mt-1 px-0.5">
                        <span>{intelData.holdersOverTime[0]?.holders || 0} Holders</span>
                        <span>{intelData.holdersOverTime[Math.floor(intelData.holdersOverTime.length / 2)]?.holders || 0}</span>
                        <span>{intelData.holdersOverTime[intelData.holdersOverTime.length - 1]?.holders || 0} Holders</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white/[0.01] border border-white/5 p-3 rounded-xl text-[10px] text-gray-400 font-semibold text-center italic select-none uppercase tracking-wider">
                      Timeline distribution logs are currently being synced. Showing live holder count: {intelData.stillHoldingCount}.
                    </div>
                  )}

                  {/* User rank highlight notice */}
                  {(() => {
                    if (!balanceData) return null;
                    const userWallet = balanceData.wallet;
                    const sorted = getLeaderboardData();
                    const userIndex = sorted.findIndex(r => r.wallet.toLowerCase() === userWallet.toLowerCase());
                    
                    if (userIndex === -1) return null;
                    const rank = userIndex + 1;
                    const record = sorted[userIndex];
                    const pctHeld = record.received > 0 ? Math.min(100, Math.round((record.stillHolds / record.received) * 100)) : 0;
                    
                    return (
                      <div className="bg-brand-green/10 border border-brand-green/20 text-brand-green p-4 rounded-xl flex items-center justify-between text-xs font-bold animate-fadeIn">
                        <span>Your Wallet Rank: <span className="font-extrabold font-mono text-white"># {rank}</span></span>
                        <span>Holding: <span className="font-extrabold font-mono text-white">{pctHeld}%</span> of airdrop</span>
                      </div>
                    );
                  })()}

                  {/* Table Filters */}
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

                  {/* Full ranked table */}
                  <div className="bg-white/[0.01] border border-white/5 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-[10px] text-left border-collapse">
                        <thead>
                          <tr className="border-b border-white/5 bg-black/30 text-gray-400 uppercase font-bold tracking-wider">
                            <th className="py-2.5 px-3">Rank</th>
                            <th className="py-2.5 px-3 cursor-pointer hover:text-white" onClick={() => handleSort('wallet')}>
                              Recipient {renderSortIndicator('wallet')}
                            </th>
                            <th className="py-2.5 px-3 text-right cursor-pointer hover:text-white" onClick={() => handleSort('received')}>
                              Received {renderSortIndicator('received')}
                            </th>
                            <th className="py-2.5 px-3 text-center">Status</th>
                            <th className="py-2.5 px-3 text-right cursor-pointer hover:text-white" onClick={() => handleSort('stillHolds')}>
                              Still Holds {renderSortIndicator('stillHolds')}
                            </th>
                            <th className="py-2.5 px-3 text-right">% Held</th>
                            <th className="py-2.5 px-3 text-right cursor-pointer hover:text-white" onClick={() => handleSort('estSoldFor')}>
                              Est. Sold For {renderSortIndicator('estSoldFor')}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 font-mono">
                          {getSortedRecipients().map((r, index) => {
                            const sortedList = getLeaderboardData();
                            const globalIndex = sortedList.findIndex(item => item.wallet === r.wallet);
                            const rank = globalIndex !== -1 ? globalIndex + 1 : index + 1;
                            
                            const statusColors = {
                              holding: 'bg-[rgba(16,185,129,0.1)] border-[#10b981] text-[#10b981]',
                              sold_some: 'bg-[rgba(251,191,36,0.1)] border-[#fbbf24] text-[#fbbf24]',
                              sold_all: 'bg-[rgba(239,68,68,0.1)] border-brand-red text-brand-red'
                            };
                            
                            const pct = r.received > 0 ? Math.min(100, Math.round((r.stillHolds / r.received) * 100)) : 0;
                            const isUser = balanceData && balanceData.wallet.toLowerCase() === r.wallet.toLowerCase();
                            
                            return (
                              <tr key={r.wallet} className={`transition-colors ${isUser ? 'bg-brand-green/5 hover:bg-brand-green/10' : 'hover:bg-white/[0.01]'}`}>
                                <td className={`py-2.5 px-3 font-bold ${isUser ? 'text-brand-green' : 'text-gray-500'}`}># {rank}</td>
                                <td className="py-2.5 px-3">
                                  <a
                                    href={`https://x.com/search?q=${r.wallet}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`hover:underline flex items-center gap-1 font-bold ${isUser ? 'text-brand-green' : 'text-blue-400'}`}
                                    title="Search wallet address on X"
                                  >
                                    {r.wallet.slice(0, 4)}...{r.wallet.slice(-4)}
                                    <Twitter className="w-2.5 h-2.5 fill-current opacity-70" />
                                  </a>
                                </td>
                                <td className="py-2.5 px-3 text-right text-white">{Math.round(r.received).toLocaleString()}</td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] uppercase font-bold border ${statusColors[r.status]}`}>
                                    {r.status.replace('_', ' ')}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right text-white font-bold">{Math.round(r.stillHolds).toLocaleString()}</td>
                                <td className="py-2.5 px-3 text-right text-brand-green font-bold">{pct}%</td>
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

                  {/* Community & Resources Section */}
                  <div className="bg-white/[0.01] border border-white/5 rounded-xl p-3.5 mt-2 flex flex-col gap-2">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Community & Resources</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-bold">
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
                </>
              )}

            </div>
          )}

          {/* 4. SIMULATOR VIEW (Sliders specification calculator) */}
          {activeView === 'simulator' && (
            <div className="flex flex-col gap-4 animate-fadeIn">
              <div className="bg-brand-green/5 border-l-2 border-brand-green p-3 rounded-r-lg">
                <p className="text-xs text-gray-300 leading-relaxed font-semibold">
                  Simulate your potential $ANSEM rewards based on your holdings, posting activity, and community allocation!
                </p>
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

                {/* Canvas Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={downloadSimCard}
                    disabled={generatingCard || copyingCard}
                    className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs transition-all duration-300 cursor-pointer disabled:opacity-50"
                  >
                    <Download className="w-4 h-4 text-brand-green" />
                    {generatingCard ? 'Capturing...' : 'Download Card'}
                  </button>
                  <button
                    type="button"
                    onClick={copySimCard}
                    disabled={generatingCard || copyingCard}
                    className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs transition-all duration-300 cursor-pointer disabled:opacity-50"
                  >
                    <Copy className="w-4 h-4 text-brand-green" />
                    {copyingCard ? 'Copying...' : 'Copy Image'}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={shareSimToX}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-xs transition-all duration-300 cursor-pointer shadow-md shadow-blue-600/10"
                >
                  <Twitter className="w-4 h-4 fill-current" />
                  Post Simulation to X
                </button>
              </div>
            </div>
          )}

          {/* 5. BULL CHAT VIEW (Trench chat communicator) */}
          {activeView === 'chat' && (
            <div className="flex flex-col glass-panel rounded-3xl green-glow-border overflow-hidden min-h-[480px] animate-fadeIn">
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
                  type="button"
                  onClick={() => triggerQuickAction('price')}
                  className="text-xs bg-white/5 border border-white/5 hover:border-brand-green/40 hover:text-brand-green text-gray-300 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all duration-300 cursor-pointer"
                >
                  <TrendingUp className="w-3.5 h-3.5 text-brand-green" /> Price Prediction
                </button>
                <button
                  type="button"
                  onClick={() => triggerQuickAction('lore')}
                  className="text-xs bg-white/5 border border-white/5 hover:border-brand-green/40 hover:text-brand-green text-gray-300 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all duration-300 cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5 text-blue-400" /> Teach Me Lore
                </button>
                <button
                  type="button"
                  onClick={() => triggerQuickAction('roast')}
                  className="text-xs bg-white/5 border border-white/5 hover:border-brand-green/40 hover:text-brand-green text-gray-300 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all duration-300 cursor-pointer"
                >
                  <Skull className="w-3.5 h-3.5 text-brand-red animate-pulse" /> Roast Me
                </button>
                <button
                  type="button"
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
                    className="bg-brand-green hover:bg-brand-green-dark text-black p-3 rounded-xl flex items-center justify-center transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-brand-green/10"
                  >
                    <Send className="w-4 h-4 fill-current" />
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* 6. GUIDE / FAQ VIEW (Guide list + accordions) */}
          {activeView === 'guide' && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              {/* Collapsible Onboarding Guide Card */}
              <div className="glass-panel rounded-3xl p-5 border border-white/5 flex flex-col gap-3">
                <div className="flex items-center gap-2 pb-3 border-b border-white/5 font-extrabold text-xs text-white uppercase tracking-wider select-none">
                  <BookOpen className="w-4 h-4 text-brand-green animate-pulse" />
                  How to Get Involved & Claim Guide
                </div>
                <div className="mt-2 flex flex-col gap-3.5 text-xs text-gray-300 leading-relaxed">
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
              </div>

              {/* Collapsible FAQ Onboarding Card */}
              <div className="glass-panel rounded-3xl p-5 border border-white/5 flex flex-col gap-3">
                <div className="flex items-center gap-2 pb-3 border-b border-white/5 font-extrabold text-xs text-white uppercase tracking-wider select-none">
                  <ShieldCheck className="w-4 h-4 text-brand-green animate-pulse" />
                  FAQ - New to Crypto? Start Here
                </div>
                
                <div className="mt-2 flex flex-col gap-3.5 text-xs text-gray-300 leading-relaxed">
                  
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
              </div>
            </div>
          )}

        </main>

        {/* FOOTER */}
        <footer className="mt-auto py-4 px-4 sm:px-6 text-center text-[10px] text-gray-500 font-semibold tracking-wider flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/5 bg-black/10 shrink-0">
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <span>The Black Bull AI Oracle © 2026. Stay bullish.</span>
            <span className="hidden sm:inline text-gray-700">|</span>
            <a
              href="https://x.com/kellycryptos"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-green hover:text-brand-green-dark hover:underline flex items-center gap-1 transition-all duration-300"
            >
              <Twitter className="w-3 h-3 fill-current" /> Built by @kellycryptos
            </a>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <a
              href="https://app.bullpen.fi/claim?ref=Kellycryptos"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-gold hover:text-brand-gold-dark hover:underline font-bold transition-all duration-300"
            >
              🔥 Claim $ANSEM Rewards (Ref: Kellycryptos)
            </a>
            <span className="hidden sm:inline text-gray-700">|</span>
            <span className="text-[9px] text-gray-600 font-mono">
              Mint: 9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump
            </span>
          </div>
        </footer>
      </div>

      {/* ---------------- 3. MOBILE BOTTOM NAVIGATION ---------------- */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-black/90 border-t border-white/5 flex items-center justify-around z-40 px-2 select-none">
        {[
          { id: 'overview', label: 'Overview', icon: Home },
          { id: 'bag', label: 'My Bag', icon: Briefcase },
          { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
          { id: 'simulator', label: 'Simulator', icon: TrendingUp },
          { id: 'chat', label: 'Chat', icon: MessageSquare },
        ].map((link) => {
          const Icon = link.icon;
          const isActive = activeView === link.id;
          return (
            <button
              key={link.id}
              type="button"
              onClick={() => setActiveView(link.id as any)}
              className={`flex flex-col items-center gap-1.5 transition-all duration-300 cursor-pointer ${
                isActive ? 'text-brand-green font-extrabold' : 'text-gray-500 font-medium'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="text-[9px] uppercase tracking-wider">{link.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
