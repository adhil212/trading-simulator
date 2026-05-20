Trading API — /api/trading
1. POST /api/trading/buy
Auth: ✅ JWT  
Body: { "symbol": "EUR_USD", "quantity": 100 }
{
  "success": true,
  "tradeId": 1,
  "symbol": "EUR_USD",
  "type": "BUY",
  "quantity": 100,
  "price": 1.0850,
  "totalValue": "108.50",
  "commission": "0.11",
  "netCost": "108.61",
  "remainingBalance": "9891.39",
  "timestamp": "2026-05-11T..."
}
2. POST /api/trading/sell
Auth: ✅ JWT  
Body: { "symbol": "EUR_USD", "quantity": 100 }
{
  "success": true,
  "tradeId": 2,
  "symbol": "EUR_USD",
  "type": "SELL",
  "quantity": 100,
  "entryPrice": "1.0850",
  "exitPrice": 1.0870,
  "totalValue": "108.70",
  "commission": "0.11",
  "netProceeds": "108.59",
  "realizedPnL": "0.20",
  "realizedPnLPercent": "0.18%",
  "remainingQuantity": "0.00000000",
  "timestamp": "2026-05-11T..."
}
3. GET /api/trading/portfolio
Auth: ✅ JWT
{
  "positions": [
    {
      "symbol": "EUR_USD",
      "quantity": 100,
      "entryPrice": 1.0850,
      "currentPrice": 1.0870,
      "unrealizedPnL": 0.20,
      "unrealizedPnLPercent": 0.18,
      "positionValue": 108.70
    }
  ],
  "summary": {
    "totalPositions": 1,
    "totalValue": "108.70",
    "totalUnrealizedPnL": "0.20",
    "lastUpdated": "2026-05-11T..."
  }
}
4. GET /api/trading/history
Auth: ✅ JWT  
Query: ?limit=50&offset=0
{
  "trades": [
    {
      "id": 1,
      "symbol": "EUR_USD",
      "type": "BUY",
      "quantity": "100",
      "price": "1.0850",
      "total_value": "108.50",
      "commission": "0.11",
      "net_cost": "108.61",
      "executed_at": "2026-05-11T..."
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
5. GET /api/trading/closed
Auth: ✅ JWT  
Query: ?limit=50&offset=0
{
  "closedTrades": [
    {
      "id": 1,
      "symbol": "EUR_USD",
      "entry_price": "1.0850",
      "exit_price": "1.0870",
      "quantity": "100",
      "realized_pnl": "0.20",
      "realized_pnl_percent": "0.18",
      "entry_date": "2026-05-11T...",
      "exit_date": "2026-05-11T..."
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
6. GET /api/trading/performance
Auth: ✅ JWT
{
  "totalTrades": 3,
  "winningTrades": 2,
  "losingTrades": 1,
  "winRate": "66.67%",
  "totalRealizedPnL": "15.20",
  "bestTrade": "12.50",
  "worstTrade": "-3.20",
  "averageWin": "8.10",
  "averageLoss": "-3.20",
  "riskRewardRatio": "2.53",
  "updatedAt": "2026-05-11T..."
}
If no trades:
{ "message": "No trading data yet", "totalTrades": 0 }
7. GET /api/trading/statistics
Auth: ✅ JWT
{
  "period": "Last 7 days",
  "totalBuys": 2,
  "totalSells": 1,
  "totalTrades": 3,
  "totalBought": "217.00",
  "totalSold": "108.70",
  "totalCommissions": "0.33",
  "averageTradeSize": "54.25"
}
---
Portfolio API — /api/portfolio
8. GET /api/portfolio/dashboard
Auth: ✅ JWT
{
  "portfolio": { "positions": [...], "summary": {...} },
  "wallet": { "balance": 9891.39, "updatedAt": "..." },
  "performance": { "totalBuys": 2, ... },
  "allocation": { "bySymbol": [...], "byType": {...}, "diversificationScore": 50 },
  "dailyStats": [{ "date": "2026-05-11", "tradeCount": 1, ... }],
  "timestamp": "2026-05-11T..."
}
9. GET /api/portfolio/positions
Auth: ✅ JWT  
Same as /api/trading/portfolio but with live prices from PriceEngine + breakdown by type.
10. GET /api/portfolio/performance
Auth: ✅ JWT
{
  "totalBuys": 2,
  "totalSells": 1,
  "totalInvested": "217.00",
  "totalWithdrawn": "108.70",
  "totalClosedTrades": 1,
  "winningTrades": 1,
  "losingTrades": 0,
  "totalRealizedPnL": "0.20",
  "averagePnL": "0.20",
  "winRate": "100.00%"
}
11. GET /api/portfolio/allocation
Auth: ✅ JWT
{
  "bySymbol": [
    { "symbol": "EUR_USD", "value": 108.70, "percentage": "100.00", "quantity": 100 }
  ],
  "byType": {
    "forex": [{ "symbol": "EUR_USD", ... }],
    "commodity": [],
    "crypto": [],
    "index": []
  },
  "diversificationScore": 20
}
12. GET /api/portfolio/daily-stats
Auth: ✅ JWT
[
  {
    "date": "2026-05-11",
    "tradeCount": 3,
    "buyVolume": "217.00",
    "sellVolume": "108.70",
    "commissions": "0.33"
  }
]
13. GET /api/portfolio/growth
Auth: ✅ JWT  
Query: ?days=7
{
  "growthData": [
    { "date": "2026-05-10", "balance": 10000 },
    { "date": "2026-05-11", "balance": 9891.39 }
  ],
  "currentBalance": "9891.39",
  "period": "7 days"
}
14. GET /api/portfolio/top
Auth: ✅ JWT  
Query: ?limit=5
[
  { "symbol": "BTC_USD", "performancePercent": "5.20" },
  { "symbol": "EUR_USD", "performancePercent": "0.18" }
]
15. GET /api/portfolio/worst
Auth: ✅ JWT  
Query: ?limit=5
[
  { "symbol": "OIL_USD", "performancePercent": "-2.10" }
]
16. GET /api/portfolio/summary
Auth: ✅ JWT
{
  "cashBalance": "9891.39",
  "assetValue": "108.70",
  "totalPortfolioValue": "10000.09",
  "unrealizedPnL": "0.20",
  "unrealizedPnLPercent": "0.18",
  "numPositions": 1,
  "totalTrades": 3,
  "realizedPnL": "0.20",
  "winRate": "100.00%",
  "allocation": {
    "cash": "98.91%",
    "assets": "1.09%"
  }
}
---
Auth API — /api/auth
17. POST /api/auth/register
Auth: ❌ Public  
Body: { "username": "...", "email": "...", "password": "..." }
{
  "success": true,
  "message": "User registered successfully",
  "userId": 1
}
18. POST /api/auth/login
Auth: ❌ Public  
Body: { "email": "...", "password": "..." }
{
  "success": true,
  "token": "jwt...",
  "user": {
    "id": 1,
    "username": "...",
    "email": "..."
  }
}

---
Wallet API — /api/wallet
19. GET /api/wallet/
Auth: ✅ JWT
{
  "id": 1,
  "user_id": 1,
  "balance": "9891.39",
  "updated_at": "2026-05-11T..."
}

---
Market API — /api/market
20. GET /api/market/prices
Auth: ❌ Public
{
  "success": true,
  "data": {
    "EUR_USD": 1.0850,
    "BTC_USD": 42350.00
  },
  "timestamp": "2026-05-11T..."
}
21. GET /api/market/prices/:symbol
Auth: ❌ Public
{
  "success": true,
  "data": { "symbol": "EUR_USD", "price": 1.0850 }
}
22. GET /api/market/assets
Auth: ❌ Public
{
  "success": true,
  "data": [
    { "symbol": "EUR_USD", "type": "forex" }
  ]
}
23. GET /api/market/assets/:symbol
Auth: ❌ Public
{
  "success": true,
  "data": { "symbol": "EUR_USD", "type": "forex", "description": "..." }
}
24. GET /api/market/history/:symbol
Auth: ❌ Public  
Query: ?limit=100
{
  "success": true,
  "data": [
    { "timestamp": "...", "price": 1.0840 }
  ],
  "count": 100
}
25. GET /api/market/health
Auth: ❌ Public
{
  "success": true,
  "status": {
    "active": true,
    "assetsTracked": 10
  },
  "timestamp": "2026-05-11T..."
}

---
#	Endpoint	Method	Auth
1	/api/trading/buy	POST	✅
2	/api/trading/sell	POST	✅
3	/api/trading/portfolio	GET	✅
4	/api/trading/history	GET	✅
5	/api/trading/closed	GET	✅
6	/api/trading/performance	GET	✅
7	/api/trading/statistics	GET	✅
8	/api/portfolio/dashboard	GET	✅
9	/api/portfolio/positions	GET	✅
10	/api/portfolio/performance	GET	✅
11	/api/portfolio/allocation	GET	✅
12	/api/portfolio/daily-stats	GET	✅
13	/api/portfolio/growth	GET	✅
14	/api/portfolio/top	GET	✅
15	/api/portfolio/worst	GET	✅
16	/api/portfolio/summary	GET	✅
17	/api/auth/register	POST	❌
18	/api/auth/login	POST	❌
19	/api/wallet/	GET	✅
20	/api/market/prices	GET	❌
21	/api/market/prices/:symbol	GET	❌
22	/api/market/assets	GET	❌
23	/api/market/assets/:symbol	GET	❌
24	/api/market/history/:symbol	GET	❌
25	/api/market/health	GET	❌

all queries that i use in postgress 
CREATE TABLE IF NOT EXISTS portfolio (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  quantity DECIMAL(15, 8) NOT NULL,
  entry_price DECIMAL(15, 2) NOT NULL,
  current_price DECIMAL(15, 2) NOT NULL,
  unrealized_pnl DECIMAL(15, 2),
  unrealized_pnl_percent DECIMAL(8, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, symbol)
);
CREATE TABLE IF NOT EXISTS trades (
id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('BUY', 'SELL')),
  quantity DECIMAL(15, 8) NOT NULL,
  price DECIMAL(15, 2) NOT NULL,
  total_value DECIMAL(15, 2) NOT NULL,
  commission DECIMAL(10, 2) DEFAULT 0,
  net_cost DECIMAL(15, 2) NOT NULL,
  trade_reason VARCHAR(100),
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS portfolio (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  quantity DECIMAL(15, 8) NOT NULL,
  entry_price DECIMAL(15, 2) NOT NULL,
  current_price DECIMAL(15, 2) NOT NULL,
  unrealized_pnl DECIMAL(15, 2),
  unrealized_pnl_percent DECIMAL(8, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, symbol)
);
CREATE INDEX IF NOT EXISTS idx_portfolio_user ON portfolio(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_user ON trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_user_date ON trades(user_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_trade_history_user ON trade_history(user_id);

CREATE TABLE IF NOT EXISTS performance_metrics (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  total_trades INT DEFAULT 0,
  winning_trades INT DEFAULT 0,
  losing_trades INT DEFAULT 0,
  win_rate DECIMAL(5, 2) DEFAULT 0,
  total_realized_pnl DECIMAL(15, 2) DEFAULT 0,
  best_trade DECIMAL(15, 2),
  worst_trade DECIMAL(15, 2),
  avg_win DECIMAL(15, 2),
  avg_loss DECIMAL(15, 2),
  risk_reward_ratio DECIMAL(5, 2),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =============================================
-- FUNCTION: calculate_performance_metrics
-- Called by TradingService.updatePerformanceMetrics()
-- =============================================
CREATE OR REPLACE FUNCTION calculate_performance_metrics(p_user_id INT)
RETURNS void AS $$
DECLARE
  v_total_trades INT;
  v_winning_trades INT;
  v_losing_trades INT;
BEGIN
  SELECT COUNT(*) INTO v_total_trades FROM trade_history WHERE user_id = p_user_id;
  SELECT COUNT(*) INTO v_winning_trades FROM trade_history 
    WHERE user_id = p_user_id AND realized_pnl > 0;
  SELECT COUNT(*) INTO v_losing_trades FROM trade_history 
    WHERE user_id = p_user_id AND realized_pnl < 0;
  INSERT INTO performance_metrics (
    user_id, total_trades, winning_trades, losing_trades,
    win_rate, total_realized_pnl, best_trade, worst_trade, avg_win, avg_loss
  )
  SELECT
    p_user_id,
    v_total_trades,
    v_winning_trades,
    v_losing_trades,
    CASE WHEN v_total_trades = 0 THEN 0 ELSE (v_winning_trades::DECIMAL / v_total_trades * 100) END,
    COALESCE(SUM(realized_pnl), 0),
    MAX(CASE WHEN realized_pnl > 0 THEN realized_pnl END),
    MIN(CASE WHEN realized_pnl < 0 THEN realized_pnl END),
    AVG(CASE WHEN realized_pnl > 0 THEN realized_pnl END),
    AVG(CASE WHEN realized_pnl < 0 THEN realized_pnl END)
  FROM trade_history
  WHERE user_id = p_user_id
  ON CONFLICT (user_id) DO UPDATE SET
    total_trades = EXCLUDED.total_trades,
    winning_trades = EXCLUDED.winning_trades,
    losing_trades = EXCLUDED.losing_trades,
    win_rate = EXCLUDED.win_rate,
    total_realized_pnl = EXCLUDED.total_realized_pnl,
    best_trade = EXCLUDED.best_trade,
    worst_trade = EXCLUDED.worst_trade,
    avg_win = EXCLUDED.avg_win,
    avg_loss = EXCLUDED.avg_loss,
    updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;