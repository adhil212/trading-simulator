import db from "../config/db.js";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

const SYSTEM_PROMPT = `You are a helpful trading assistant for TradeSim, a broker-style trading simulator platform with simulated prices and virtual money.

## Account & Wallet
- Each user gets ₹10,000 free virtual balance on signup
- Wallet balance is shown on the dashboard
- Users can deposit additional funds via Razorpay payment gateway
- Withdrawals require admin approval (request → pending → approved/rejected)
- Withdrawal methods: UPI (e.g., name@upi) or Bank Transfer (account number + IFSC)

## Available Assets
4 categories: forex, crypto, commodity, index
- Forex: EUR_USD, GBP_USD
- Crypto: BTC_USD, ETH_USD
- Commodity: XAU_USD (Gold), XAG_USD (Silver)
- Index: SPX_500 (S&P 500), IXIC (Nasdaq)
Prices are simulated (not live) using a random walk model with configurable volatility and trends.

## Trading
- Market orders only (BUY / SELL) — no limit orders or stop-losses
- Max trade quantity: 1,000,000 units per order
- Commission: 0.1% on both BUY and SELL (credited to platform admin)
- Rate limit: 300 requests per 15 minutes

## Portfolio
Each position tracks: symbol, quantity, weighted-average entry price, current price, unrealized P&L
Portfolio dashboard shows: total value, open positions, cash vs assets allocation

## Performance Metrics
Available metrics: total trades, winning/losing trades, win rate (%), total realized P&L, best trade, worst trade, average win, average loss, risk/reward ratio

## Charts (TradingView)
- Timeframes: 1m, 5m, 15m, 1h
- Real-time candlestick updates via WebSocket
- Dark theme

## Real-Time Updates
- Prices update every 1 second via WebSocket
- Portfolio values update live
- All prices are simulated

## Data Export
Trade history and transaction history can be exported as CSV from the dashboard

## Your Role
- Answer questions about the platform, trading concepts, and the user's personal data
- Explain portfolio performance, trade history, and platform features
- Give detailed, thorough answers — don't be overly brief
- Use clear, beginner-friendly language
- NEVER give financial advice or tell users to buy/sell specific assets
- If asked for advice, say: "I can explain the data and trends, but I cannot provide financial advice."
- Be honest if you don't know something`;

function buildUserContext(userData) {
  const parts = [];

  if (userData.wallet) {
    parts.push(`Wallet Balance: ₹${Number(userData.wallet.balance).toLocaleString()}`);
  }

  if (userData.performance) {
    parts.push(`Performance: ${userData.performance.totalTrades} total trades, ${userData.performance.winRate} win rate, Realized P&L: ₹${Number(userData.performance.totalRealizedPnL).toLocaleString()}`);
  }

  if (userData.portfolio && userData.portfolio.length > 0) {
    const posLines = userData.portfolio.map(p =>
      `${p.symbol}: ${p.quantity} units, entry ₹${Number(p.entryPrice).toFixed(2)}, current ₹${Number(p.currentPrice).toFixed(2)}, P&L ₹${Number(p.unrealizedPnL).toFixed(2)}`
    );
    parts.push(`Current Positions:\n${posLines.join("\n")}`);
  }

  if (userData.recentTrades && userData.recentTrades.length > 0) {
    const tradeLines = userData.recentTrades.map(t =>
      `${t.type} ${t.quantity} ${t.symbol} @ ₹${Number(t.price).toFixed(2)} on ${new Date(t.executed_at).toLocaleDateString()}`
    );
    parts.push(`Recent Trades (last 20):\n${tradeLines.join("\n")}`);
  }

  return parts.join("\n\n");
}

export async function askGrok(userId, message) {
  let userContext = "";

  if (userId) {
    const [walletRes, portfolioRes, tradesRes, perfRes] = await Promise.all([
      db.query("SELECT balance FROM wallets WHERE user_id = $1", [userId]),
      db.query(
        `SELECT symbol, quantity, entry_price, current_price, unrealized_pnl
         FROM portfolio WHERE user_id = $1 ORDER BY updated_at DESC`,
        [userId]
      ),
      db.query(
        `SELECT type, quantity, symbol, price, executed_at
         FROM trades WHERE user_id = $1 ORDER BY executed_at DESC LIMIT 20`,
        [userId]
      ),
      db.query("SELECT * FROM performance_metrics WHERE user_id = $1", [userId]),
    ]);

    const userData = {};

    if (walletRes.rows.length > 0) {
      userData.wallet = { balance: walletRes.rows[0].balance };
    }

    if (portfolioRes.rows.length > 0) {
      userData.portfolio = portfolioRes.rows.map(r => ({
        symbol: r.symbol,
        quantity: parseFloat(r.quantity),
        entryPrice: parseFloat(r.entry_price),
        currentPrice: parseFloat(r.current_price),
        unrealizedPnL: parseFloat(r.unrealized_pnl),
      }));
    }

    if (tradesRes.rows.length > 0) {
      userData.recentTrades = tradesRes.rows;
    }

    if (perfRes.rows.length > 0) {
      const m = perfRes.rows[0];
      userData.performance = {
        totalTrades: m.total_trades,
        winRate: parseFloat(m.win_rate).toFixed(1) + "%",
        totalRealizedPnL: parseFloat(m.total_realized_pnl).toFixed(2),
      };
    }

    userContext = buildUserContext(userData);
  }

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROK_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `${userContext}\n\n---\n\nUser question: ${message}` },
      ],
      max_tokens: 1500,
      temperature: 0.8,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq API error: ${response.status} ${err}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}
