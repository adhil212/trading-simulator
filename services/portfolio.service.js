import db from "../config/db.js";

export async function getPortfolioDashboard(priceEngine, userId) {
  try {
    const portfolio = await getPortfolioWithPrices(priceEngine, userId);
    const wallet = await getUserWallet(userId);
    const performance = await getPortfolioPerformance(userId);
    const allocation = await getPortfolioAllocation(priceEngine, userId);
    const dailyStats = await getDailyStats(userId);

    return {
      portfolio,
      wallet,
      performance,
      allocation,
      dailyStats,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Error fetching portfolio dashboard:', error);
    throw error;
  }
}

export async function getPortfolioWithPrices(priceEngine, userId) {
  try {
    const result = await db.query(
      `SELECT 
         id, symbol, quantity, entry_price, current_price,
         unrealized_pnl, unrealized_pnl_percent
       FROM portfolio 
       WHERE user_id = $1 AND quantity > 0
       ORDER BY (quantity * current_price) DESC`,
      [userId]
    );

    const prices = priceEngine.getAllPrices();
    const positions = result.rows.map(row => {
      const currentPrice = prices[row.symbol]?.last || parseFloat(row.current_price);
      const qty = parseFloat(row.quantity);
      const entryPrice = parseFloat(row.entry_price);
      const unrealizedPnL = (currentPrice - entryPrice) * qty;
      const unrealizedPnLPercent = ((currentPrice - entryPrice) / entryPrice) * 100;

      return {
        id: row.id,
        symbol: row.symbol,
        quantity: qty,
        entryPrice: entryPrice,
        currentPrice: currentPrice,
        positionValue: (qty * currentPrice),
        unrealizedPnL,
        unrealizedPnLPercent,
      };
    });

    const totalValue = positions.reduce((sum, pos) => sum + pos.positionValue, 0);
    const totalUnrealizedPnL = positions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0);
    const totalUnrealizedPercent = totalValue > 0 ? (totalUnrealizedPnL / (totalValue - totalUnrealizedPnL)) * 100 : 0;

    return {
      positions,
      summary: {
        totalPositions: positions.length,
        totalValue: totalValue.toFixed(2),
        totalUnrealizedPnL: totalUnrealizedPnL.toFixed(2),
        totalUnrealizedPercent: totalUnrealizedPercent.toFixed(2),
        largestPosition: positions.length > 0 ? positions[0].symbol : null,
        largestPositionValue: positions.length > 0 ? positions[0].positionValue.toFixed(2) : '0.00'
      }
    };
  } catch (error) {
    console.error('Error getting portfolio with prices:', error);
    throw error;
  }
}

export async function getUserWallet(userId) {
  try {
    const result = await db.query(
      "SELECT id, balance FROM wallets WHERE user_id = $1",
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error("Wallet not found");
    }

    const wallet = result.rows[0];
    return {
      balance: parseFloat(wallet.balance)
    };
  } catch (error) {
    console.error('Error getting wallet:', error);
    throw error;
  }
}

export async function getPortfolioPerformance(userId) {
  try {
    const result = await db.query(
      `SELECT 
         COUNT(CASE WHEN type = 'BUY' THEN 1 END) as total_buys,
         COUNT(CASE WHEN type = 'SELL' THEN 1 END) as total_sells,
         SUM(CASE WHEN type = 'BUY' THEN total_value ELSE 0 END) as total_invested,
         SUM(CASE WHEN type = 'SELL' THEN total_value ELSE 0 END) as total_withdrawn
       FROM trades 
       WHERE user_id = $1`,
      [userId]
    );

    const trades = result.rows[0];
    const totalInvested = parseFloat(trades.total_invested || 0);
    const totalWithdrawn = parseFloat(trades.total_withdrawn || 0);

    const pnlResult = await db.query(
      `SELECT 
         COUNT(*) as total_closed_trades,
         SUM(CASE WHEN realized_pnl > 0 THEN 1 ELSE 0 END) as winning_trades,
         SUM(CASE WHEN realized_pnl < 0 THEN 1 ELSE 0 END) as losing_trades,
         SUM(realized_pnl) as total_realized_pnl,
         AVG(realized_pnl) as avg_pnl
       FROM trade_history 
       WHERE user_id = $1`,
      [userId]
    );

    const pnlData = pnlResult.rows[0];

    return {
      totalBuys: parseInt(trades.total_buys, 10),
      totalSells: parseInt(trades.total_sells, 10),
      totalInvested: totalInvested.toFixed(2),
      totalWithdrawn: totalWithdrawn.toFixed(2),
      totalClosedTrades: parseInt(pnlData.total_closed_trades, 10),
      winningTrades: parseInt(pnlData.winning_trades, 10),
      losingTrades: parseInt(pnlData.losing_trades, 10),
      totalRealizedPnL: parseFloat(pnlData.total_realized_pnl || 0).toFixed(2),
      averagePnL: parseFloat(pnlData.avg_pnl || 0).toFixed(2),
      winRate: pnlData.total_closed_trades > 0 
        ? ((pnlData.winning_trades / pnlData.total_closed_trades) * 100).toFixed(2) + '%'
        : 'N/A'
    };
  } catch (error) {
    console.error('Error getting portfolio performance:', error);
    throw error;
  }
}

export async function getPortfolioAllocation(priceEngine, userId) {
  try {
    const result = await db.query(
      `SELECT 
         p.symbol,
         p.quantity,
         (p.quantity * p.current_price) as value
       FROM portfolio p
       WHERE p.user_id = $1 AND p.quantity > 0
       ORDER BY value DESC`,
      [userId]
    );

    const positions = result.rows;
    const totalValue = positions.reduce((sum, pos) => sum + parseFloat(pos.value), 0);

    const allocation = positions.map(pos => ({
      symbol: pos.symbol,
      value: parseFloat(pos.value),
      percentage: totalValue > 0 ? ((parseFloat(pos.value) / totalValue) * 100).toFixed(2) : '0.00',
      quantity: parseFloat(pos.quantity)
    }));

    const byType = {
      forex: [],
      commodity: [],
      crypto: [],
      index: []
    };

    allocation.forEach(alloc => {
      const asset = priceEngine.getAssetInfo(alloc.symbol);
      if (asset && asset.type) {
        byType[asset.type].push(alloc);
      }
    });

    return {
      bySymbol: allocation,
      byType: byType,
      diversificationScore: calculateDiversificationScore(allocation)
    };
  } catch (error) {
    console.error('Error getting portfolio allocation:', error);
    throw error;
  }
}

export async function getDailyStats(userId) {
  try {
    const result = await db.query(
      `SELECT 
         DATE(executed_at) as trade_date,
         COUNT(*) as trade_count,
         SUM(CASE WHEN type = 'BUY' THEN total_value ELSE 0 END) as buy_volume,
         SUM(CASE WHEN type = 'SELL' THEN total_value ELSE 0 END) as sell_volume,
         SUM(commission) as commissions
       FROM trades 
       WHERE user_id = $1 AND executed_at > NOW() - INTERVAL '7 days'
       GROUP BY DATE(executed_at)
       ORDER BY trade_date DESC`,
      [userId]
    );

    return result.rows.map(row => ({
      date: row.trade_date,
      tradeCount: parseInt(row.trade_count, 10),
      buyVolume: parseFloat(row.buy_volume || 0).toFixed(2),
      sellVolume: parseFloat(row.sell_volume || 0).toFixed(2),
      commissions: parseFloat(row.commissions || 0).toFixed(2)
    }));
  } catch (error) {
    console.error('Error getting daily stats:', error);
    throw error;
  }
}

function calculateDiversificationScore(allocation) {
  if (allocation.length === 0) return 0;
  if (allocation.length === 1) return 20;
  if (allocation.length >= 5) {
    const percentages = allocation.map(a => parseFloat(a.percentage));
    const avgPercent = 100 / allocation.length;
    const variance = percentages.reduce((sum, p) => sum + Math.abs(p - avgPercent), 0) / allocation.length;
    const balanceScore = Math.max(0, 100 - (variance * 2));
    return Math.round(balanceScore);
  }

  const percentages = allocation.map(a => parseFloat(a.percentage));
  const avgPercent = 100 / allocation.length;
  const variance = percentages.reduce((sum, p) => sum + Math.abs(p - avgPercent), 0) / allocation.length;
  const balanceScore = Math.max(0, 100 - (variance * 3));
  
  return Math.round((allocation.length / 5 * 100 * 0.5) + (balanceScore * 0.5));
}

export async function getPortfolioGrowth(userId, days = 7) {
  try {
    const wallet = await getUserWallet(userId);
    const currentBalance = wallet.balance;

    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - days);

    const tradesInPeriod = await db.query(
      `SELECT 
         executed_at::date as trade_date,
         SUM(CASE WHEN type = 'BUY' THEN net_cost ELSE 0 END) as total_spent,
         SUM(CASE WHEN type = 'SELL' THEN total_value - commission ELSE 0 END) as total_received
       FROM trades
       WHERE user_id = $1 AND executed_at > $2
       GROUP BY executed_at::date
       ORDER BY trade_date ASC`,
      [userId, periodStart]
    );

    const tradesBefore = await db.query(
      `SELECT 
         COALESCE(SUM(CASE WHEN type = 'BUY' THEN net_cost ELSE 0 END), 0) as spent_before,
         COALESCE(SUM(CASE WHEN type = 'SELL' THEN total_value - commission ELSE 0 END), 0) as received_before
       FROM trades
       WHERE user_id = $1 AND executed_at <= $2`,
      [userId, periodStart]
    );

    const before = tradesBefore.rows[0];
    const initialDeposit = 10000;
    const balanceAtStart = initialDeposit - parseFloat(before.spent_before) + parseFloat(before.received_before);

    const growthData = [];
    let runningBalance = balanceAtStart;

    for (const row of tradesInPeriod.rows) {
      runningBalance = runningBalance - parseFloat(row.total_spent || 0) + parseFloat(row.total_received || 0);
      growthData.push({
        date: row.trade_date,
        balance: Math.round(runningBalance * 100) / 100
      });
    }

    growthData.push({
      date: new Date().toISOString().split('T')[0],
      balance: currentBalance
    });

    return {
      growthData,
      currentBalance: currentBalance.toFixed(2),
      period: `${days} days`
    };
  } catch (error) {
    console.error('Error getting portfolio growth:', error);
    throw error;
  }
}

export async function getTopPerformingAssets(userId, limit = 5) {
  try {
    const result = await db.query(
      `SELECT symbol, unrealized_pnl_percent 
       FROM portfolio 
       WHERE user_id = $1 AND quantity > 0
       ORDER BY unrealized_pnl_percent DESC 
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows.map(row => ({
      symbol: row.symbol,
      performancePercent: parseFloat(row.unrealized_pnl_percent).toFixed(2)
    }));
  } catch (error) {
    console.error('Error getting top performing assets:', error);
    throw error;
  }
}

export async function getWorstPerformingAssets(userId, limit = 5) {
  try {
    const result = await db.query(
      `SELECT symbol, unrealized_pnl_percent 
       FROM portfolio 
       WHERE user_id = $1 AND quantity > 0
       ORDER BY unrealized_pnl_percent ASC 
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows.map(row => ({
      symbol: row.symbol,
      performancePercent: parseFloat(row.unrealized_pnl_percent).toFixed(2)
    }));
  } catch (error) {
    console.error('Error getting worst performing assets:', error);
    throw error;
  }
}

export async function getPortfolioSummary(priceEngine, userId) {
  try {
    const portfolio = await getPortfolioWithPrices(priceEngine, userId);
    const wallet = await getUserWallet(userId);
    const performance = await getPortfolioPerformance(userId);

    const totalAssetValue = parseFloat(portfolio.summary.totalValue);
    const totalPortfolioValue = totalAssetValue + wallet.balance;

    return {
      cashBalance: wallet.balance.toFixed(2),
      assetValue: totalAssetValue.toFixed(2),
      totalPortfolioValue: totalPortfolioValue.toFixed(2),
      unrealizedPnL: portfolio.summary.totalUnrealizedPnL,
      unrealizedPnLPercent: portfolio.summary.totalUnrealizedPercent,
      numPositions: portfolio.summary.totalPositions,
      totalTrades: performance.totalBuys + performance.totalSells,
      realizedPnL: performance.totalRealizedPnL,
      winRate: performance.winRate,
      allocation: {
        cash: ((wallet.balance / totalPortfolioValue) * 100).toFixed(2) + '%',
        assets: ((totalAssetValue / totalPortfolioValue) * 100).toFixed(2) + '%'
      }
    };
  } catch (error) {
    console.error('Error getting portfolio summary:', error);
    throw error;
  }
}
