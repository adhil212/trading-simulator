import db from "../config/db.js";

const COMMISSION_RATE = 0;

export async function buyAsset(userId, symbol, quantity, currentPrice) {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const walletRes = await db.query(
      "SELECT id, balance FROM wallets WHERE user_id = $1",
      [userId]
    );

    if (walletRes.rows.length === 0) {
      throw new Error("Wallet not found");
    }

    const walletId = walletRes.rows[0].id;
    const currentBalance = parseFloat(walletRes.rows[0].balance);

    const totalValue = quantity * currentPrice;
    const commission = totalValue * COMMISSION_RATE;
    const netCost = totalValue + commission;

    if (netCost > currentBalance) {
      throw new Error(
        `Insufficient balance. Required: ${netCost.toFixed(2)}, Available: ${currentBalance.toFixed(2)}`
      );
    }

    await client.query(
      "UPDATE wallets SET balance = balance - $1 WHERE id = $2",
      [netCost, walletId]
    );

    const tradeRes = await client.query(
      `INSERT INTO trades (user_id, symbol, type, quantity, price, total_value, commission, net_cost, trade_reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, executed_at`,
      [userId, symbol, "BUY", quantity, currentPrice, totalValue, commission, netCost, "Market Buy"]
    );

    const tradeId = tradeRes.rows[0].id;

    const portfolioRes = await client.query(
      "SELECT id, quantity, entry_price FROM portfolio WHERE user_id = $1 AND symbol = $2",
      [userId, symbol]
    );

    if (portfolioRes.rows.length > 0) {
      const existing = portfolioRes.rows[0];
      const existingQty = parseFloat(existing.quantity);
      const existingEntryPrice = parseFloat(existing.entry_price);

      const newQuantity = existingQty + quantity;
      const newEntryPrice = (existingQty * existingEntryPrice + quantity * currentPrice) / newQuantity;

      await client.query(
        `UPDATE portfolio 
         SET quantity = $1, entry_price = $2, current_price = $3, 
             unrealized_pnl = ($1 * $3) - ($1 * $2),
             unrealized_pnl_percent = (($3 - $2) / $2 * 100),
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $4 AND symbol = $5`,
        [newQuantity, newEntryPrice, currentPrice, userId, symbol]
      );
    } else {
      await client.query(
        `INSERT INTO portfolio (user_id, symbol, quantity, entry_price, current_price, unrealized_pnl, unrealized_pnl_percent)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, symbol, quantity, currentPrice, currentPrice, 0, 0]
      );
    }

    await client.query("COMMIT");

    return {
      success: true,
      tradeId,
      symbol,
      type: "BUY",
      quantity,
      price: currentPrice,
      totalValue: totalValue.toFixed(2),
      commission: commission.toFixed(2),
      netCost: netCost.toFixed(2),
      remainingBalance: (currentBalance - netCost).toFixed(2),
      timestamp: new Date()
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function sellAsset(userId, symbol, quantity, currentPrice) {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const portfolioRes = await client.query(
      "SELECT id, quantity, entry_price FROM portfolio WHERE user_id = $1 AND symbol = $2",
      [userId, symbol]
    );

    if (portfolioRes.rows.length === 0) {
      throw new Error(`No position in ${symbol} to sell`);
    }

    const position = portfolioRes.rows[0];
    const availableQty = parseFloat(position.quantity);
    const entryPrice = parseFloat(position.entry_price);

    if (quantity > availableQty) {
      throw new Error(
        `Insufficient quantity. Trying to sell: ${quantity}, Available: ${availableQty}`
      );
    }

    const totalValue = quantity * currentPrice;
    const commission = totalValue * COMMISSION_RATE;
    const netProceeds = totalValue - commission;

    const profitPerUnit = currentPrice - entryPrice;
    const totalProfit = profitPerUnit * quantity;
    const profitPercent = (profitPerUnit / entryPrice) * 100;

    const walletRes = await client.query(
      "SELECT id FROM wallets WHERE user_id = $1",
      [userId]
    );

    const walletId = walletRes.rows[0].id;

    await client.query(
      "UPDATE wallets SET balance = balance + $1 WHERE id = $2",
      [netProceeds, walletId]
    );

    const tradeRes = await client.query(
      `INSERT INTO trades (user_id, symbol, type, quantity, price, total_value, commission, net_cost, trade_reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [userId, symbol, "SELL", quantity, currentPrice, totalValue, commission, netProceeds, "Market Sell"]
    );

    const tradeId = tradeRes.rows[0].id;

    await client.query(
      `INSERT INTO trade_history (user_id, symbol, entry_price, exit_price, quantity, realized_pnl, realized_pnl_percent, entry_date, exit_date)
       SELECT $1, $2, $3, $4, $5, $6, $7, 
              (SELECT executed_at FROM trades WHERE id = $8 ORDER BY executed_at ASC LIMIT 1),
              CURRENT_TIMESTAMP`,
      [userId, symbol, entryPrice, currentPrice, quantity, totalProfit, profitPercent, tradeId]
    );

    const newQuantity = availableQty - quantity;

    if (newQuantity === 0) {
      await client.query(
        "DELETE FROM portfolio WHERE user_id = $1 AND symbol = $2",
        [userId, symbol]
      );
    } else {
      await client.query(
        `UPDATE portfolio 
         SET quantity = $1, current_price = $2,
             unrealized_pnl = ($1 * $2) - ($1 * entry_price),
             unrealized_pnl_percent = (($2 - entry_price) / entry_price * 100),
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $3 AND symbol = $4`,
        [newQuantity, currentPrice, userId, symbol]
      );
    }

    await updatePerformanceMetrics(client, userId);

    await client.query("COMMIT");

    return {
      success: true,
      tradeId,
      symbol,
      type: "SELL",
      quantity,
      entryPrice: entryPrice.toFixed(2),
      exitPrice: currentPrice,
      totalValue: totalValue.toFixed(2),
      commission: commission.toFixed(2),
      netProceeds: netProceeds.toFixed(2),
      realizedPnL: totalProfit.toFixed(2),
      realizedPnLPercent: profitPercent.toFixed(2) + "%",
      remainingQuantity: newQuantity.toFixed(8),
      timestamp: new Date()
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getPortfolio(userId) {
  try {
    const result = await db.query(
      `SELECT 
         symbol, quantity, entry_price, current_price,
         unrealized_pnl, unrealized_pnl_percent,
         (quantity * current_price) as position_value,
         updated_at
       FROM portfolio 
       WHERE user_id = $1 
       ORDER BY updated_at DESC`,
      [userId]
    );

    const positions = result.rows.map(row => ({
      ...row,
      quantity: parseFloat(row.quantity),
      entryPrice: parseFloat(row.entry_price),
      currentPrice: parseFloat(row.current_price),
      unrealizedPnL: parseFloat(row.unrealized_pnl),
      unrealizedPnLPercent: parseFloat(row.unrealized_pnl_percent),
      positionValue: parseFloat(row.position_value)
    }));

    const totalValue = positions.reduce((sum, pos) => sum + pos.positionValue, 0);
    const totalPnL = positions.reduce((sum, pos) => sum + (pos.unrealizedPnL || 0), 0);

    return {
      positions,
      summary: {
        totalPositions: positions.length,
        totalValue: totalValue.toFixed(2),
        totalUnrealizedPnL: totalPnL.toFixed(2),
        lastUpdated: new Date()
      }
    };
  } catch (error) {
    console.error('Error fetching portfolio:', error);
    throw error;
  }
}

export async function getTradeHistory(userId, limit = 50, offset = 0) {
  try {
    const countRes = await db.query(
      "SELECT COUNT(*) as total FROM trades WHERE user_id = $1",
      [userId]
    );

    const result = await db.query(
      `SELECT id, symbol, type, quantity, price, total_value, commission, net_cost, executed_at
       FROM trades 
       WHERE user_id = $1 
       ORDER BY executed_at DESC 
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return {
      trades: result.rows,
      total: parseInt(countRes.rows[0].total),
      limit,
      offset
    };
  } catch (error) {
    console.error('Error fetching trade history:', error);
    throw error;
  }
}

export async function getClosedTrades(userId, limit = 50, offset = 0) {
  try {
    const countRes = await db.query(
      "SELECT COUNT(*) as total FROM trade_history WHERE user_id = $1",
      [userId]
    );

    const result = await db.query(
      `SELECT id, symbol, entry_price, exit_price, quantity, 
              realized_pnl, realized_pnl_percent, entry_date, exit_date
       FROM trade_history 
       WHERE user_id = $1 
       ORDER BY exit_date DESC 
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return {
      closedTrades: result.rows,
      total: parseInt(countRes.rows[0].total),
      limit,
      offset
    };
  } catch (error) {
    console.error('Error fetching closed trades:', error);
    throw error;
  }
}

export async function getPerformanceMetrics(userId) {
  try {
    const result = await db.query(
      "SELECT * FROM performance_metrics WHERE user_id = $1",
      [userId]
    );

    if (result.rows.length === 0) {
      return {
        message: "No trading data yet",
        totalTrades: 0
      };
    }

    const metrics = result.rows[0];
    return {
      totalTrades: metrics.total_trades,
      winningTrades: metrics.winning_trades,
      losingTrades: metrics.losing_trades,
      winRate: parseFloat(metrics.win_rate).toFixed(2) + '%',
      totalRealizedPnL: parseFloat(metrics.total_realized_pnl).toFixed(2),
      bestTrade: metrics.best_trade ? parseFloat(metrics.best_trade).toFixed(2) : 'N/A',
      worstTrade: metrics.worst_trade ? parseFloat(metrics.worst_trade).toFixed(2) : 'N/A',
      averageWin: metrics.avg_win ? parseFloat(metrics.avg_win).toFixed(2) : 'N/A',
      averageLoss: metrics.avg_loss ? parseFloat(metrics.avg_loss).toFixed(2) : 'N/A',
      riskRewardRatio: metrics.risk_reward_ratio ? parseFloat(metrics.risk_reward_ratio).toFixed(2) : 'N/A',
      updatedAt: metrics.updated_at
    };
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    throw error;
  }
}

async function updatePerformanceMetrics(client, userId) {
  try {
    await client.query(
      "SELECT calculate_performance_metrics($1)",
      [userId]
    );
  } catch (error) {
    console.error('Error updating performance metrics:', error);
  }
}

export async function getTradeStatistics(userId) {
  try {
    const result = await db.query(
      `SELECT 
         COUNT(CASE WHEN type = 'BUY' THEN 1 END) as total_buys,
         COUNT(CASE WHEN type = 'SELL' THEN 1 END) as total_sells,
         COUNT(*) as total_trades,
         SUM(CASE WHEN type = 'BUY' THEN total_value ELSE 0 END) as total_bought,
         SUM(CASE WHEN type = 'SELL' THEN total_value ELSE 0 END) as total_sold,
         SUM(commission) as total_commissions
       FROM trades 
       WHERE user_id = $1 AND executed_at > NOW() - INTERVAL '7 days'`,
      [userId]
    );

    const stats = result.rows[0];

    return {
      period: "Last 7 days",
      totalBuys: parseInt(stats.total_buys),
      totalSells: parseInt(stats.total_sells),
      totalTrades: parseInt(stats.total_trades),
      totalBought: parseFloat(stats.total_bought || 0).toFixed(2),
      totalSold: parseFloat(stats.total_sold || 0).toFixed(2),
      totalCommissions: parseFloat(stats.total_commissions || 0).toFixed(2),
      averageTradeSize: stats.total_trades > 0 
        ? (((parseFloat(stats.total_bought || 0) + parseFloat(stats.total_sold || 0)) / (parseInt(stats.total_trades) * 2))).toFixed(2)
        : '0.00'
    };
  } catch (error) {
    console.error('Error fetching trade statistics:', error);
    throw error;
  }
}

