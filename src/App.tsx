import { useState, useEffect } from "react";
import { useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import "./app.css";

// Types
interface Market {
  _id: Id<"markets">;
  marketId: string;
  question: string;
  slug: string;
  probability: number;
  volume24h: number;
  liquidity: number;
  bidWallStrength: number;
  askWallStrength: number;
  spreadPercent: number;
  vwap: number;
  orderBookImbalance: number;
  lastUpdated: number;
}

interface Trade {
  _id: Id<"trades">;
  marketId: string;
  price: number;
  size: number;
  side: string;
  isWhale: boolean;
  timestamp: number;
}

interface WhaleAlert {
  _id: Id<"whaleAlerts">;
  marketId: string;
  marketQuestion: string;
  address: string;
  action: string;
  size: number;
  priceImpact: number;
  levelsSwept: number;
  timestamp: number;
}

interface Signal {
  _id: Id<"signals">;
  marketId: string;
  marketQuestion: string;
  signalType: string;
  severity: string;
  message: string;
  timestamp: number;
}

// Auth Component
function AuthScreen() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    try {
      await signIn("password", formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="scanlines" />
      <div className="auth-box">
        <div className="auth-header">
          <div className="logo-icon">◈</div>
          <h1 className="auth-title">POLYMARKET<span className="accent">_INTEL</span></h1>
          <p className="auth-subtitle">Real-time market intelligence</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <label>EMAIL</label>
            <input
              name="email"
              type="email"
              placeholder="agent@polymarket.intel"
              required
            />
          </div>
          <div className="input-group">
            <label>PASSWORD</label>
            <input
              name="password"
              type="password"
              placeholder="••••••••"
              required
            />
          </div>
          <input name="flow" type="hidden" value={flow} />

          {error && <div className="error-msg">{error}</div>}

          <button type="submit" className="auth-btn primary" disabled={loading}>
            {loading ? "AUTHENTICATING..." : flow === "signIn" ? "SIGN IN" : "CREATE ACCOUNT"}
          </button>
        </form>

        <div className="auth-divider">
          <span>OR</span>
        </div>

        <button
          className="auth-btn secondary"
          onClick={() => setFlow(flow === "signIn" ? "signUp" : "signIn")}
        >
          {flow === "signIn" ? "CREATE NEW ACCOUNT" : "SIGN IN INSTEAD"}
        </button>

        <button
          className="auth-btn ghost"
          onClick={() => signIn("anonymous")}
        >
          CONTINUE AS GUEST
        </button>
      </div>
    </div>
  );
}

// Market Card Component
function MarketCard({ market, onSelect }: { market: Market; onSelect: () => void }) {
  const addToWatchlist = useMutation(api.watchlist.add);
  const removeFromWatchlist = useMutation(api.watchlist.remove);
  const isWatching = useQuery(api.watchlist.isWatching, { marketId: market.marketId });

  const probPercent = (market.probability * 100).toFixed(1);
  const imbalance = market.orderBookImbalance;
  const pressure = imbalance > 0.6 ? "bullish" : imbalance < 0.4 ? "bearish" : "neutral";
  const spreadClass = market.spreadPercent > 2 ? "toxic" : market.spreadPercent > 1 ? "warning" : "healthy";

  const formatVolume = (vol: number) => {
    if (vol >= 1000000) return `$${(vol / 1000000).toFixed(1)}M`;
    if (vol >= 1000) return `$${(vol / 1000).toFixed(0)}K`;
    return `$${vol.toFixed(0)}`;
  };

  return (
    <div className="market-card" onClick={onSelect}>
      <div className="market-header">
        <h3 className="market-question">{market.question}</h3>
        <button
          className={`watch-btn ${isWatching ? "watching" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            isWatching
              ? removeFromWatchlist({ marketId: market.marketId })
              : addToWatchlist({ marketId: market.marketId });
          }}
        >
          {isWatching ? "★" : "☆"}
        </button>
      </div>

      <div className="market-stats">
        <div className="stat probability">
          <span className="stat-label">PROB</span>
          <span className={`stat-value ${Number(probPercent) > 50 ? "bullish" : "bearish"}`}>
            {probPercent}%
          </span>
        </div>

        <div className="stat volume">
          <span className="stat-label">24H VOL</span>
          <span className="stat-value">{formatVolume(market.volume24h)}</span>
        </div>

        <div className="stat spread">
          <span className="stat-label">SPREAD</span>
          <span className={`stat-value ${spreadClass}`}>
            {market.spreadPercent.toFixed(1)}%
          </span>
        </div>

        <div className="stat pressure">
          <span className="stat-label">PRESSURE</span>
          <span className={`stat-value ${pressure}`}>
            {pressure === "bullish" ? "↑" : pressure === "bearish" ? "↓" : "→"} {(imbalance * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      <div className="market-bars">
        <div className="bar-container">
          <div className="bar-label">BID WALL</div>
          <div className="bar-bg">
            <div
              className="bar-fill bullish"
              style={{ width: `${market.bidWallStrength * 100}%` }}
            />
          </div>
        </div>
        <div className="bar-container">
          <div className="bar-label">ASK WALL</div>
          <div className="bar-bg">
            <div
              className="bar-fill bearish"
              style={{ width: `${market.askWallStrength * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Pulse View - Trade Feed
function PulseView() {
  const trades = useQuery(api.trades.listRecent, { limit: 50 });
  const markets = useQuery(api.markets.list);

  const getMarketName = (marketId: string) => {
    const market = markets?.find((m: Market) => m.marketId === marketId);
    return market?.question?.slice(0, 30) + "..." || marketId;
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString("en-US", { hour12: false });
  };

  return (
    <div className="pulse-view">
      <div className="pulse-header">
        <span className="pulse-dot" />
        <h2>LIVE PULSE</h2>
      </div>
      <div className="pulse-feed">
        {trades?.map((trade: Trade, i: number) => (
          <div
            key={trade._id}
            className={`pulse-item ${trade.side.toLowerCase()} ${trade.isWhale ? "whale" : ""}`}
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <span className="pulse-time">{formatTime(trade.timestamp)}</span>
            <span className={`pulse-side ${trade.side.toLowerCase()}`}>
              {trade.side}
            </span>
            <span className="pulse-size">
              ${trade.size.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
            <span className="pulse-price">@{(trade.price * 100).toFixed(1)}¢</span>
            <span className="pulse-market">{getMarketName(trade.marketId)}</span>
            {trade.isWhale && <span className="whale-badge">🐋 WHALE</span>}
          </div>
        ))}
        {(!trades || trades.length === 0) && (
          <div className="pulse-empty">Awaiting trades...</div>
        )}
      </div>
    </div>
  );
}

// Whale Tracker
function WhaleTracker() {
  const whaleAlerts = useQuery(api.whales.listAlerts, { limit: 20 });
  const whaleStats = useQuery(api.whales.getStats);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = (now.getTime() - ts) / 1000;
    if (diff < 60) return `${Math.floor(diff)}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return d.toLocaleTimeString("en-US", { hour12: false });
  };

  return (
    <div className="whale-tracker">
      <h2>🐋 WHALE TRACKER</h2>

      {whaleStats && (
        <div className="whale-stats">
          <div className="whale-stat">
            <span className="label">24H ALERTS</span>
            <span className="value">{whaleStats.totalAlerts}</span>
          </div>
          <div className="whale-stat">
            <span className="label">TOTAL VOL</span>
            <span className="value">${(whaleStats.totalVolume / 1000).toFixed(0)}K</span>
          </div>
          <div className="whale-stat">
            <span className="label">BUY/SELL</span>
            <span className={`value ${whaleStats.buyRatio > 0.5 ? "bullish" : "bearish"}`}>
              {(whaleStats.buyRatio * 100).toFixed(0)}% / {((1 - whaleStats.buyRatio) * 100).toFixed(0)}%
            </span>
          </div>
          <div className="whale-stat">
            <span className="label">UNIQUE</span>
            <span className="value">{whaleStats.uniqueWhales}</span>
          </div>
        </div>
      )}

      <div className="whale-alerts">
        {whaleAlerts?.map((alert: WhaleAlert) => (
          <div
            key={alert._id}
            className={`whale-alert ${alert.action.includes("BUY") ? "buy" : "sell"}`}
          >
            <div className="alert-header">
              <span className={`alert-action ${alert.action.includes("BUY") ? "buy" : "sell"}`}>
                {alert.action.replace("_", " ")}
              </span>
              <span className="alert-time">{formatTime(alert.timestamp)}</span>
            </div>
            <div className="alert-details">
              <span className="alert-address">{alert.address}</span>
              <span className="alert-size">${alert.size.toLocaleString()}</span>
            </div>
            <div className="alert-market">{alert.marketQuestion}</div>
            <div className="alert-impact">
              <span>Impact: {alert.priceImpact.toFixed(2)}%</span>
              <span>Levels: {alert.levelsSwept}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Signal Alerts
function SignalAlerts() {
  const signals = useQuery(api.signals.listUnacknowledged);
  const acknowledge = useMutation(api.signals.acknowledge);

  const getSignalIcon = (type: string) => {
    switch (type) {
      case "UPWARD_PRESSURE": return "📈";
      case "DOWNWARD_PRESSURE": return "📉";
      case "TOXIC_SPREAD": return "⚠️";
      case "HIGH_VWAP_DIVERGENCE": return "📊";
      default: return "🔔";
    }
  };

  const getSeverityClass = (severity: string) => {
    switch (severity) {
      case "high": return "high";
      case "medium": return "medium";
      default: return "low";
    }
  };

  return (
    <div className="signal-alerts">
      <h2>⚡ ACTIVE SIGNALS</h2>
      <div className="signals-list">
        {signals?.map((signal: Signal) => (
          <div
            key={signal._id}
            className={`signal-item ${getSeverityClass(signal.severity)}`}
          >
            <div className="signal-header">
              <span className="signal-icon">{getSignalIcon(signal.signalType)}</span>
              <span className="signal-type">{signal.signalType.replace(/_/g, " ")}</span>
              <span className={`signal-severity ${signal.severity}`}>{signal.severity.toUpperCase()}</span>
            </div>
            <div className="signal-message">{signal.message}</div>
            <div className="signal-market">{signal.marketQuestion}</div>
            <button
              className="signal-ack"
              onClick={() => acknowledge({ signalId: signal._id })}
            >
              DISMISS
            </button>
          </div>
        ))}
        {(!signals || signals.length === 0) && (
          <div className="signals-empty">No active signals</div>
        )}
      </div>
    </div>
  );
}

// Slippage Calculator
function SlippageCalculator({ marketId }: { marketId: string }) {
  const slippage = useQuery(api.slippage.getByMarket, { marketId });
  const calculateSlippage = useMutation(api.slippage.calculate);

  useEffect(() => {
    calculateSlippage({ marketId });
  }, [marketId]);

  if (!slippage) return <div className="slippage-loading">Calculating slippage...</div>;

  return (
    <div className="slippage-calc">
      <h3>📐 SLIPPAGE ESTIMATE</h3>
      <div className="slippage-table">
        <div className="slippage-header">
          <span>SIZE</span>
          <span>BUY</span>
          <span>SELL</span>
        </div>
        <div className="slippage-row">
          <span>$500</span>
          <span className="buy">{slippage.tradeSize500.buy.toFixed(2)}%</span>
          <span className="sell">{slippage.tradeSize500.sell.toFixed(2)}%</span>
        </div>
        <div className="slippage-row">
          <span>$1,000</span>
          <span className="buy">{slippage.tradeSize1000.buy.toFixed(2)}%</span>
          <span className="sell">{slippage.tradeSize1000.sell.toFixed(2)}%</span>
        </div>
        <div className="slippage-row">
          <span>$5,000</span>
          <span className="buy">{slippage.tradeSize5000.buy.toFixed(2)}%</span>
          <span className="sell">{slippage.tradeSize5000.sell.toFixed(2)}%</span>
        </div>
      </div>
    </div>
  );
}

// Market Detail Modal
function MarketDetail({ market, onClose }: { market: Market; onClose: () => void }) {
  const trades = useQuery(api.trades.listByMarket, { marketId: market.marketId, limit: 30 });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>

        <div className="modal-header">
          <h2>{market.question}</h2>
          <div className="modal-prob">
            <span className="prob-value">{(market.probability * 100).toFixed(1)}%</span>
            <span className="prob-label">PROBABILITY</span>
          </div>
        </div>

        <div className="modal-grid">
          <div className="modal-section">
            <h3>📊 MARKET METRICS</h3>
            <div className="metrics-grid">
              <div className="metric">
                <span className="label">VWAP</span>
                <span className="value">{(market.vwap * 100).toFixed(2)}¢</span>
              </div>
              <div className="metric">
                <span className="label">SPREAD</span>
                <span className={`value ${market.spreadPercent > 2 ? "toxic" : ""}`}>
                  {market.spreadPercent.toFixed(2)}%
                </span>
              </div>
              <div className="metric">
                <span className="label">LIQUIDITY</span>
                <span className="value">${(market.liquidity / 1000).toFixed(0)}K</span>
              </div>
              <div className="metric">
                <span className="label">OB IMBALANCE</span>
                <span className={`value ${market.orderBookImbalance > 0.6 ? "bullish" : market.orderBookImbalance < 0.4 ? "bearish" : ""}`}>
                  {(market.orderBookImbalance * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>

          <SlippageCalculator marketId={market.marketId} />

          <div className="modal-section trades-section">
            <h3>🔄 RECENT TRADES</h3>
            <div className="trades-list">
              {trades?.map((trade: Trade) => (
                <div
                  key={trade._id}
                  className={`trade-item ${trade.side.toLowerCase()} ${trade.isWhale ? "whale" : ""}`}
                >
                  <span className={`trade-side ${trade.side.toLowerCase()}`}>{trade.side}</span>
                  <span className="trade-size">${trade.size.toLocaleString()}</span>
                  <span className="trade-price">@{(trade.price * 100).toFixed(1)}¢</span>
                  {trade.isWhale && <span className="whale-tag">🐋</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Dashboard
function Dashboard() {
  const { signOut } = useAuthActions();
  const markets = useQuery(api.markets.list);
  const seedData = useMutation(api.markets.seedDemoData);
  const simulateTrade = useMutation(api.trades.simulateTrade);
  const simulateUpdate = useMutation(api.markets.simulateUpdate);
  const checkSignals = useMutation(api.signals.checkMarketSignals);

  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [activeTab, setActiveTab] = useState<"markets" | "pulse" | "whales" | "signals">("markets");

  // Seed demo data on first load
  useEffect(() => {
    seedData();
  }, []);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (markets && markets.length > 0) {
        const randomMarket = markets[Math.floor(Math.random() * markets.length)];
        simulateTrade({ marketId: randomMarket.marketId });
        simulateUpdate({ marketId: randomMarket.marketId });

        // Check for signals occasionally
        if (Math.random() < 0.3) {
          checkSignals({ marketId: randomMarket.marketId });
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [markets]);

  return (
    <div className="dashboard">
      <div className="scanlines" />

      <header className="dashboard-header">
        <div className="header-left">
          <div className="logo">◈ POLYMARKET<span className="accent">_INTEL</span></div>
          <div className="status">
            <span className="status-dot" />
            <span>LIVE</span>
          </div>
        </div>
        <nav className="header-nav">
          <button
            className={activeTab === "markets" ? "active" : ""}
            onClick={() => setActiveTab("markets")}
          >
            MARKETS
          </button>
          <button
            className={activeTab === "pulse" ? "active" : ""}
            onClick={() => setActiveTab("pulse")}
          >
            PULSE
          </button>
          <button
            className={activeTab === "whales" ? "active" : ""}
            onClick={() => setActiveTab("whales")}
          >
            WHALES
          </button>
          <button
            className={activeTab === "signals" ? "active" : ""}
            onClick={() => setActiveTab("signals")}
          >
            SIGNALS
          </button>
        </nav>
        <button className="sign-out-btn" onClick={() => signOut()}>
          SIGN OUT
        </button>
      </header>

      <main className="dashboard-main">
        {activeTab === "markets" && (
          <div className="markets-view">
            <div className="markets-grid">
              {markets?.map((market: Market) => (
                <MarketCard
                  key={market._id}
                  market={market}
                  onSelect={() => setSelectedMarket(market)}
                />
              ))}
            </div>
          </div>
        )}

        {activeTab === "pulse" && <PulseView />}
        {activeTab === "whales" && <WhaleTracker />}
        {activeTab === "signals" && <SignalAlerts />}
      </main>

      {selectedMarket && (
        <MarketDetail
          market={selectedMarket}
          onClose={() => setSelectedMarket(null)}
        />
      )}

      <footer className="dashboard-footer">
        <span>Requested by @web-user · Built by @clonkbot</span>
      </footer>
    </div>
  );
}

// Main App
export default function App() {
  const { isAuthenticated, isLoading } = useConvexAuth();

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="scanlines" />
        <div className="loader">
          <div className="loader-icon">◈</div>
          <div className="loader-text">INITIALIZING...</div>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <Dashboard /> : <AuthScreen />;
}
