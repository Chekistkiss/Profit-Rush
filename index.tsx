// Next, React
import { FC, useState, useEffect, useRef, Component, ErrorInfo, ReactNode } from 'react';
import pkg from '../../../package.json';

// ❌ DO NOT EDIT ANYTHING ABOVE THIS LINE

export const HomeView: FC = () => {
  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      {/* HEADER – fake Scrolly feed tabs */}
      <header className="flex items-center justify-center border-b border-white/10 py-3">
        <div className="flex items-center gap-2 rounded-full bg-white/5 px-2 py-1 text-[11px]">
          <button className="rounded-full bg-slate-900 px-3 py-1 font-semibold text-white">
            Feed
          </button>
          <button className="rounded-full px-3 py-1 text-slate-400">
            Casino
          </button>
          <button className="rounded-full px-3 py-1 text-slate-400">
            Kids
          </button>
        </div>
      </header>

      {/* MAIN – central game area (phone frame) */}
      <main className="flex flex-1 items-center justify-center px-4 py-3">
        <div className="relative aspect-[9/16] w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 shadow-[0_0_40px_rgba(56,189,248,0.35)]">
          {/* Fake “feed card” top bar inside the phone */}
          <div className="flex items-center justify-between px-3 py-2 text-[10px] text-slate-400">
            <span className="rounded-full bg-white/5 px-2 py-1 text-[9px] uppercase tracking-wide">
              Scrolly Game
            </span>
            <span className="text-[9px] opacity-70">#NoCodeJam</span>
          </div>

          {/* The game lives INSIDE this phone frame */}
          <div className="flex h-[calc(100%-26px)] flex-col items-center justify-start px-3 pb-3 pt-1">
            <GameSandbox />
          </div>
        </div>
      </main>

      {/* FOOTER – tiny version text */}
      <footer className="flex h-5 items-center justify-center border-t border-white/10 px-2 text-[9px] text-slate-500">
        <span>Scrolly · v{pkg.version}</span>
      </footer>
    </div>
  );
};

// ✅ THIS IS THE ONLY PART YOU EDIT FOR THE JAM
// Replace this entire GameSandbox component with the one AI generates.
// Keep the name `GameSandbox` and the `FC` type.

const GameSandbox: FC = () => {
  const START_CASH = 100000;
  const MIN_SPEND = 25;
  const REWARD_RATE = 0.12;
  const BASIS_DECAY = 0.95;
  const VOLATILITY_MULTIPLIER = 2;
  const NEWS_DURATION = 10000;
  const CHART_SAMPLE_MS = 1000;
  const ROUND_DURATION_MS = 300000; // 5 minutes

  type Asset = 'BTC-PERP' | 'ETH-PERP';
  type PositionSide = 'long' | 'short';

  interface Position {
    id: string;
    side: PositionSide;
    size: number;
    entryPrice: number;
    isolatedMargin: number;
    liqPrice: number;
    maintenanceLeverage: number;
    leverage: number;
    notional: number;
    openedAt: number; // Timestamp when position was opened
  }

  interface NewsItem {
    title: string;
    description: string;
    sentiment: 'bullish' | 'bearish';
    importance: 'low' | 'medium' | 'high' | 'critical';
    asset: Asset;
  }

  interface AssetState {
    indexPrice: number;
    markPrice: number;
    basis: number;
    volatility: number;
    baseVolatility: number;
    lastNewsTime: number;
    newsActive: boolean;
    newsReactionPhase: 'phase1' | 'phase2' | 'phase3' | null; // Tracks three-phase news reaction
    newsReactionUntil: number; // When the news reaction ends
    newsInitialChange: number; // The initial price change from news (phase 1)
    newsReversalChange: number; // The pullback price change (phase 2)
    newsContinuationChange: number; // The continuation price change (phase 3)
    newsOriginalPrice: number; // Original price before news (for accurate percentage calculations)
    newsIsCritical: boolean; // Track if current news is critical
    newsCriticalStartTime: number; // When critical news started
    newsCriticalTargetChange: number; // Target total change for critical news (15%)
    newsCriticalProgress: number; // Progress of critical news (0 to 1)
    maniaUntil: number;
    jumpProb: number;
    maxJump: number;
    lastAction: 'pump' | 'dump' | null;
    lastUpdateTime: number;
  }

  type TransactionType = 'closed' | 'liquidation';
  
  interface TransactionHistory {
    id: string;
    type: TransactionType;
    asset: Asset;
    side: PositionSide;
    time: number;
    entryPrice: number; // Weighted average entry price
    exitPrice: number;
    size: number; // Total position size
    margin: number; // Total margin used
    leverage: number; // Weighted average leverage
    pnl: number;
    liqPrice?: number; // Only for liquidations
  }

  const [selectedAsset, setSelectedAsset] = useState<Asset>('BTC-PERP');
  const [cash, setCash] = useState(START_CASH);
  const [initialCash] = useState(START_CASH);
  const [tradeLeverage, setTradeLeverage] = useState(10);
  const [tradeMarginUSD, setTradeMarginUSD] = useState(1000);
  const [gameOver, setGameOver] = useState(false);
  const [roundEndTime, setRoundEndTime] = useState<number | null>(Date.now() + ROUND_DURATION_MS);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [comboCount, setComboCount] = useState(0);
  const [comboMultiplier, setComboMultiplier] = useState(1);
  const [comboNotification, setComboNotification] = useState<{ show: boolean; count: number; multiplier: number }>({ show: false, count: 0, multiplier: 1 });
  const [totalTrades, setTotalTrades] = useState(0);
  const [winningTrades, setWinningTrades] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [hasBonus, setHasBonus] = useState(false);
  const [penaltyNotification, setPenaltyNotification] = useState<{ show: boolean; amount: number }>({ show: false, amount: 0 });
  const [currentNews, setCurrentNews] = useState<NewsItem | null>(null);
  const [showNewsPopup, setShowNewsPopup] = useState(false);
  const lastPriceRef = useRef<Record<Asset, number>>({
    'BTC-PERP': 50000,
    'ETH-PERP': 3000,
  });
  const [recentExecutions, setRecentExecutions] = useState<Array<{ price: number; size: number; side: 'buy' | 'sell'; time: number; isCrowd?: boolean }>>([]);
  const [transactionHistory, setTransactionHistory] = useState<TransactionHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showIntroMenu, setShowIntroMenu] = useState(true);
  
  const [assetStates, setAssetStates] = useState<Record<Asset, AssetState>>({
      'BTC-PERP': {
        indexPrice: 50000,
        markPrice: 50000,
        basis: 0,
        volatility: 0.0007,
        baseVolatility: 0.0007,
        lastNewsTime: 0,
        newsActive: false,
        newsReactionPhase: null,
        newsReactionUntil: 0,
        newsInitialChange: 0,
        newsReversalChange: 0,
        newsContinuationChange: 0,
        newsOriginalPrice: 0,
        newsIsCritical: false,
        newsCriticalStartTime: 0,
        newsCriticalTargetChange: 0,
        newsCriticalProgress: 0,
        maniaUntil: 0,
        jumpProb: 0.04,
        maxJump: 0.004,
        lastAction: null,
        lastUpdateTime: Date.now(),
      },
      'ETH-PERP': {
        indexPrice: 3000,
        markPrice: 3000,
        basis: 0,
        volatility: 0.001,
        baseVolatility: 0.001,
        lastNewsTime: 0,
        newsActive: false,
        newsReactionPhase: null,
        newsReactionUntil: 0,
        newsInitialChange: 0,
        newsReversalChange: 0,
        newsContinuationChange: 0,
        newsOriginalPrice: 0,
        newsIsCritical: false,
        newsCriticalStartTime: 0,
        newsCriticalTargetChange: 0,
        newsCriticalProgress: 0,
        maniaUntil: 0,
        jumpProb: 0.04,
        maxJump: 0.004,
        lastAction: null,
        lastUpdateTime: Date.now(),
      },
  });

  const [playerPositions, setPlayerPositions] = useState<Record<Asset, { long: Position | null; short: Position | null }>>({
    'BTC-PERP': { long: null, short: null },
    'ETH-PERP': { long: null, short: null },
  });

  const [crowdPositions, setCrowdPositions] = useState<Record<Asset, Position[]>>({
    'BTC-PERP': [],
    'ETH-PERP': [],
  });

  const nextNewsTimeRef = useRef(20000 + Math.random() * 20000); // 20-40 seconds (was 60-120)
  const gameOverRef = useRef(false);
  const newsPopupTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const priceHistoryRef = useRef<Record<Asset, { t: number; p: number }[]>>({
    'BTC-PERP': [],
    'ETH-PERP': [],
  });
  const lastChartSampleRef = useRef<Record<Asset, number>>({
    'BTC-PERP': 0,
    'ETH-PERP': 0,
  });
  // Canvas removed - using SVG instead for compliance
  const timeoutRefs = useRef<NodeJS.Timeout[]>([]); // Track all timeouts for cleanup
  const latestAssetStatesRef = useRef<Record<Asset, AssetState>>(assetStates); // Track latest asset states to avoid stale state
  const pendingLiquidationsRef = useRef<TransactionHistory[]>([]); // Track pending liquidations to ensure they're recorded

  // News templates
  const newsTemplates: Omit<NewsItem, 'asset'>[] = [
    { title: 'Major Exchange Listing', description: 'New exchange announces listing, increasing accessibility', sentiment: 'bullish', importance: 'high' },
    { title: 'Regulatory Clarity', description: 'Government provides clear regulatory framework', sentiment: 'bullish', importance: 'critical' },
    { title: 'Institutional Adoption', description: 'Large corporation announces crypto integration', sentiment: 'bullish', importance: 'high' },
    { title: 'Network Upgrade', description: 'Major protocol upgrade successfully deployed', sentiment: 'bullish', importance: 'medium' },
    { title: 'Partnership Announcement', description: 'Strategic partnership with major tech company', sentiment: 'bullish', importance: 'medium' },
    { title: 'Whale Accumulation', description: 'Large holder increases position significantly', sentiment: 'bullish', importance: 'low' },
    { title: 'ETF Approval', description: 'Major ETF approval boosts institutional confidence', sentiment: 'bullish', importance: 'critical' },
    { title: 'Massive Buy Order', description: 'Institutional investor places billion-dollar order', sentiment: 'bullish', importance: 'high' },
    { title: 'Positive Earnings Report', description: 'Major crypto company reports strong earnings', sentiment: 'bullish', importance: 'medium' },
    { title: 'Central Bank Endorsement', description: 'Central bank announces digital currency support', sentiment: 'bullish', importance: 'critical' },
    { title: 'Tech Giant Integration', description: 'Major tech company adds crypto payments', sentiment: 'bullish', importance: 'high' },
    { title: 'Supply Shock', description: 'Mining difficulty adjustment reduces supply', sentiment: 'bullish', importance: 'medium' },
    { title: 'Regulatory Crackdown', description: 'Government announces stricter regulations', sentiment: 'bearish', importance: 'critical' },
    { title: 'Exchange Hack', description: 'Major exchange reports security breach', sentiment: 'bearish', importance: 'high' },
    { title: 'Market Manipulation Probe', description: 'Authorities investigate market manipulation', sentiment: 'bearish', importance: 'high' },
    { title: 'Technical Issues', description: 'Network experiences temporary congestion', sentiment: 'bearish', importance: 'medium' },
    { title: 'Whale Dump', description: 'Large holder sells significant position', sentiment: 'bearish', importance: 'medium' },
    { title: 'FUD Spreads', description: 'Negative sentiment spreads on social media', sentiment: 'bearish', importance: 'low' },
    { title: 'Ban Announcement', description: 'Major country announces crypto trading ban', sentiment: 'bearish', importance: 'critical' },
    { title: 'Flash Crash', description: 'Sudden market crash triggers panic selling', sentiment: 'bearish', importance: 'high' },
    { title: 'Security Vulnerability', description: 'Critical security flaw discovered in protocol', sentiment: 'bearish', importance: 'high' },
    { title: 'Liquidity Crisis', description: 'Major exchange faces liquidity issues', sentiment: 'bearish', importance: 'critical' },
    { title: 'Negative Regulatory Ruling', description: 'Court rules against crypto in landmark case', sentiment: 'bearish', importance: 'high' },
    { title: 'Massive Sell-Off', description: 'Institutional investors exit positions en masse', sentiment: 'bearish', importance: 'medium' },
  ];

  const generateNews = (asset: Asset): NewsItem => {
    const template = newsTemplates[Math.floor(Math.random() * newsTemplates.length)];
    return { ...template, asset };
  };

  const getNewsImpact = (news: NewsItem): { 
    initialChange: number; 
    pullbackChange: number; 
    continuationChange: number;
    volatilityMultiplier: number; 
    phase1Duration: number;
    phase2Duration: number;
    phase3Duration: number;
    totalDuration: number;
  } => {
    const importanceMultipliers = { low: 1.0, medium: 2.5, high: 5.0, critical: 8.0 };
    // Bullish = good news = price goes UP (positive)
    // Bearish = bad news = price goes DOWN (negative)
    const sentimentMultiplier = news.sentiment === 'bullish' ? 1 : -1;
    const importance = importanceMultipliers[news.importance];
    
    // Phase 1: Initial reaction - strong move in news direction
    // For critical news: allow up to 15% total change over 3 seconds
    // For other news: reduced to prevent sharp jumps
    const strengthMultiplier = 0.8 + Math.random() * 0.4;
    let initialChangePercent: number;
    if (news.importance === 'critical') {
      // Critical news: 12-15% total change, will be distributed over 3 seconds
      initialChangePercent = 12 + Math.random() * 3; // 12-15% (positive value)
    } else {
      // Other news: cap at lower values
      const maxChangePercent = Math.min(3.0, importance * 0.5);
      initialChangePercent = Math.min(maxChangePercent, (0.5 + Math.random() * 0.5) * importance * strengthMultiplier);
    }
    // Apply sentiment multiplier and convert to decimal (divide by 100)
    const initialChange = (initialChangePercent * sentimentMultiplier) / 100;
    // For bullish: initialChange is positive (UP)
    // For bearish: initialChange is negative (DOWN)
    
    // Phase 2: Pullback/correction - opposite direction, randomized 25-50% of initial move
    // Bullish: goes DOWN (negative), Bearish: goes UP (positive)
    const pullbackPercent = 0.25 + Math.random() * 0.25; // 25-50% pullback
    const pullbackChange = -initialChange * pullbackPercent;
    // For bullish: pullbackChange = -positive = negative (DOWN) ✓
    // For bearish: pullbackChange = -negative = positive (UP) ✓
    
    // Phase 3: Continuation - back in news direction, randomized 40-80% of initial move
    // Bullish: goes UP (positive), Bearish: goes DOWN (negative)
    const continuationPercent = 0.4 + Math.random() * 0.4; // 40-80% continuation
    const continuationChange = initialChange * continuationPercent;
    // For bullish: continuationChange = positive * percent = positive (UP) ✓
    // For bearish: continuationChange = negative * percent = negative (DOWN) ✓
    
    // Increased volatility multiplier: 3.0x to 7.0x
    const volatilityMultiplier = 3.0 + (importance - 1.0) * 1.0;
    
    // Phase durations - randomized based on importance
    // More important news = longer phases, but with variation
    const baseDuration = 3000 + importance * 1000; // 4-11 seconds base
    const phase1Duration = baseDuration * (0.8 + Math.random() * 0.4); // 80-120% of base
    const phase2Duration = baseDuration * (0.6 + Math.random() * 0.4); // 60-100% of base
    const phase3Duration = baseDuration * (0.7 + Math.random() * 0.5); // 70-120% of base
    const totalDuration = phase1Duration + phase2Duration + phase3Duration;
    
    return {
      initialChange,
      pullbackChange,
      continuationChange,
      volatilityMultiplier,
      phase1Duration,
      phase2Duration,
      phase3Duration,
      totalDuration,
    };
  };

  // Calculate liquidation price using Hyperliquid formula
  const calculateLiqPrice = (side: PositionSide, entryPrice: number, size: number, isolatedMargin: number, maintenanceLeverage: number): number => {
    // Validate inputs to prevent division by zero and invalid calculations
    if (size === 0 || isolatedMargin <= 0 || maintenanceLeverage <= 0 || entryPrice <= 0) {
      return entryPrice;
    }
    
    const l = 1 / maintenanceLeverage;
    const maintenanceMarginRequired = isolatedMargin * l;
    const marginAvailable = isolatedMargin - maintenanceMarginRequired;
    
    // Additional validation: ensure marginAvailable is positive and reasonable
    if (marginAvailable <= 0 || marginAvailable >= isolatedMargin) {
      return entryPrice;
    }
    
    const sideValue = side === 'long' ? 1 : -1;
    const denominator = 1 - l * sideValue;
    
    // Prevent division by zero
    if (Math.abs(denominator) < 0.0001) {
      return entryPrice;
    }
    
    const liqPrice = entryPrice - sideValue * marginAvailable / size / denominator;
    
    // Ensure result is valid (positive and reasonable)
    if (!isFinite(liqPrice) || liqPrice <= 0) {
      return entryPrice;
    }
    
    return Math.max(0.01, liqPrice);
  };

  // Sync gameOver ref
  useEffect(() => {
    gameOverRef.current = gameOver;
  }, [gameOver]);

  // Sync latestAssetStatesRef when assetStates changes
  useEffect(() => {
    latestAssetStatesRef.current = assetStates;
  }, [assetStates]);

  // Process pending liquidations to ensure they're always recorded in history
  // Use requestAnimationFrame to batch updates and avoid infinite loops
  useEffect(() => {
    if (pendingLiquidationsRef.current.length > 0) {
      requestAnimationFrame(() => {
        if (pendingLiquidationsRef.current.length > 0) {
          const liquidations = [...pendingLiquidationsRef.current];
          pendingLiquidationsRef.current = []; // Clear the ref
          setTransactionHistory(prev => [...liquidations, ...prev].slice(0, 100));
        }
      });
    }
  });

  // Track score in ref to avoid dependency on score in round timer
  const scoreRef = useRef(score);
  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  // Round timer
  useEffect(() => {
    const interval = setInterval(() => {
      if (roundEndTime === null) return;
      const remainingMs = roundEndTime - Date.now();
      if (remainingMs <= 0) {
        // Round over - update best score using ref to get latest value
        setBestScore(prev => Math.max(prev, scoreRef.current));
      }
    }, 350);

    return () => clearInterval(interval);
  }, [roundEndTime]); // Removed score dependency - use ref instead

  // Price chart rendering moved to inline SVG (canvas removed for compliance)

  // Game loop
  useEffect(() => {
    const interval = setInterval(() => {
      if (gameOverRef.current) return;

      setAssetStates(prev => {
        const newStates = { ...prev };
        
        Object.keys(newStates).forEach(assetKey => {
          const asset = assetKey as Asset;
          const state = newStates[asset];
          const now = Date.now();
          
          // Calculate dtSec from lastUpdateTime BEFORE any state updates (used for basis decay and mania decay)
          const dtSec = (now - state.lastUpdateTime) / 1000;
          
          // News shock logic
          if (now - state.lastNewsTime > nextNewsTimeRef.current) {
            const news = generateNews(asset);
            const impact = getNewsImpact(news);
            const isCritical = news.importance === 'critical';
            const reactionEndTime = now + impact.totalDuration;
            
            // Always update current news, even if popup is showing
            setCurrentNews(news);
            
            // Show news popup (close any existing popup and show new one)
            setShowNewsPopup(true);
            // Clear any existing news popup timeout
            if (newsPopupTimeoutRef.current) {
              clearTimeout(newsPopupTimeoutRef.current);
            }
            // Set new timeout to hide popup
            newsPopupTimeoutRef.current = setTimeout(() => {
              setShowNewsPopup(false);
              newsPopupTimeoutRef.current = null;
            }, 4000);
            
            // For critical news: apply changes gradually over 3 seconds (15% total)
            // For other news: apply immediately with limits
            if (isCritical) {
              // Critical news: distribute 15% change over 3 seconds (3000ms)
              // Each tick (150ms) applies ~0.75% of the total change
              const CRITICAL_DURATION_MS = 3000; // 3 seconds
              const targetTotalChange = state.indexPrice * impact.initialChange; // 15% of price
              
              newStates[asset] = {
                ...state,
                lastNewsTime: now,
                newsActive: true,
                newsReactionPhase: 'phase1',
                newsReactionUntil: reactionEndTime,
                newsInitialChange: impact.initialChange,
                newsReversalChange: impact.pullbackChange,
                newsContinuationChange: impact.continuationChange,
                newsOriginalPrice: state.indexPrice,
                newsIsCritical: true,
                newsCriticalStartTime: now,
                newsCriticalTargetChange: targetTotalChange,
                newsCriticalProgress: 0,
                volatility: state.baseVolatility * impact.volatilityMultiplier,
              };
            } else {
              // Non-critical news: apply immediately with limits
              const originalPrice = state.indexPrice; // Save BEFORE changing price
              const initialPriceChange = originalPrice * impact.initialChange;
              const MAX_NEWS_CHANGE_PERCENT = 0.02; // 2% maximum change per news tick
              const maxNewsChange = originalPrice * MAX_NEWS_CHANGE_PERCENT;
              const clampedInitialChange = Math.max(-maxNewsChange, Math.min(maxNewsChange, initialPriceChange));
              
              newStates[asset] = {
                ...state,
                indexPrice: state.indexPrice + clampedInitialChange,
                lastNewsTime: now,
                newsActive: true,
                newsReactionPhase: 'phase1',
                newsReactionUntil: reactionEndTime,
                newsInitialChange: impact.initialChange,
                newsReversalChange: impact.pullbackChange,
                newsContinuationChange: impact.continuationChange,
                newsOriginalPrice: originalPrice, // Use saved original price
                newsIsCritical: false,
                newsCriticalStartTime: 0,
                newsCriticalTargetChange: 0,
                newsCriticalProgress: 0,
                volatility: state.baseVolatility * impact.volatilityMultiplier,
              };
            }
            nextNewsTimeRef.current = 20000 + Math.random() * 20000; // 20-40 seconds
            
            // Inject extra crowd trades during news (creates order flow feeling)
            const newsSide = news.sentiment === 'bullish' ? 'buy' as const : 'sell' as const;
            const updatedPrice = isCritical ? state.indexPrice : state.indexPrice + (state.indexPrice * impact.initialChange * 0.02);
            const numExtraTrades = 2 + Math.floor(Math.random() * 3); // 2-4 extra trades
            for (let i = 0; i < numExtraTrades; i++) {
              const extraTradeTimeout = setTimeout(() => {
                setAssetStates(prevStates => {
                  const currentPrice = prevStates[asset].markPrice;
                  const extraSize = (0.1 + Math.random() * 0.5) * (currentPrice * 0.001); // Small sizes
                  const extraPrice = currentPrice * (1 + (Math.random() - 0.5) * 0.002); // Slight price variation
                  setRecentExecutions(prev => {
                    const newExec = { price: extraPrice, size: extraSize, side: newsSide, time: Date.now(), isCrowd: true };
                    return [newExec, ...prev].slice(0, 10);
                  });
                  return prevStates;
                });
              }, i * 200 + Math.random() * 300); // Staggered over ~1 second
              timeoutRefs.current.push(extraTradeTimeout);
            }
            
            // Schedule Phase 2: Pullback/correction - limit to prevent sharp jumps
            const phase2Timeout = setTimeout(() => {
              setAssetStates(prev2 => {
                const currentState = prev2[asset];
                if (currentState.newsReactionPhase === 'phase1') {
                  // Calculate pullback based on original price before news
                  const pullbackPriceChange = currentState.newsOriginalPrice * currentState.newsReversalChange;
                  // Limit to 2% per tick
                  const MAX_NEWS_CHANGE_PERCENT = 0.02;
                  const maxNewsChange = prev2[asset].indexPrice * MAX_NEWS_CHANGE_PERCENT;
                  const clampedPullbackChange = Math.max(-maxNewsChange, Math.min(maxNewsChange, pullbackPriceChange));
                  return {
                    ...prev2,
                    [asset]: {
                      ...prev2[asset],
                      indexPrice: prev2[asset].indexPrice + clampedPullbackChange,
                      newsReactionPhase: 'phase2',
                    },
                  };
                }
                return prev2;
              });
            }, impact.phase1Duration);
            timeoutRefs.current.push(phase2Timeout);
            
            // Schedule Phase 3: Continuation - limit to prevent sharp jumps
            const phase3Timeout = setTimeout(() => {
              setAssetStates(prev2 => {
                const currentState = prev2[asset];
                if (currentState.newsReactionPhase === 'phase2') {
                  // Calculate continuation based on original price before news
                  const continuationPriceChange = currentState.newsOriginalPrice * currentState.newsContinuationChange;
                  // Limit to 2% per tick
                  const MAX_NEWS_CHANGE_PERCENT = 0.02;
                  const maxNewsChange = prev2[asset].indexPrice * MAX_NEWS_CHANGE_PERCENT;
                  const clampedContinuationChange = Math.max(-maxNewsChange, Math.min(maxNewsChange, continuationPriceChange));
                  return {
                    ...prev2,
                    [asset]: {
                      ...prev2[asset],
                      indexPrice: prev2[asset].indexPrice + clampedContinuationChange,
                      newsReactionPhase: 'phase3',
                    },
                  };
                }
                return prev2;
              });
            }, impact.phase1Duration + impact.phase2Duration);
            timeoutRefs.current.push(phase3Timeout);
            
            // End news reaction
            const endNewsTimeout = setTimeout(() => {
              setAssetStates(prev2 => ({
                ...prev2,
                [asset]: {
                  ...prev2[asset],
                  newsActive: false,
                  newsReactionPhase: null,
                  newsReactionUntil: 0,
                  newsInitialChange: 0,
                  newsReversalChange: 0,
                  newsContinuationChange: 0,
                  newsOriginalPrice: 0,
                  volatility: prev2[asset].baseVolatility,
                },
              }));
            }, impact.totalDuration);
            timeoutRefs.current.push(endNewsTimeout);
          } else if (state.newsReactionPhase && now >= state.newsReactionUntil) {
            // End news reaction
            newStates[asset] = {
              ...state,
              newsActive: false,
              newsReactionPhase: null,
              newsReactionUntil: 0,
              newsInitialChange: 0,
              newsReversalChange: 0,
              newsContinuationChange: 0,
              newsOriginalPrice: 0,
              newsIsCritical: false,
              newsCriticalStartTime: 0,
              newsCriticalTargetChange: 0,
              newsCriticalProgress: 0,
              volatility: state.baseVolatility,
            };
          } else if (state.newsIsCritical && state.newsReactionPhase === 'phase1') {
            // Critical news: apply changes gradually over 3 seconds
            const CRITICAL_DURATION_MS = 3000; // 3 seconds
            const elapsed = now - state.newsCriticalStartTime;
            const newProgress = Math.min(1, elapsed / CRITICAL_DURATION_MS);
            
            // Calculate how much change should have been applied by now
            // targetChange is already in absolute price units (can be negative for bearish)
            const targetChange = state.newsCriticalTargetChange;
            
            // Calculate desired price at current progress
            const desiredPrice = state.newsOriginalPrice + (targetChange * newProgress);
            const currentPrice = state.indexPrice;
            const priceDifference = desiredPrice - currentPrice;
            
            // Limit incremental change per tick to ~0.75% (15% / 20 ticks over 3 seconds)
            // Use original price for consistent limit calculation
            const MAX_CRITICAL_TICK_CHANGE = 0.0075; // 0.75% per tick
            const maxTickChange = Math.abs(state.newsOriginalPrice * MAX_CRITICAL_TICK_CHANGE);
            
            // Apply change in the direction of priceDifference, but limit the step size
            // priceDifference already has the correct sign (negative for bearish, positive for bullish)
            const stepSize = Math.min(Math.abs(priceDifference), maxTickChange);
            const incrementalChange = Math.sign(priceDifference) * stepSize;
            
            newStates[asset] = {
              ...state,
              indexPrice: state.indexPrice + incrementalChange,
              newsCriticalProgress: newProgress,
              lastUpdateTime: now,
            };
          } else {
            const jumpProbBase = 0.04;
            const maxJumpBase = 0.004;
            const halfLifeSec = 25; // 20-30s average
            
            let newJumpProb = state.jumpProb;
            let newMaxJump = state.maxJump;
            let newManiaUntil = state.maniaUntil;
            let newLastAction = state.lastAction;
            let priceChange = 0;
            
            // Check if in mania period
            if (now < state.maniaUntil) {
              // During mania: apply jumpy percent return process
              if (Math.random() < state.jumpProb) {
                // Jump occurs: draw magnitude with skew toward smaller jumps
                // Ensure mag is between 0.005 and maxJump (or maxJump and 0.005 if maxJump > 0.005)
                const u = Math.random();
                const minJump = Math.min(0.005, state.maxJump);
                const maxJump = Math.max(0.005, state.maxJump);
                const mag = minJump + (maxJump - minJump) * (u * u);
                
                // Choose sign with bias based on lastAction
                let sign: number;
                if (state.lastAction === 'pump') {
                  sign = Math.random() < 0.55 ? 1 : -1; // 55% up, 45% down
                } else if (state.lastAction === 'dump') {
                  sign = Math.random() < 0.45 ? 1 : -1; // 45% up, 55% down
                } else {
                  sign = Math.random() < 0.5 ? 1 : -1; // 50/50 if no action
                }
                
                priceChange = state.indexPrice * sign * mag;
              } else {
                // No jump: increased baseline noise during mania
                const baselineNoise = (Math.random() - 0.5) * (0.0006 + Math.random() * 0.0014); // ±0.06-0.20%
                priceChange = state.indexPrice * baselineNoise;
              }
            } else if (state.maniaUntil > 0 && (state.jumpProb > jumpProbBase || state.maxJump > maxJumpBase)) {
              // After mania ends: exponential decay toward calm values
              const decayFactor = Math.pow(0.5, dtSec / halfLifeSec);
              newJumpProb = jumpProbBase + (state.jumpProb - jumpProbBase) * decayFactor;
              newMaxJump = maxJumpBase + (state.maxJump - maxJumpBase) * decayFactor;
              
              // Increased baseline noise during decay
              const baselineNoise = (Math.random() - 0.5) * (0.0006 + Math.random() * 0.0014);
              priceChange = state.indexPrice * baselineNoise;
              
              // Reset mania if fully decayed
              if (newJumpProb <= jumpProbBase * 1.01 && newMaxJump <= maxJumpBase * 1.01) {
                newManiaUntil = 0;
                newLastAction = null;
                newJumpProb = jumpProbBase;
                newMaxJump = maxJumpBase;
              }
            } else {
              // Normal operation: increased baseline noise with occasional larger moves
              // 70% chance of normal noise, 30% chance of larger move
              if (Math.random() < 0.3) {
                // Occasional larger move (0.1% to 0.4%)
                const largerMove = (Math.random() - 0.5) * (0.001 + Math.random() * 0.003);
                priceChange = state.indexPrice * largerMove;
              } else {
                // Normal baseline noise (increased from ±0.03-0.11% to ±0.08-0.25%)
                const baselineNoise = (Math.random() - 0.5) * (0.0008 + Math.random() * 0.0017);
                priceChange = state.indexPrice * baselineNoise;
              }
            }
            
            // Limit maximum price change per tick to prevent sharp jumps (max 1% per tick)
            const MAX_CHANGE_PERCENT = 0.01; // 1% maximum change per tick
            const maxChange = state.indexPrice * MAX_CHANGE_PERCENT;
            const clampedPriceChange = Math.max(-maxChange, Math.min(maxChange, priceChange));
            
            newStates[asset] = {
              ...state,
              indexPrice: state.indexPrice + clampedPriceChange,
              jumpProb: newJumpProb,
              maxJump: newMaxJump,
              maniaUntil: newManiaUntil,
              lastAction: newLastAction,
              lastUpdateTime: now,
            };
          }
          
          // Basis decay (time-based exponential decay) - always apply using dtSec calculated at start
          const decayFactor = Math.pow(0.5, dtSec / 30); // 30-second half-life
          newStates[asset].basis *= decayFactor;
          
          // Update mark price
          newStates[asset].markPrice = newStates[asset].indexPrice + newStates[asset].basis;
          
          // Sample chart data once per second
          if (now - lastChartSampleRef.current[asset] >= CHART_SAMPLE_MS) {
            const history = priceHistoryRef.current[asset];
            history.push({ t: now, p: newStates[asset].markPrice });
            if (history.length > 180) {
              history.shift();
            }
            lastChartSampleRef.current[asset] = now;
          }
        });
        
        // Update ref with latest states to avoid stale state in nested setState
        latestAssetStatesRef.current = newStates;
        
        return newStates;
      });

      // Update crowd positions and check liquidations
      // Use latestAssetStatesRef to get the most recent state (avoiding stale state from prevStates)
      setCrowdPositions(prevCrowd => {
        const newCrowd = { ...prevCrowd };
        const currentAssetStates = latestAssetStatesRef.current; // Use ref to get latest states
        let totalReward = 0;
        
        Object.keys(newCrowd).forEach(assetKey => {
          const asset = assetKey as Asset;
          const state = currentAssetStates[asset]; // Use current state from ref, not stale prevStates
            
            // Spawn new positions occasionally (more frequent during news/mania)
            const isNewsActive = state.newsActive;
            const isManiaActive = state.maniaUntil > Date.now();
            const spawnChance = isNewsActive || isManiaActive ? 0.25 : 0.1; // Higher chance during volatility
            
            if (Math.random() < spawnChance) {
              const side: PositionSide = Math.random() < 0.5 ? 'long' : 'short';
              const leverage = Math.random() * 10 + 5;
              const marginUSD = Math.random() * 5000 + 1000;
              const notional = marginUSD * leverage;
              const size = notional / state.markPrice;
              const maintenanceLeverage = leverage * 0.8;
              const entryPrice = state.markPrice;
              const liqPrice = calculateLiqPrice(side, entryPrice, size, marginUSD, maintenanceLeverage);
              
              newCrowd[asset].push({
                id: `${Date.now()}-${Math.random()}`,
                side,
                size,
                entryPrice,
                isolatedMargin: marginUSD,
                liqPrice,
                maintenanceLeverage,
                leverage,
                notional,
                openedAt: Date.now(),
              });
              
              // Track execution as crowd trade
              setRecentExecutions(prev => {
                const newExec = { price: entryPrice, size, side: side === 'long' ? 'buy' as const : 'sell' as const, time: Date.now(), isCrowd: true };
                const updated = [newExec, ...prev].slice(0, 10); // Keep last 10
                return updated;
              });
            }
            
            // Close positions occasionally (more frequent during news/mania)
            const closeChance = isNewsActive || isManiaActive ? 0.3 : 0.15;
            if (newCrowd[asset].length > 0 && Math.random() < closeChance) {
              const idx = Math.floor(Math.random() * newCrowd[asset].length);
              const closingPos = newCrowd[asset][idx];
              
              // Track execution as crowd trade
              setRecentExecutions(prev => {
                const newExec = { price: state.markPrice, size: closingPos.size, side: closingPos.side === 'long' ? 'sell' as const : 'buy' as const, time: Date.now(), isCrowd: true };
                const updated = [newExec, ...prev].slice(0, 10); // Keep last 10
                return updated;
              });
              
              newCrowd[asset].splice(idx, 1);
            }
            
            // Check liquidations (recalculate liq price with stored maintenanceLeverage)
            const markPrice = state.markPrice;
            newCrowd[asset] = newCrowd[asset].filter(pos => {
              // Recalculate liq price to ensure it's current
              const currentLiqPrice = calculateLiqPrice(pos.side, pos.entryPrice, pos.size, pos.isolatedMargin, pos.maintenanceLeverage);
              // Only liquidate when price clearly crosses the threshold (more conservative)
              const shouldLiquidate = 
                (pos.side === 'long' && markPrice < currentLiqPrice) ||
                (pos.side === 'short' && markPrice > currentLiqPrice);
              
              if (shouldLiquidate) {
                totalReward += pos.isolatedMargin * REWARD_RATE;
                // Track liquidation execution as crowd trade
                setRecentExecutions(prev => {
                  const newExec = { price: markPrice, size: pos.size, side: pos.side === 'long' ? 'sell' as const : 'buy' as const, time: Date.now(), isCrowd: true };
                  return [newExec, ...prev].slice(0, 10);
                });
                return false;
              }
              return true;
            });
          });
          
          if (totalReward > 0) {
            setCash(prev => prev + totalReward);
          }
          
          return newCrowd;
        });

      // Check player liquidations
      // Use latestAssetStatesRef to get the most recent state
      setPlayerPositions(prevPos => {
        const newPos = { ...prevPos };
        const currentAssetStates = latestAssetStatesRef.current; // Use ref to get latest states
        let liquidated = false;
        const liquidationTransactions: TransactionHistory[] = [];
        
        Object.keys(newPos).forEach(assetKey => {
          const asset = assetKey as Asset;
          const markPrice = currentAssetStates[asset].markPrice; // Use current state from ref
          const pos = newPos[asset];
          
          if (pos.long) {
            const currentLiqPrice = calculateLiqPrice(pos.long.side, pos.long.entryPrice, pos.long.size, pos.long.isolatedMargin, pos.long.maintenanceLeverage);
            // Use stored liqPrice for comparison, but recalculate to ensure accuracy
            // Only liquidate when price clearly crosses the threshold (more conservative)
            // For LONG: liquidate when markPrice is clearly below liqPrice
            if (markPrice < currentLiqPrice) {
              // Store position data before nullifying
              const longPos = pos.long;
              // When liquidated, user loses their entire margin (already deducted when position was opened)
              // The PNL is simply the negative of the margin lost
              const liquidationPnL = -longPos.isolatedMargin;
              
              // Store liquidation transaction to add to history
              liquidationTransactions.push({
                id: `liq-${Date.now()}-${Math.random()}`,
                type: 'liquidation' as const,
                asset,
                side: 'long' as const,
                time: Date.now(),
                entryPrice: longPos.entryPrice, // Weighted average entry price
                exitPrice: markPrice,
                size: longPos.size, // Total position size
                margin: longPos.isolatedMargin, // Total margin used (lost on liquidation)
                leverage: longPos.leverage, // Weighted average leverage
                pnl: liquidationPnL,
                liqPrice: currentLiqPrice,
              });
              
              newPos[asset].long = null;
              liquidated = true;
            }
          }
          if (pos.short) {
            const currentLiqPrice = calculateLiqPrice(pos.short.side, pos.short.entryPrice, pos.short.size, pos.short.isolatedMargin, pos.short.maintenanceLeverage);
            // Use stored liqPrice for comparison, but recalculate to ensure accuracy
            // Only liquidate when price clearly crosses the threshold (more conservative)
            // For SHORT: liquidate when markPrice is clearly above liqPrice
            if (markPrice > currentLiqPrice) {
              // Store position data before nullifying
              const shortPos = pos.short;
              // When liquidated, user loses their entire margin (already deducted when position was opened)
              // The PNL is simply the negative of the margin lost
              const liquidationPnL = -shortPos.isolatedMargin;
              
              // Store liquidation transaction to add to history
              liquidationTransactions.push({
                id: `liq-${Date.now()}-${Math.random()}`,
                type: 'liquidation' as const,
                asset,
                side: 'short' as const,
                time: Date.now(),
                entryPrice: shortPos.entryPrice, // Weighted average entry price
                exitPrice: markPrice,
                size: shortPos.size, // Total position size
                margin: shortPos.isolatedMargin, // Total margin used (lost on liquidation)
                leverage: shortPos.leverage, // Weighted average leverage
                pnl: liquidationPnL,
                liqPrice: currentLiqPrice,
              });
              
              newPos[asset].short = null;
              liquidated = true;
            }
          }
        });
        
        // Store liquidation transactions in ref to ensure they're recorded
        // We'll process them in a useEffect to avoid React batching issues
        if (liquidationTransactions.length > 0) {
          pendingLiquidationsRef.current.push(...liquidationTransactions);
          
          // Count liquidations as trades (they are losing trades)
          liquidationTransactions.forEach(() => {
            setTotalTrades(prev => prev + 1);
            // Liquidations are always losses (negative PnL), so don't increment winningTrades
          });
        }
        
        // Reset combo on liquidation
        if (liquidated) {
          setComboCount(0);
          setComboMultiplier(1);
          setHasBonus(false);
          setComboNotification({ show: false, count: 0, multiplier: 1 });
        }
        
        return newPos;
      });

      // Check game over
      setCash(prevCash => {
        if (prevCash < MIN_SPEND) {
          setGameOver(true);
        }
        return prevCash;
      });
    }, 150);

    return () => {
      clearInterval(interval);
      // Clear all tracked timeouts
      timeoutRefs.current.forEach(clearTimeout);
      timeoutRefs.current = [];
    };
  }, []);

  const openPosition = (side: PositionSide) => {
    if (cash < MIN_SPEND || gameOver || roundOver) return;
    if (cash < tradeMarginUSD) return;
    
    const state = assetStates[selectedAsset];
    const isolatedMargin = tradeMarginUSD;
    const notional = isolatedMargin * tradeLeverage;
    const tradeSize = notional / state.markPrice;
    const tradePrice = state.markPrice;
    const maintenanceLeverage = tradeLeverage * 0.8;
    
    setCash(prev => prev - isolatedMargin);
    
    // Track execution (player trade)
    setRecentExecutions(prev => {
      const newExec = { price: tradePrice, size: tradeSize, side: side === 'long' ? 'buy' as const : 'sell' as const, time: Date.now(), isCrowd: false };
      return [newExec, ...prev].slice(0, 10);
    });
    
    setPlayerPositions(prev => {
      const currentPos = prev[selectedAsset][side];
      
      if (currentPos) {
        // Opening trade: weighted average entry and leverage
        const oldSize = currentPos.size;
        const oldEntry = currentPos.entryPrice;
        const newSize = oldSize + tradeSize;
        // Validate newSize to prevent division by zero
        if (newSize <= 0) {
          console.warn('Invalid position size after averaging');
          return prev; // Don't update if size would be invalid
        }
        const newEntry = (oldEntry * oldSize + tradePrice * tradeSize) / newSize;
        const newMargin = currentPos.isolatedMargin + isolatedMargin;
        // Validate newMargin to prevent division by zero
        if (newMargin <= 0) {
          console.warn('Invalid margin after averaging');
          return prev; // Don't update if margin would be invalid
        }
        // Calculate weighted average leverage instead of using tradeLeverage
        const newLeverage = (currentPos.leverage * currentPos.isolatedMargin + tradeLeverage * isolatedMargin) / newMargin;
        const newNotional = newMargin * newLeverage;
        const newMaintenanceLeverage = newLeverage * 0.8;
        const newLiqPrice = calculateLiqPrice(side, newEntry, newSize, newMargin, newMaintenanceLeverage);
        
        // Don't add to transaction history when adding to existing position
        // History will only show when position is fully closed or liquidated
        
        return {
          ...prev,
          [selectedAsset]: {
            ...prev[selectedAsset],
            [side]: {
              ...currentPos,
              size: newSize,
              entryPrice: newEntry,
              isolatedMargin: newMargin,
              liqPrice: newLiqPrice,
              leverage: newLeverage,
              maintenanceLeverage: newMaintenanceLeverage,
              notional: newNotional,
              openedAt: currentPos.openedAt, // Keep original open time
            },
          },
        };
      } else {
        // New position
        const liqPrice = calculateLiqPrice(side, tradePrice, tradeSize, isolatedMargin, maintenanceLeverage);
        
        // Don't add to transaction history when opening position
        // History will only show when position is fully closed or liquidated
        
        return {
          ...prev,
          [selectedAsset]: {
            ...prev[selectedAsset],
            [side]: {
              id: `${Date.now()}`,
              side,
              size: tradeSize,
              entryPrice: tradePrice,
              isolatedMargin,
              liqPrice,
              maintenanceLeverage,
              leverage: tradeLeverage,
              notional,
              openedAt: Date.now(), // Track when position was opened
            },
          },
        };
      }
    });
  };

  const closePosition = (side: PositionSide, closePercent: number = 1) => {
    const pos = playerPositions[selectedAsset][side];
    if (!pos) return;
    
    // Validate closePercent to be between 0 and 1
    const validClosePercent = Math.max(0, Math.min(1, closePercent));
    if (validClosePercent <= 0) return; // Don't allow closing 0% or less
    
    const state = assetStates[selectedAsset];
    const sideValue = pos.side === 'long' ? 1 : -1;
    const uPnL = sideValue * (state.markPrice - pos.entryPrice) * pos.size;
    const closeSize = pos.size * validClosePercent;
    const closeMargin = pos.isolatedMargin * validClosePercent;
    const realizedPnL = uPnL * validClosePercent;
    
    // Penalty for closing too quickly (within 10 seconds)
    const MIN_HOLD_TIME_MS = 10000; // 10 seconds
    const QUICK_CLOSE_PENALTY_RATE = 0.05; // 5% penalty
    const timeHeld = Date.now() - (pos.openedAt || Date.now());
    let penalty = 0;
    
    if (timeHeld < MIN_HOLD_TIME_MS) {
      // Apply penalty: 5% of the margin being closed
      penalty = closeMargin * QUICK_CLOSE_PENALTY_RATE;
      // Penalty scales down as time approaches 10 seconds
      const penaltyMultiplier = 1 - (timeHeld / MIN_HOLD_TIME_MS);
      penalty = penalty * penaltyMultiplier;
      
      // Show penalty notification
      setPenaltyNotification({ show: true, amount: penalty });
      const penaltyTimeout = setTimeout(() => setPenaltyNotification({ show: false, amount: 0 }), 3000);
      timeoutRefs.current.push(penaltyTimeout);
    }
    
    const netReturn = closeMargin + realizedPnL - penalty;
    setCash(prev => prev + netReturn);
    
    // Track execution (player trade)
    setRecentExecutions(prev => {
      const newExec = { price: state.markPrice, size: closeSize, side: side === 'long' ? 'sell' as const : 'buy' as const, time: Date.now(), isCrowd: false };
      return [newExec, ...prev].slice(0, 10);
    });
    
    // Only add to transaction history when position is fully closed
    // Show aggregated position information (weighted average entry, total size, total margin, etc.)
    if (validClosePercent >= 1) {
      const closedTx: TransactionHistory = {
        id: `closed-${Date.now()}-${Math.random()}`,
        type: 'closed' as const,
        asset: selectedAsset,
        side,
        time: Date.now(),
        entryPrice: pos.entryPrice, // Weighted average entry price
        exitPrice: state.markPrice,
        size: pos.size, // Total position size
        margin: pos.isolatedMargin, // Total margin used
        leverage: pos.leverage, // Weighted average leverage
        pnl: realizedPnL - penalty,
      };
      setTransactionHistory(prev => [closedTx, ...prev].slice(0, 100)); // Limit history to 100 entries
    }
    
    // Arcade score and combo system
    setTotalTrades(prev => prev + 1);
    if (realizedPnL > 0) {
      // Winning trade: increase score and combo
      setWinningTrades(prev => prev + 1);
      setComboCount(prev => {
        const newComboCount = prev + 1;
        const newMultiplier = 1 + (newComboCount * 0.1);
        setComboMultiplier(newMultiplier);
        setScore(prevScore => prevScore + realizedPnL * newMultiplier);
        setMaxCombo(prevMax => Math.max(prevMax, newComboCount));
        
        // Grant bonus at 3 consecutive wins
        if (newComboCount === 3) {
          setHasBonus(true);
        }
        
        // Show combo notification
        setComboNotification({ show: true, count: newComboCount, multiplier: newMultiplier });
        const comboTimeout = setTimeout(() => setComboNotification(prev => ({ ...prev, show: false })), 2000);
        timeoutRefs.current.push(comboTimeout);
        return newComboCount;
      });
    } else {
      // Losing trade: reset combo and bonus
      // Clear any pending combo notification timeout
      const comboTimeouts = timeoutRefs.current.filter((_, idx) => {
        // Note: We can't easily identify combo timeouts, so we'll clear all notification-related timeouts
        // A better approach would be to track combo timeout separately, but for now this works
        return true; // Will be handled by clearing all on combo reset
      });
      // Clear combo notification timeout if it exists (simplified: clear all notification timeouts)
      // Actually, we'll just hide the notification immediately
      setComboCount(0);
      setComboMultiplier(1);
      setHasBonus(false);
      setComboNotification({ show: false, count: 0, multiplier: 1 });
    }
    
    if (validClosePercent >= 1) {
      // Full close
      setPlayerPositions(prev => ({
        ...prev,
        [selectedAsset]: {
          ...prev[selectedAsset],
          [side]: null,
        },
      }));
    } else {
      // Partial close: keep entry price, reduce size and margin
      // Leverage remains the same (weighted average from position averaging)
      const newSize = pos.size - closeSize;
      const newMargin = pos.isolatedMargin - closeMargin;
      
      // Prevent creating positions with zero or negative size/margin
      if (newSize <= 0 || newMargin <= 0) {
        // If the remaining position would be invalid, treat as full close
        setPlayerPositions(prev => ({
          ...prev,
          [selectedAsset]: {
            ...prev[selectedAsset],
            [side]: null,
          },
        }));
        return;
      }
      
      // Use position's leverage (which is already weighted average if position was averaged)
      const newNotional = newMargin * pos.leverage;
      const newLiqPrice = calculateLiqPrice(side, pos.entryPrice, newSize, newMargin, pos.maintenanceLeverage);
      
      setPlayerPositions(prev => ({
        ...prev,
        [selectedAsset]: {
          ...prev[selectedAsset],
          [side]: {
            ...pos,
            size: newSize,
            isolatedMargin: newMargin,
            notional: newNotional,
            liqPrice: newLiqPrice,
          },
        },
      }));
    }
  };


  const newRound = () => {
    setCash(START_CASH);
    setGameOver(false);
    setTradeLeverage(10);
    setTradeMarginUSD(1000);
    setPlayerPositions({
      'BTC-PERP': { long: null, short: null },
      'ETH-PERP': { long: null, short: null },
    });
    setCrowdPositions({
      'BTC-PERP': [],
      'ETH-PERP': [],
    });
    setAssetStates({
      'BTC-PERP': {
        indexPrice: 50000,
        markPrice: 50000,
        basis: 0,
        volatility: 0.0007,
        baseVolatility: 0.0007,
        lastNewsTime: 0,
        newsActive: false,
        newsReactionPhase: null,
        newsReactionUntil: 0,
        newsInitialChange: 0,
        newsReversalChange: 0,
        newsContinuationChange: 0,
        newsOriginalPrice: 0,
        newsIsCritical: false,
        newsCriticalStartTime: 0,
        newsCriticalTargetChange: 0,
        newsCriticalProgress: 0,
        maniaUntil: 0,
        jumpProb: 0.04,
        maxJump: 0.004,
        lastAction: null,
        lastUpdateTime: Date.now(),
      },
      'ETH-PERP': {
        indexPrice: 3000,
        markPrice: 3000,
        basis: 0,
        volatility: 0.001,
        baseVolatility: 0.001,
        lastNewsTime: 0,
        newsActive: false,
        newsReactionPhase: null,
        newsReactionUntil: 0,
        newsInitialChange: 0,
        newsReversalChange: 0,
        newsContinuationChange: 0,
        newsOriginalPrice: 0,
        newsIsCritical: false,
        newsCriticalStartTime: 0,
        newsCriticalTargetChange: 0,
        newsCriticalProgress: 0,
        maniaUntil: 0,
        jumpProb: 0.04,
        maxJump: 0.004,
        lastAction: null,
        lastUpdateTime: Date.now(),
      },
    });
    priceHistoryRef.current = { 'BTC-PERP': [], 'ETH-PERP': [] };
    lastChartSampleRef.current = { 'BTC-PERP': 0, 'ETH-PERP': 0 };
    setScore(0);
    setComboCount(0);
    setComboMultiplier(1);
    setComboNotification({ show: false, count: 0, multiplier: 1 });
    setPenaltyNotification({ show: false, amount: 0 });
    setHasBonus(false);
    setTotalTrades(0);
    setWinningTrades(0);
    setMaxCombo(0);
    setRoundEndTime(Date.now() + ROUND_DURATION_MS);
    setRecentExecutions([]);
    setTransactionHistory([]);
    nextNewsTimeRef.current = 20000 + Math.random() * 20000; // Reset news timer
    lastPriceRef.current = {
      'BTC-PERP': 50000,
      'ETH-PERP': 3000,
    };
    // Clear all timeouts when starting new round
    timeoutRefs.current.forEach(clearTimeout);
    timeoutRefs.current = [];
    // Update ref with initial asset states
    latestAssetStatesRef.current = {
      'BTC-PERP': {
        indexPrice: 50000,
        markPrice: 50000,
        basis: 0,
        volatility: 0.0007,
        baseVolatility: 0.0007,
        lastNewsTime: 0,
        newsActive: false,
        newsReactionPhase: null,
        newsReactionUntil: 0,
        newsInitialChange: 0,
        newsReversalChange: 0,
        newsContinuationChange: 0,
        newsOriginalPrice: 0,
        newsIsCritical: false,
        newsCriticalStartTime: 0,
        newsCriticalTargetChange: 0,
        newsCriticalProgress: 0,
        maniaUntil: 0,
        jumpProb: 0.04,
        maxJump: 0.004,
        lastAction: null,
        lastUpdateTime: Date.now(),
      },
      'ETH-PERP': {
        indexPrice: 3000,
        markPrice: 3000,
        basis: 0,
        volatility: 0.001,
        baseVolatility: 0.001,
        lastNewsTime: 0,
        newsActive: false,
        newsReactionPhase: null,
        newsReactionUntil: 0,
        newsInitialChange: 0,
        newsReversalChange: 0,
        newsContinuationChange: 0,
        newsOriginalPrice: 0,
        newsIsCritical: false,
        newsCriticalStartTime: 0,
        newsCriticalTargetChange: 0,
        newsCriticalProgress: 0,
        maniaUntil: 0,
        jumpProb: 0.04,
        maxJump: 0.004,
        lastAction: null,
        lastUpdateTime: Date.now(),
      },
    };
  };

  const restart = () => {
    newRound();
  };

  const useBonusPump = () => {
    if (!hasBonus) return;
    
    setAssetStates(prev => {
      const state = prev[selectedAsset];
      const pumpImpact = state.markPrice * 0.008; // 0.8% basis increase (reduced from 2%)
      const now = Date.now();
      const volatilityUntil = now + 15000; // 15 seconds of crazy volatility
      
      return {
        ...prev,
        [selectedAsset]: {
          ...state,
          basis: state.basis + pumpImpact,
          markPrice: state.indexPrice + state.basis + pumpImpact,
          maniaUntil: volatilityUntil,
          jumpProb: 0.3, // Reduced jump probability
          maxJump: 0.015, // Reduced jumps (1.5% max, was 3%)
          lastAction: 'pump',
          lastUpdateTime: now,
        },
      };
    });
    
    setHasBonus(false);
    setComboCount(0); // Reset combo after using bonus
    setComboMultiplier(1);
  };

  const useBonusDump = () => {
    if (!hasBonus) return;
    
    setAssetStates(prev => {
      const state = prev[selectedAsset];
      const dumpImpact = state.markPrice * -0.008; // 0.8% basis decrease (reduced from 2%)
      const now = Date.now();
      const volatilityUntil = now + 15000; // 15 seconds of crazy volatility
      
      return {
        ...prev,
        [selectedAsset]: {
          ...state,
          basis: state.basis + dumpImpact,
          markPrice: state.indexPrice + state.basis + dumpImpact,
          maniaUntil: volatilityUntil,
          jumpProb: 0.3, // Reduced jump probability
          maxJump: 0.015, // Reduced jumps (1.5% max, was 3%)
          lastAction: 'dump',
          lastUpdateTime: now,
        },
      };
    });
    
    setHasBonus(false);
    setComboCount(0); // Reset combo after using bonus
    setComboMultiplier(1);
  };

  const calculateProfit = () => {
    let totalValue = cash;
    
    // Add perp positions
    Object.keys(playerPositions).forEach(assetKey => {
      const asset = assetKey as Asset;
      const state = assetStates[asset];
      const pos = playerPositions[asset];
      
      if (pos.long) {
        const sideValue = 1;
        const uPnL = sideValue * (state.markPrice - pos.long.entryPrice) * pos.long.size;
        totalValue += pos.long.isolatedMargin + uPnL;
      }
      if (pos.short) {
        const sideValue = -1;
        const uPnL = sideValue * (state.markPrice - pos.short.entryPrice) * pos.short.size;
        totalValue += pos.short.isolatedMargin + uPnL;
      }
    });
    
    return totalValue - initialCash;
  };

  const getCrowdTotals = () => {
    const crowd = crowdPositions[selectedAsset];
    let longUSD = 0;
    let shortUSD = 0;
    
    crowd.forEach(pos => {
      const value = pos.entryPrice * pos.size;
      if (pos.side === 'long') {
        longUSD += value;
      } else {
        shortUSD += value;
      }
    });
    
    return { longUSD, shortUSD };
  };

  const state = assetStates[selectedAsset];
  const profit = calculateProfit();
  const crowdTotals = getCrowdTotals();
  const playerPos = playerPositions[selectedAsset];
  
  const remainingMs = roundEndTime ? Math.max(0, roundEndTime - Date.now()) : 0;
  const remainingSec = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(remainingSec / 60);
  const seconds = remainingSec % 60;
  const timeDisplay = roundEndTime ? `${minutes}:${seconds.toString().padStart(2, '0')}` : '--:--';
  const roundOver = roundEndTime !== null && remainingMs <= 0;
  
  // Calculate price change % (compare to price 10 seconds ago from history)
  const history = priceHistoryRef.current[selectedAsset];
  const price10sAgo = history.length > 10 ? history[Math.max(0, history.length - 11)].p : state.markPrice;
  const priceChange = price10sAgo > 0 ? ((state.markPrice - price10sAgo) / price10sAgo) * 100 : 0;
  const priceChangeDisplay = priceChange >= 0 ? `+${priceChange.toFixed(2)}%` : `${priceChange.toFixed(2)}%`;
  
  // Check if mania is active
  const isManiaActive = state.maniaUntil > Date.now();
  const maniaRemainingMs = isManiaActive ? state.maniaUntil - Date.now() : 0;
  const maniaRemainingSec = Math.floor(maniaRemainingMs / 1000);
  
  // Calculate crowd sentiment
  const totalCrowdUSD = crowdTotals.longUSD + crowdTotals.shortUSD;
  const sentimentRatio = totalCrowdUSD > 0 ? (crowdTotals.longUSD - crowdTotals.shortUSD) / totalCrowdUSD : 0;
  
  // Calculate win rate
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto text-white relative touch-pan-y overscroll-y-contain -webkit-overflow-scrolling-touch [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {/* Pre-Game Intro Menu */}
      {showIntroMenu && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-gradient-to-br from-slate-950/95 via-slate-900/95 to-slate-950/95 backdrop-blur-xl rounded-lg">
          <style>{`
            @keyframes float {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-10px); }
            }
            @keyframes glow {
              0%, 100% { box-shadow: 0 0 30px rgba(139, 92, 246, 0.4), 0 0 60px rgba(139, 92, 246, 0.2); }
              50% { box-shadow: 0 0 50px rgba(139, 92, 246, 0.6), 0 0 100px rgba(168, 85, 247, 0.3); }
            }
            @keyframes slideIn {
              from { transform: translateY(30px); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.7; }
            }
          `}</style>
          <div className="relative w-[95%] max-w-sm rounded-3xl bg-gradient-to-br from-slate-900/98 via-slate-800/98 to-slate-900/98 border border-slate-700/50 shadow-2xl overflow-hidden backdrop-blur-xl" style={{ animation: 'slideIn 0.6s ease-out' }}>
            {/* Animated background elements */}
            <div className="absolute inset-0 opacity-15">
              <div className="absolute top-10 left-10 w-32 h-32 bg-emerald-500/25 rounded-full blur-3xl animate-pulse"></div>
              <div className="absolute bottom-10 right-10 w-40 h-40 bg-rose-500/25 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }}></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>
            
            <div className="relative p-6 space-y-4">
              {/* Header */}
              <div className="text-center mb-6">
                <div className="text-4xl mb-2" style={{ animation: 'float 3s ease-in-out infinite' }}>⚡</div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent mb-2">
                  PERPETUAL ARENA
                </h1>
                <p className="text-sm text-slate-400">Where fortunes are made and lost in seconds</p>
              </div>

              {/* Rules Section */}
              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {/* Objective */}
                <div className="rounded-xl bg-gradient-to-br from-emerald-500/8 to-emerald-600/5 border border-emerald-500/20 p-3 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">🎯</span>
                    <h3 className="font-bold text-emerald-400">Objective</h3>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Trade perpetual futures on BTC and ETH. Maximize your score by closing profitable positions. 
                    Each round lasts <span className="font-semibold text-amber-400">5 minutes</span>.
                  </p>
                </div>

                {/* Trading Mechanics */}
                <div className="rounded-xl bg-gradient-to-br from-cyan-500/8 to-blue-500/5 border border-cyan-500/20 p-3 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">📊</span>
                    <h3 className="font-bold text-cyan-400">Trading</h3>
                  </div>
                  <ul className="text-xs text-slate-300 space-y-1 leading-relaxed">
                    <li>• <span className="text-emerald-400 font-semibold">LONG</span> = Bet price goes up</li>
                    <li>• <span className="text-rose-400 font-semibold">SHORT</span> = Bet price goes down</li>
                    <li>• Set <span className="text-amber-400 font-semibold">leverage</span> (2x-50x) and <span className="text-amber-400 font-semibold">margin</span></li>
                    <li>• Hold both long and short simultaneously</li>
                    <li>• Close positions partially (25%, 50%, ALL)</li>
                  </ul>
                </div>

                {/* Scoring System */}
                <div className="rounded-xl bg-gradient-to-br from-amber-500/8 to-yellow-500/5 border border-amber-500/20 p-3 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">⭐</span>
                    <h3 className="font-bold text-amber-400">Scoring & Combos</h3>
                  </div>
                  <ul className="text-xs text-slate-300 space-y-1 leading-relaxed">
                    <li>• Score = Profit × Combo Multiplier</li>
                    <li>• Win 3 trades in a row → <span className="text-violet-400 font-semibold">BONUS UNLOCKED!</span></li>
                    <li>• Bonus grants <span className="text-violet-400 font-semibold">PUMP/DUMP</span> power (15s volatility)</li>
                    <li>• Losing trades reset your combo</li>
                  </ul>
                </div>

                {/* Risks & Penalties */}
                <div className="rounded-xl bg-gradient-to-br from-rose-500/8 to-red-500/5 border border-rose-500/20 p-3 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">⚠️</span>
                    <h3 className="font-bold text-rose-400">Risks</h3>
                  </div>
                  <ul className="text-xs text-slate-300 space-y-1 leading-relaxed">
                    <li>• <span className="text-rose-400 font-semibold">Liquidation</span> if price hits your liq level</li>
                    <li>• <span className="text-amber-400 font-semibold">Quick Close Penalty</span>: -5% if you close within 10 seconds</li>
                    <li>• Watch your liquidation distance bar!</li>
                  </ul>
                </div>

                {/* Market Dynamics */}
                <div className="rounded-xl bg-gradient-to-br from-violet-500/8 to-purple-500/5 border border-violet-500/20 p-3 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">🌊</span>
                    <h3 className="font-bold text-violet-400">Market Dynamics</h3>
                  </div>
                  <ul className="text-xs text-slate-300 space-y-1 leading-relaxed">
                    <li>• <span className="text-yellow-400 font-semibold">News events</span> cause price pumps/dumps</li>
                    <li>• News has <span className="text-amber-400">two phases</span>: initial move → reversal</li>
                    <li>• <span className="text-violet-400 font-semibold">Mania mode</span> = high volatility periods</li>
                    <li>• Crowd trades constantly (watch Recent Executions)</li>
                  </ul>
                </div>

                {/* Pro Tips */}
                <div className="rounded-xl bg-gradient-to-br from-cyan-500/8 to-blue-500/5 border border-cyan-500/20 p-3 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">💡</span>
                    <h3 className="font-bold text-cyan-400">Pro Tips</h3>
                  </div>
                  <ul className="text-xs text-slate-300 space-y-1 leading-relaxed">
                    <li>• Hold positions for 10+ seconds to avoid penalties</li>
                    <li>• Watch news popups - they move markets!</li>
                    <li>• Use bonus pump/dump strategically</li>
                    <li>• Check Transaction History to learn from mistakes</li>
                  </ul>
                </div>
              </div>

              {/* Start Button */}
              <button
                onClick={() => setShowIntroMenu(false)}
                className="w-full mt-4 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-cyan-600 text-white font-bold py-4 text-lg shadow-[0_0_30px_rgba(139,92,246,0.5)] transition-all duration-300 active:scale-[0.98] touch-manipulation min-h-[56px]"
                style={{ animation: 'glow 2s ease-in-out infinite' }}
              >
                START TRADING
              </button>
            </div>
          </div>
        </div>
      )}

      {/* News Popup */}
      {showNewsPopup && currentNews && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md rounded-lg" style={{ animation: 'fadeIn 0.3s ease-out' }}>
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes slideUp {
              from { transform: translateY(20px); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
          `}</style>
          <div className={`relative w-11/12 max-w-sm rounded-2xl p-5 shadow-2xl backdrop-blur-xl ${
            currentNews.sentiment === 'bullish' 
              ? 'bg-gradient-to-br from-emerald-900/95 via-emerald-800/90 to-emerald-900/95 border border-emerald-500/40 ring-2 ring-emerald-500/20' 
              : 'bg-gradient-to-br from-rose-900/95 via-rose-800/90 to-rose-900/95 border border-rose-500/40 ring-2 ring-rose-500/20'
          }`} style={{ animation: 'slideUp 0.4s ease-out' }}>
            <button
              onClick={() => setShowNewsPopup(false)}
              className="absolute top-3 right-3 text-white/60 hover:text-white text-xl transition-colors"
            >
              ×
            </button>
            <div className="text-center mb-3">
              <div className={`text-4xl mb-3 ${currentNews.sentiment === 'bullish' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {currentNews.sentiment === 'bullish' ? '📈' : '📉'}
              </div>
              <div className={`text-xs font-semibold uppercase tracking-wider mb-2 ${
                currentNews.importance === 'critical' ? 'text-yellow-400' :
                currentNews.importance === 'high' ? 'text-orange-400' :
                currentNews.importance === 'medium' ? 'text-cyan-400' : 'text-slate-400'
              }`}>
                {currentNews.importance.toUpperCase()} NEWS • {currentNews.asset}
              </div>
              <div className="text-lg font-bold text-white mb-2">{currentNews.title}</div>
              <div className="text-sm text-white/80 leading-relaxed">{currentNews.description}</div>
              <div className={`mt-4 inline-block px-4 py-1.5 rounded-full text-xs font-semibold ${
                currentNews.sentiment === 'bullish' 
                  ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-500/30' 
                  : 'bg-rose-500/25 text-rose-200 border border-rose-500/30'
              }`}>
                {currentNews.sentiment === 'bullish' ? '↗ BULLISH' : '↘ BEARISH'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Combo Notification */}
      {comboNotification.show && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
          <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl px-6 py-3 text-center shadow-[0_0_30px_rgba(245,158,11,0.6)] animate-pulse border border-amber-400/30">
            <div className="text-xl font-bold text-white">COMBO x{comboNotification.multiplier.toFixed(1)}!</div>
            <div className="text-xs text-amber-100 mt-1">{comboNotification.count} in a row</div>
          </div>
        </div>
      )}

      {/* Penalty Notification */}
      {penaltyNotification.show && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
          <div className="bg-gradient-to-r from-rose-600 to-rose-700 rounded-xl px-6 py-3 text-center shadow-[0_0_30px_rgba(225,29,72,0.6)] animate-pulse border border-rose-400/30">
            <div className="text-lg font-bold text-white">⚠️ QUICK CLOSE PENALTY</div>
            <div className="text-sm text-rose-100 mt-1">-${penaltyNotification.amount.toFixed(2)}</div>
            <div className="text-[10px] text-rose-200 mt-1">Hold positions for 10+ seconds</div>
          </div>
        </div>
      )}

      {/* Asset Switcher - Mobile Optimized */}
      <div className="mb-2 flex gap-2">
        <button
          onClick={() => setSelectedAsset('BTC-PERP')}
          className={`flex-1 rounded-lg px-3 py-3 text-sm font-semibold transition-all touch-manipulation min-h-[44px] ${
            selectedAsset === 'BTC-PERP'
              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]'
              : 'bg-slate-800/60 text-slate-300 active:bg-slate-800/80 border border-slate-700/50'
          }`}
        >
          BTC-PERP
        </button>
        <button
          onClick={() => setSelectedAsset('ETH-PERP')}
          className={`flex-1 rounded-lg px-3 py-3 text-sm font-semibold transition-all touch-manipulation min-h-[44px] ${
            selectedAsset === 'ETH-PERP'
              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]'
              : 'bg-slate-800/60 text-slate-300 active:bg-slate-800/80 border border-slate-700/50'
          }`}
        >
          ETH-PERP
        </button>
      </div>

      {/* Arcade HUD - Compact Pill Style */}
      <div className="mb-2 rounded-xl bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 px-3 py-2 shadow-lg">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 font-medium">Cash:</span>
            <span className="text-sm font-mono text-slate-100 font-semibold">${cash.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 font-medium">Score:</span>
            <span className="text-sm font-mono text-amber-400 font-bold">{score.toFixed(0)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 font-medium">Combo:</span>
            <span className={`text-sm font-mono font-bold ${comboCount > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
              x{comboCount > 0 ? comboMultiplier.toFixed(1) : '1.0'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 font-medium">Time:</span>
            <span className={`text-sm font-mono font-semibold ${remainingMs < 10000 && remainingMs > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-100'}`}>
              {timeDisplay}
            </span>
          </div>
        </div>
        {hasBonus && (
          <div className="mt-2 text-center pt-2 border-t border-slate-700/50">
            <span className="text-[10px] font-bold text-violet-300 animate-pulse">🎁 BONUS READY - PUMP/DUMP AVAILABLE!</span>
          </div>
        )}
      </div>

      {/* Market View - Price Panel + Chart Grouped */}
      <div className={`mb-2 rounded-xl bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 p-3 shadow-lg ${isManiaActive ? 'ring-2 ring-violet-500/40 shadow-[0_0_20px_rgba(139,92,246,0.3)]' : ''}`}>
        <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-300">
          <span>Market View</span>
          <div className="flex items-center gap-2">
            {isManiaActive && (
              <span className="text-[10px] text-violet-300 animate-pulse font-semibold">🔥 MANIA {maniaRemainingSec}s</span>
            )}
            {state.newsActive && (
              <span className="text-[10px] text-yellow-400 animate-pulse font-semibold">⚡ NEWS</span>
            )}
          </div>
        </div>
        
        {/* Prominent Mark Price */}
        <div className="mb-3 text-center pb-3 border-b border-slate-700/40">
          <div className="text-3xl font-mono font-bold text-slate-50 mb-1">
            ${state.markPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="flex items-center justify-center gap-2 text-xs flex-wrap">
            <span className={`font-semibold ${priceChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {priceChange >= 0 ? '↗' : '↘'} {priceChangeDisplay}
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">Index: ${state.indexPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className="text-slate-500">•</span>
            <span className={`${state.basis >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              Basis: ${state.basis.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Compact News Banner */}
        {currentNews && (
          <div className="mb-3 rounded-lg bg-slate-800/60 backdrop-blur-sm border border-slate-700/40 px-2.5 py-1.5">
            <div className="flex items-center gap-2">
              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                currentNews.importance === 'critical' ? 'bg-yellow-500/25 text-yellow-300 border border-yellow-500/30' :
                currentNews.importance === 'high' ? 'bg-orange-500/25 text-orange-300 border border-orange-500/30' :
                currentNews.importance === 'medium' ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/30' : 'bg-slate-500/25 text-slate-300 border border-slate-500/30'
              }`}>
                {currentNews.importance === 'critical' ? 'CRIT' :
                 currentNews.importance === 'high' ? 'HIGH' :
                 currentNews.importance === 'medium' ? 'MED' : 'LOW'}
              </span>
              <span className={`text-[11px] ${currentNews.sentiment === 'bullish' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {currentNews.sentiment === 'bullish' ? '▲' : '▼'}
              </span>
              <span className="text-[11px] text-slate-100 flex-1 truncate font-medium">{currentNews.title}</span>
            </div>
          </div>
        )}

        {/* Price Chart - SVG-based (no canvas for compliance) */}
        <div className="relative w-full h-44 rounded-xl bg-black border border-slate-700 shadow-md overflow-hidden">
          {(() => {
            const history = priceHistoryRef.current[selectedAsset];
            if (history.length < 2) {
              return (
                <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                  Loading chart...
                </div>
              );
            }
            
            const prices = history.map(point => point.p);
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);
            const pricePadding = (maxPrice - minPrice) * 0.05 || (minPrice * 0.01);
            const adjustedMinPrice = minPrice - pricePadding;
            const adjustedMaxPrice = maxPrice + pricePadding;
            const priceRange = adjustedMaxPrice - adjustedMinPrice || 1;
            
            const padding = 40;
            const chartWidth = 300 - padding * 2;
            const chartHeight = 180 - padding * 2;
            
            const points = history.map((point, index) => {
              const x = padding + (history.length > 1 ? (index / (history.length - 1)) * chartWidth : chartWidth / 2);
              const y = padding + chartHeight - ((point.p - adjustedMinPrice) / priceRange) * chartHeight;
              return { x, y, price: point.p };
            });
            
            const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
            const areaPath = `${pathData} L ${points[points.length - 1].x} ${padding + chartHeight} L ${points[0].x} ${padding + chartHeight} Z`;
            
            const latestPrice = prices[prices.length - 1];
            const previousPrice = prices.length > 1 ? prices[prices.length - 2] : latestPrice;
            const isRising = latestPrice >= previousPrice;
            const latestPoint = points[points.length - 1];
            
            const playerPos = playerPositions[selectedAsset];
            
            return (
              <svg width="300" height="180" className="w-full h-full" viewBox="0 0 300 180">
                {/* Grid lines */}
                {Array.from({ length: 6 }).map((_, i) => (
                  <line
                    key={`h-${i}`}
                    x1={padding}
                    y1={padding + (i / 5) * chartHeight}
                    x2={300 - padding}
                    y2={padding + (i / 5) * chartHeight}
                    stroke="#333333"
                    strokeWidth="0.5"
                    strokeDasharray="2,2"
                  />
                ))}
                {Array.from({ length: 6 }).map((_, i) => (
                  <line
                    key={`v-${i}`}
                    x1={padding + (i / 5) * chartWidth}
                    y1={padding}
                    x2={padding + (i / 5) * chartWidth}
                    y2={180 - padding}
                    stroke="#333333"
                    strokeWidth="0.5"
                    strokeDasharray="2,2"
                  />
                ))}
                
                {/* Area fill */}
                <path
                  d={areaPath}
                  fill={isRising ? 'url(#gradientGreen)' : 'url(#gradientRed)'}
                  opacity="0.3"
                />
                <defs>
                  <linearGradient id="gradientGreen" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="gradientRed" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
                  </linearGradient>
                </defs>
                
                {/* Price line */}
                <path
                  d={pathData}
                  fill="none"
                  stroke={isRising ? '#10b981' : '#f43f5e'}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                
                {/* Entry markers */}
                {playerPos.long && (() => {
                  const entryY = padding + chartHeight - ((playerPos.long.entryPrice - adjustedMinPrice) / priceRange) * chartHeight;
                  if (entryY >= padding && entryY <= padding + chartHeight) {
                    return (
                      <g key="long-marker">
                        <line
                          x1={padding}
                          y1={entryY}
                          x2={300 - padding}
                          y2={entryY}
                          stroke="#10b981"
                          strokeWidth="1"
                          strokeDasharray="4,4"
                        />
                        <circle
                          cx={padding + chartWidth * 0.12}
                          cy={entryY}
                          r="6"
                          fill="#10b981"
                          stroke="#ffffff"
                          strokeWidth="2"
                        />
                        <text
                          x={padding + chartWidth * 0.18}
                          y={entryY - 2}
                          fill="#ffffff"
                          fontSize="9"
                          fontWeight="600"
                          className="font-mono"
                        >
                          LONG @ ${playerPos.long.entryPrice.toFixed(2)}
                        </text>
                      </g>
                    );
                  }
                  return null;
                })()}
                {playerPos.short && (() => {
                  const entryY = padding + chartHeight - ((playerPos.short.entryPrice - adjustedMinPrice) / priceRange) * chartHeight;
                  if (entryY >= padding && entryY <= padding + chartHeight) {
                    return (
                      <g key="short-marker">
                        <line
                          x1={padding}
                          y1={entryY}
                          x2={300 - padding}
                          y2={entryY}
                          stroke="#f43f5e"
                          strokeWidth="1"
                          strokeDasharray="4,4"
                        />
                        <circle
                          cx={padding + chartWidth * 0.12}
                          cy={entryY}
                          r="6"
                          fill="#f43f5e"
                          stroke="#ffffff"
                          strokeWidth="2"
                        />
                        <text
                          x={padding + chartWidth * 0.18}
                          y={entryY + 12}
                          fill="#ffffff"
                          fontSize="9"
                          fontWeight="600"
                          className="font-mono"
                        >
                          SHORT @ ${playerPos.short.entryPrice.toFixed(2)}
                        </text>
                      </g>
                    );
                  }
                  return null;
                })()}
                
                {/* Current price indicator */}
                <line
                  x1={padding}
                  y1={latestPoint.y}
                  x2={300 - padding}
                  y2={latestPoint.y}
                  stroke={isRising ? '#10b981' : '#f43f5e'}
                  strokeWidth="1"
                  strokeDasharray="6,4"
                />
                <circle
                  cx={latestPoint.x}
                  cy={latestPoint.y}
                  r="5"
                  fill={isRising ? '#10b981' : '#f43f5e'}
                  stroke="#ffffff"
                  strokeWidth="2"
                />
                <text
                  x={300 - padding - 6}
                  y={latestPoint.y - 3}
                  fill="#ffffff"
                  fontSize="10"
                  fontWeight="600"
                  textAnchor="end"
                  className="font-mono"
                >
                  ${latestPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </text>
              </svg>
            );
          })()}
        </div>
      </div>

      {/* Recent Executions */}
      <div className="mb-2 rounded-xl bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 p-2.5 shadow-lg">
        <div className="mb-2 text-xs font-semibold text-slate-300">Recent Executions</div>
        {recentExecutions.length > 0 ? (
          <div className="space-y-0.5 max-h-32 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {recentExecutions.filter(exec => Date.now() - exec.time < 10000).map((exec, idx) => {
              const isMostRecent = idx === 0 && Date.now() - exec.time < 500;
              return (
                <div key={idx} className={`flex justify-between font-mono text-[10px] py-0.5 px-1 rounded transition-colors ${isMostRecent ? 'bg-slate-700/50' : 'hover:bg-slate-800/30'}`}>
                  <span className={`font-semibold ${
                    exec.isCrowd 
                      ? (exec.side === 'buy' ? 'text-emerald-300/60' : 'text-rose-300/60')
                      : (exec.side === 'buy' ? 'text-emerald-400' : 'text-rose-400')
                  }`}>
                    {exec.isCrowd ? `Crowd ${exec.side === 'buy' ? 'BUY' : 'SELL'}` : (exec.side === 'buy' ? 'BUY' : 'SELL')}
                  </span>
                  <span className="text-slate-300">{exec.size.toFixed(2)}</span>
                  <span className="text-slate-400">@ ${exec.price.toFixed(2)}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-[9px] text-slate-500 text-center py-4">No recent executions</div>
        )}
      </div>

      {/* Player Positions - Compact Grid Layout */}
      <div className="mb-2 rounded-xl bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 p-2.5 shadow-lg">
        <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-300">
          <span>Your Positions</span>
          {(playerPos.long || playerPos.short) && (
            <button
              onClick={() => {
                if (playerPos.long) closePosition('long', 1);
                if (playerPos.short) closePosition('short', 1);
              }}
              className="text-[9px] px-2.5 py-1 rounded-lg bg-gradient-to-r from-rose-600 to-rose-700 text-rose-100 hover:from-rose-500 hover:to-rose-600 transition-all hover:scale-[1.05] active:scale-[0.95] shadow-[0_0_10px_rgba(225,29,72,0.3)]"
            >
              Close All
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {playerPos.long && (() => {
            const sideValue = 1;
            const uPnL = sideValue * (state.markPrice - playerPos.long.entryPrice) * playerPos.long.size;
            const roe = (uPnL / playerPos.long.isolatedMargin) * 100;
            // Recalculate liquidation price to ensure it's current (matches liquidation check logic)
            const currentLiqPrice = calculateLiqPrice(playerPos.long.side, playerPos.long.entryPrice, playerPos.long.size, playerPos.long.isolatedMargin, playerPos.long.maintenanceLeverage);
            const distanceToLiq = ((state.markPrice - currentLiqPrice) / currentLiqPrice) * 100;
            const timeHeld = Date.now() - (playerPos.long.openedAt || Date.now());
            const timeHeldSec = Math.floor(timeHeld / 1000);
            const isTooNew = timeHeld < 10000; // Less than 10 seconds
            return (
              <div className={`rounded-lg bg-gradient-to-br from-emerald-500/12 to-emerald-600/8 p-2.5 text-[10px] border backdrop-blur-sm ${isTooNew ? 'border-amber-500/40 ring-1 ring-amber-500/20' : 'border-emerald-500/25'}`}>
                <div className="font-bold text-emerald-400 mb-1.5">LONG</div>
                <div className="space-y-0.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Size:</span>
                    <span className="font-mono text-slate-300">{playerPos.long.size.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Entry:</span>
                    <span className="font-mono text-slate-300">${playerPos.long.entryPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Leverage:</span>
                    <span className="font-mono text-slate-300">{playerPos.long.leverage.toFixed(1)}x</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Held:</span>
                    <span className={`font-mono ${isTooNew ? 'text-yellow-400 font-semibold' : 'text-slate-300'}`}>
                      {timeHeldSec}s {isTooNew && '⚠️'}
                    </span>
                  </div>
                  <div className="pt-1 border-t border-slate-600/30">
                    <div className="flex justify-between mb-0.5">
                      <span className="text-slate-400">uPnL:</span>
                      <span className={`font-mono font-semibold ${uPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        ${uPnL.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-400">ROE:</span>
                      <span className={`font-mono font-semibold ${roe >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {roe.toFixed(2)}%
                      </span>
                    </div>
                    <div className="mb-1">
                      <div className="flex justify-between text-[8px] text-slate-400 mb-0.5">
                        <span>Liq: ${currentLiqPrice.toFixed(2)}</span>
                        <span>{distanceToLiq.toFixed(2)}% away</span>
                      </div>
                      <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all ${distanceToLiq > 10 ? 'bg-green-500' : distanceToLiq > 5 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${Math.min(100, Math.max(0, distanceToLiq * 10))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mt-1.5 flex gap-1">
                    <button
                      onClick={() => closePosition('long', 0.25)}
                      className="flex-1 rounded-lg bg-gradient-to-r from-rose-600/80 to-rose-700/80 text-rose-100 px-2 py-2.5 text-[10px] font-semibold transition-all active:scale-[0.95] shadow-sm touch-manipulation min-h-[36px]"
                    >
                      25%
                    </button>
                    <button
                      onClick={() => closePosition('long', 0.5)}
                      className="flex-1 rounded-lg bg-gradient-to-r from-rose-600 to-rose-700 text-rose-100 px-2 py-2.5 text-[10px] font-semibold transition-all active:scale-[0.95] shadow-sm touch-manipulation min-h-[36px]"
                    >
                      50%
                    </button>
                    <button
                      onClick={() => closePosition('long', 1)}
                      className="flex-1 rounded-lg bg-gradient-to-r from-rose-600 to-rose-700 text-rose-100 px-2 py-2.5 text-[10px] font-semibold transition-all active:scale-[0.95] shadow-[0_0_8px_rgba(225,29,72,0.4)] touch-manipulation min-h-[36px]"
                    >
                      ALL
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
          {playerPos.short && (() => {
            const sideValue = -1;
            const uPnL = sideValue * (state.markPrice - playerPos.short.entryPrice) * playerPos.short.size;
            const roe = (uPnL / playerPos.short.isolatedMargin) * 100;
            // Recalculate liquidation price to ensure it's current (matches liquidation check logic)
            const currentLiqPrice = calculateLiqPrice(playerPos.short.side, playerPos.short.entryPrice, playerPos.short.size, playerPos.short.isolatedMargin, playerPos.short.maintenanceLeverage);
            const distanceToLiq = ((currentLiqPrice - state.markPrice) / currentLiqPrice) * 100;
            const timeHeld = Date.now() - (playerPos.short.openedAt || Date.now());
            const timeHeldSec = Math.floor(timeHeld / 1000);
            const isTooNew = timeHeld < 10000; // Less than 10 seconds
            return (
              <div className={`rounded-lg bg-gradient-to-br from-rose-500/12 to-rose-600/8 p-2.5 text-[10px] border backdrop-blur-sm ${isTooNew ? 'border-amber-500/40 ring-1 ring-amber-500/20' : 'border-rose-500/25'}`}>
                <div className="font-bold text-rose-400 mb-1.5">SHORT</div>
                <div className="space-y-0.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Size:</span>
                    <span className="font-mono text-slate-300">{playerPos.short.size.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Entry:</span>
                    <span className="font-mono text-slate-300">${playerPos.short.entryPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Leverage:</span>
                    <span className="font-mono text-slate-300">{playerPos.short.leverage.toFixed(1)}x</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Held:</span>
                    <span className={`font-mono ${isTooNew ? 'text-yellow-400 font-semibold' : 'text-slate-300'}`}>
                      {timeHeldSec}s {isTooNew && '⚠️'}
                    </span>
                  </div>
                  <div className="pt-1 border-t border-slate-600/30">
                    <div className="flex justify-between mb-0.5">
                      <span className="text-slate-400">uPnL:</span>
                      <span className={`font-mono font-semibold ${uPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        ${uPnL.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-400">ROE:</span>
                      <span className={`font-mono font-semibold ${roe >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {roe.toFixed(2)}%
                      </span>
                    </div>
                    <div className="mb-1">
                      <div className="flex justify-between text-[8px] text-slate-400 mb-0.5">
                        <span>Liq: ${currentLiqPrice.toFixed(2)}</span>
                        <span>{distanceToLiq.toFixed(2)}% away</span>
                      </div>
                      <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all ${distanceToLiq > 10 ? 'bg-green-500' : distanceToLiq > 5 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${Math.min(100, Math.max(0, distanceToLiq * 10))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mt-1.5 flex gap-1">
                    <button
                      onClick={() => closePosition('short', 0.25)}
                      className="flex-1 rounded-lg bg-gradient-to-r from-emerald-600/80 to-emerald-700/80 text-emerald-100 px-2 py-2.5 text-[10px] font-semibold transition-all active:scale-[0.95] shadow-sm touch-manipulation min-h-[36px]"
                    >
                      25%
                    </button>
                    <button
                      onClick={() => closePosition('short', 0.5)}
                      className="flex-1 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-700 text-emerald-100 px-2 py-2.5 text-[10px] font-semibold transition-all active:scale-[0.95] shadow-sm touch-manipulation min-h-[36px]"
                    >
                      50%
                    </button>
                    <button
                      onClick={() => closePosition('short', 1)}
                      className="flex-1 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-700 text-emerald-100 px-2 py-2.5 text-[10px] font-semibold transition-all active:scale-[0.95] shadow-[0_0_8px_rgba(16,185,129,0.4)] touch-manipulation min-h-[36px]"
                    >
                      ALL
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
        {!playerPos.long && !playerPos.short && (
          <div className="text-center text-[10px] text-slate-500 py-4">No positions</div>
        )}
      </div>

      {/* Trading Controls - Inside Phone Screen */}
      {!gameOver && !roundOver && (
        <div className="mb-2 border-t border-slate-700/40 pt-3">
          <div className="mb-2.5 text-xs font-semibold text-slate-300">Trading</div>
          
          {/* Trade Leverage Slider */}
          <div className="mb-2.5 rounded-xl bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 p-2.5 shadow-lg">
            <div className="mb-1.5 flex justify-between text-xs">
              <span className="font-semibold text-slate-300">Leverage</span>
              <span className="font-mono text-cyan-400 font-bold">{tradeLeverage.toFixed(0)}x</span>
            </div>
            <input
              type="range"
              min="2"
              max="50"
              value={tradeLeverage}
              onChange={(e) => setTradeLeverage(Number(e.target.value))}
              className="w-full accent-cyan-500"
            />
            <div className="mt-1 flex justify-between text-[9px] text-slate-500">
              <span>2x</span>
              <span>50x</span>
            </div>
          </div>

          {/* Trade Margin Slider */}
          <div className="mb-2.5 rounded-xl bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 p-2.5 shadow-lg">
            <div className="mb-1.5 flex justify-between text-xs">
              <span className="font-semibold text-slate-300">Margin USD</span>
              <span className="font-mono text-cyan-400 font-bold">${tradeMarginUSD.toFixed(0)}</span>
            </div>
            <input
              type="range"
              min={MIN_SPEND}
              max={Math.min(cash, cash * 0.5)}
              step={100}
              value={tradeMarginUSD}
              onChange={(e) => setTradeMarginUSD(Number(e.target.value))}
              className="w-full accent-cyan-500"
            />
            <div className="mt-1 flex justify-between text-[9px] text-slate-500">
              <span>${MIN_SPEND}</span>
              <span>${Math.min(cash, cash * 0.5).toFixed(0)}</span>
            </div>
            <div className="mt-2 flex gap-1.5">
              {[500, 1000, 2500, 5000].map(amt => (
                <button
                  key={amt}
                  onClick={() => setTradeMarginUSD(Math.min(amt, Math.min(cash, cash * 0.5)))}
                  className="flex-1 rounded-lg px-2 py-1 text-[9px] bg-slate-700/50 text-slate-300 hover:bg-slate-700/70 border border-slate-600/50 transition-all hover:scale-[1.05] active:scale-[0.95]"
                >
                  ${amt}
                </button>
              ))}
            </div>
          </div>

          {/* Trade Buttons - Big Arcade Style - Mobile Optimized */}
          <div className="mb-2.5 flex gap-2">
            <button
              onClick={() => openPosition('long')}
              disabled={cash < tradeMarginUSD || roundOver}
              className="flex-1 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-emerald-50 px-4 py-4 text-base font-bold shadow-[0_0_25px_rgba(16,185,129,0.5)] transition-all active:scale-[0.95] active:from-emerald-500 active:to-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none touch-manipulation min-h-[48px]"
            >
              LONG
            </button>
            <button
              onClick={() => openPosition('short')}
              disabled={cash < tradeMarginUSD || roundOver}
              className="flex-1 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 text-rose-50 px-4 py-4 text-base font-bold shadow-[0_0_25px_rgba(225,29,72,0.5)] transition-all active:scale-[0.95] active:from-rose-500 active:to-rose-600 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none touch-manipulation min-h-[48px]"
            >
              SHORT
            </button>
          </div>

          {/* Bonus Pump/Dump Buttons */}
          {hasBonus && (
            <div className="mb-2.5 rounded-xl bg-gradient-to-br from-violet-900/60 to-purple-900/60 backdrop-blur-sm p-3 border-2 border-violet-500/40 shadow-[0_0_20px_rgba(139,92,246,0.3)]">
              <div className="mb-2.5 text-center">
                <div className="text-xs font-bold text-amber-400 mb-1">🎁 BONUS UNLOCKED!</div>
                <div className="text-[10px] text-slate-300">3 wins in a row - Use your power!</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={useBonusPump}
                  className="flex-1 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-emerald-50 px-3 py-3 text-sm font-bold shadow-[0_0_20px_rgba(16,185,129,0.5)] transition-all active:scale-[0.95] active:from-emerald-500 active:to-emerald-600 touch-manipulation min-h-[48px]"
                >
                  ⬆️ PUMP
                </button>
                <button
                  onClick={useBonusDump}
                  className="flex-1 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 text-rose-50 px-3 py-3 text-sm font-bold shadow-[0_0_20px_rgba(225,29,72,0.5)] transition-all active:scale-[0.95] active:from-rose-500 active:to-rose-600 touch-manipulation min-h-[48px]"
                >
                  ⬇️ DUMP
                </button>
              </div>
              <div className="mt-2 text-[9px] text-center text-slate-400">
                Triggers 15s of crazy volatility!
              </div>
            </div>
          )}
        </div>
      )}

      {/* Round Over Overlay */}
      {roundOver && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-50">
          <div className="rounded-2xl bg-gradient-to-br from-slate-900/98 to-slate-800/98 backdrop-blur-xl border border-slate-700/60 px-5 py-4 w-[90%] max-w-xs text-center shadow-2xl">
            <div className="mb-3 text-xl font-bold text-violet-400">ROUND OVER</div>
            <div className="mb-4 text-4xl font-mono text-amber-400 font-bold">{score.toFixed(0)}</div>
            <div className="mb-4 rounded-xl bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 p-3 text-left space-y-1.5">
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-400">Best Score:</span>
                <span className="font-mono text-amber-400 font-semibold">{bestScore.toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-400">Total Trades:</span>
                <span className="font-mono text-slate-300">{totalTrades}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-400">Win Rate:</span>
                <span className={`font-mono font-semibold ${winRate >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {winRate.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-400">Max Combo:</span>
                <span className="font-mono text-amber-400 font-semibold">{maxCombo}</span>
              </div>
            </div>
            <button
              onClick={newRound}
              className="w-full rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-4 py-4 text-base font-bold shadow-[0_0_25px_rgba(6,182,212,0.5)] transition-all active:scale-[0.95] active:from-cyan-500 active:to-blue-500 touch-manipulation min-h-[52px]"
            >
              NEW ROUND
            </button>
          </div>
        </div>
      )}

      {/* Game Over Overlay */}
      {gameOver && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-50">
          <div className="rounded-2xl bg-gradient-to-br from-slate-900/98 to-slate-800/98 backdrop-blur-xl border border-slate-700/60 px-5 py-4 w-[90%] max-w-xs text-center shadow-2xl">
            <div className="mb-3 text-xl font-bold text-rose-400">GAME OVER</div>
            <div className="mb-4 text-xs text-slate-300">Cash below minimum spend</div>
            <button
              onClick={restart}
              className="w-full rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-4 py-4 text-base font-bold shadow-[0_0_25px_rgba(6,182,212,0.5)] transition-all active:scale-[0.95] active:from-cyan-500 active:to-blue-500 touch-manipulation min-h-[52px]"
            >
              RESTART
            </button>
          </div>
        </div>
      )}

      {/* Transaction History - Hidden Section */}
      <div className="mb-2">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full rounded-xl bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 px-3 py-3 text-xs font-semibold text-slate-300 transition-all active:scale-[0.98] active:bg-slate-800/80 flex items-center justify-between shadow-lg touch-manipulation min-h-[44px]"
        >
          <span>Transaction History</span>
          <span className="text-slate-500">{showHistory ? '▼' : '▶'}</span>
        </button>
        
        {showHistory && (
          <div className="mt-2 rounded-xl bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 p-2.5 max-h-64 overflow-y-auto shadow-lg [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {transactionHistory.length > 0 ? (
              <div className="space-y-1.5">
                {transactionHistory.map((tx) => {
                  const timeAgo = Math.floor((Date.now() - tx.time) / 1000);
                  const timeDisplay = timeAgo < 60 ? `${timeAgo}s ago` : timeAgo < 3600 ? `${Math.floor(timeAgo / 60)}m ago` : `${Math.floor(timeAgo / 3600)}h ago`;
                  
                  return (
                    <div
                      key={tx.id}
                      className={`rounded-lg p-2.5 text-[10px] border backdrop-blur-sm ${
                        tx.type === 'liquidation'
                          ? 'bg-rose-900/25 border-rose-500/30'
                          : tx.type === 'closed' && tx.pnl && tx.pnl > 0
                          ? 'bg-emerald-900/25 border-emerald-500/30'
                          : tx.type === 'closed'
                          ? 'bg-rose-900/25 border-rose-500/30'
                          : 'bg-cyan-900/25 border-cyan-500/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-bold ${
                            tx.side === 'long' ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {tx.side.toUpperCase()}
                          </span>
                          <span className="text-slate-400">{tx.asset}</span>
                          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-semibold ${
                            tx.type === 'liquidation'
                              ? 'bg-rose-500/25 text-rose-300 border border-rose-500/30'
                              : tx.type === 'closed'
                              ? 'bg-slate-500/25 text-slate-300 border border-slate-500/30'
                              : 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/30'
                          }`}>
                            {tx.type === 'liquidation' ? 'LIQUIDATED' : tx.type === 'closed' ? 'CLOSED' : 'OPENED'}
                          </span>
                        </div>
                        <span className="text-slate-500 text-[9px]">{timeDisplay}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-1 text-[9px]">
                        <div>
                          <span className="text-slate-400">Entry:</span>
                          <span className="font-mono text-slate-300 ml-1">${tx.entryPrice.toFixed(2)}</span>
                        </div>
                        {tx.exitPrice && (
                          <div>
                            <span className="text-slate-400">Exit:</span>
                            <span className="font-mono text-slate-300 ml-1">${tx.exitPrice.toFixed(2)}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-slate-400">Size:</span>
                          <span className="font-mono text-slate-300 ml-1">{tx.size.toFixed(4)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Leverage:</span>
                          <span className="font-mono text-slate-300 ml-1">{tx.leverage.toFixed(1)}x</span>
                        </div>
                        {tx.liqPrice && (
                          <div className="col-span-2">
                            <span className="text-slate-400">Liq Price:</span>
                            <span className="font-mono text-red-400 ml-1">${tx.liqPrice.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="col-span-2">
                          <span className="text-slate-400">P&L:</span>
                          <span className={`font-mono font-bold ml-1 ${tx.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            ${tx.pnl.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center text-[10px] text-slate-500 py-8">No transaction history</div>
            )}
          </div>
        )}
      </div>

      {/* News Ticker - Mini Telegram Style */}
      {currentNews && (
        <div className="sticky bottom-0 left-0 right-0 mt-auto border-t border-slate-700/50 bg-slate-900/95 backdrop-blur-md shadow-lg">
          <div className="flex items-center gap-2.5 px-3 py-2 overflow-hidden">
            <span className={`text-sm flex-shrink-0 ${
              currentNews.importance === 'critical' ? 'text-yellow-400' :
              currentNews.importance === 'high' ? 'text-orange-400' :
              currentNews.importance === 'medium' ? 'text-cyan-400' : 'text-slate-400'
            }`}>
              {currentNews.importance === 'critical' ? '⦿' :
               currentNews.importance === 'high' ? '◎' :
               currentNews.importance === 'medium' ? '◉' : '●'}
            </span>
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className={`text-[11px] font-semibold uppercase flex-shrink-0 ${
                currentNews.sentiment === 'bullish' ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {currentNews.sentiment === 'bullish' ? '↗' : '↘'}
              </span>
              <span className="text-[11px] text-slate-200 truncate font-medium">
                {currentNews.title}
              </span>
            </div>
            <span className="text-[9px] text-slate-500 flex-shrink-0 font-medium">
              {currentNews.asset}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
// Next, React
