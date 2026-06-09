import db from "../config/db.js";

export async function getUsers(search, limit, offset) {
  let whereClause = "";
  const params = [];
  let paramIndex = 1;

  if (search) {
    whereClause = `WHERE (u.username ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  const countRes = await db.query(
    `SELECT COUNT(*) as total FROM users u ${whereClause}`,
    params
  );

  const result = await db.query(
    `SELECT u.id, u.username, u.email, u.is_admin, u.created_at,
            COALESCE(w.balance, 0) as balance,
            (SELECT COUNT(*) FROM trades t WHERE t.user_id = u.id) as trades_count
     FROM users u
     LEFT JOIN wallets w ON w.user_id = u.id
     ${whereClause}
     ORDER BY u.created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, limit, offset]
  );

  return {
    users: result.rows,
    total: parseInt(countRes.rows[0].total, 10),
    limit,
    offset,
  };
}

export async function getUserById(userId) {
  const userRes = await db.query(
    `SELECT u.id, u.username, u.email, u.is_admin, u.created_at,
            COALESCE(w.balance, 0) as balance
     FROM users u
     LEFT JOIN wallets w ON w.user_id = u.id
     WHERE u.id = $1`,
    [userId]
  );

  if (userRes.rows.length === 0) return null;
  return userRes.rows[0];
}


export async function getAllTrades(filters, limit, offset) {
  const conditions = [];
  const params = [];
  let paramIndex = 1;

  if (filters.user_id) {
    conditions.push(`t.user_id = $${paramIndex++}`);
    params.push(filters.user_id);
  }
  if (filters.symbol) {
    conditions.push(`t.symbol = $${paramIndex++}`);
    params.push(filters.symbol);
  }
  if (filters.type) {
    conditions.push(`t.type = $${paramIndex++}`);
    params.push(filters.type);
  }
  if (filters.date_from) {
    conditions.push(`t.executed_at >= $${paramIndex++}`);
    params.push(filters.date_from);
  }
  if (filters.date_to) {
    conditions.push(`t.executed_at <= $${paramIndex++}`);
    params.push(filters.date_to);
  }

  const whereClause = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

  const countRes = await db.query(
    `SELECT COUNT(*) as total FROM trades t ${whereClause}`,
    params
  );

  const result = await db.query(
    `SELECT t.id, t.user_id, u.username, t.symbol, t.type,
            t.quantity, t.price, t.total_value, t.commission, t.net_cost, t.executed_at
     FROM trades t
     JOIN users u ON u.id = t.user_id
     ${whereClause}
     ORDER BY t.executed_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, limit, offset]
  );

  return {
    trades: result.rows,
    total: parseInt(countRes.rows[0].total, 10),
    limit,
    offset,
  };
}

export async function getPlatformStats() {
  const userRes = await db.query(
    `SELECT COUNT(*) as total_users,
            COUNT(*) FILTER (WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours') as active_today
     FROM users`
  );

  const tradeRes = await db.query(
    `SELECT COUNT(*) as total_trades,
            COALESCE(SUM(total_value), 0) as total_volume,
            COALESCE(AVG(price), 0) as avg_price
     FROM trades`
  );

  const pnlRes = await db.query(
    `SELECT COALESCE(SUM(realized_pnl), 0) as total_realized_pnl
     FROM trade_history`
  );

  const usersOverTime = await db.query(
    `SELECT DATE(created_at) as date, COUNT(*) as count
     FROM users
     WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
     GROUP BY DATE(created_at)
     ORDER BY date`
  );

  const volumeOverTime = await db.query(
    `SELECT DATE(executed_at) as date, SUM(total_value) as volume
     FROM trades
     WHERE executed_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
     GROUP BY DATE(executed_at)
     ORDER BY date`
  );

  return {
    users: {
      total: parseInt(userRes.rows[0].total_users, 10),
      activeToday: parseInt(userRes.rows[0].active_today, 10),
    },
    trades: {
      total: parseInt(tradeRes.rows[0].total_trades, 10),
      totalVolume: parseFloat(tradeRes.rows[0].total_volume).toFixed(2),
      avgPrice: parseFloat(tradeRes.rows[0].avg_price).toFixed(2),
    },
    pnl: {
      totalRealizedPnl: parseFloat(pnlRes.rows[0].total_realized_pnl).toFixed(2),
    },
    charts: {
      usersOverTime: usersOverTime.rows,
      volumeOverTime: volumeOverTime.rows,
    },
  };
}

export async function getUserPortfolio(userId) {
  const result = await db.query(
    `SELECT symbol, quantity, entry_price, current_price,
            unrealized_pnl, unrealized_pnl_percent,
            (quantity * current_price) as position_value,
            updated_at
     FROM portfolio
     WHERE user_id = $1
     ORDER BY updated_at DESC`,
    [userId]
  );

  return result.rows.map(row => ({
    ...row,
    quantity: parseFloat(row.quantity),
    entryPrice: parseFloat(row.entry_price),
    currentPrice: parseFloat(row.current_price),
    unrealizedPnL: parseFloat(row.unrealized_pnl),
    unrealizedPnLPercent: parseFloat(row.unrealized_pnl_percent),
    positionValue: parseFloat(row.position_value),
  }));
}

export async function getUserTrades(userId, limit, offset) {
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
    total: parseInt(countRes.rows[0].total, 10),
    limit,
    offset,
  };
}

export async function getUserWallet(userId) {
  const result = await db.query(
    "SELECT id, user_id, balance FROM wallets WHERE user_id = $1",
    [userId]
  );
  return result.rows[0] || null;
}

// --- Asset Management ---

export async function getAssetsFromDB(includeInactive = false) {
  const where = includeInactive ? '' : 'WHERE is_active = true';
  const result = await db.query(
    `SELECT symbol, name, type, base_price, volatility, trend,
            max_trend, min_trend, spread, trending, trend_strength,
            is_active, created_at, updated_at
     FROM assets ${where}
     ORDER BY symbol`
  );
  return result.rows;
}

export async function insertAsset(data) {
  const { symbol, name, type, base_price, volatility, trend,
          max_trend, min_trend, spread, trending, trend_strength } = data;
  const result = await db.query(
    `INSERT INTO assets
       (symbol, name, type, base_price, volatility, trend,
        max_trend, min_trend, spread, trending, trend_strength)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     ON CONFLICT (symbol) DO NOTHING
     RETURNING *`,
    [symbol, name, type, base_price, volatility, trend || 0,
     max_trend, min_trend, spread, trending != null ? trending : false, trend_strength != null ? trend_strength : 0.5]
  );
  return result.rows[0] || null;
}

export async function updateAssetInDB(symbol, data) {
  const fields = [];
  const params = [];
  let idx = 1;
  for (const [key, val] of Object.entries(data)) {
    if (val !== undefined) {
      fields.push(`${key} = $${idx++}`);
      params.push(val);
    }
  }
  if (fields.length === 0) return null;
  params.push(symbol);
  const result = await db.query(
    `UPDATE assets SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
     WHERE symbol = $${idx} RETURNING *`,
    params
  );
  return result.rows[0] || null;
}

export async function deleteAsset(symbol) {
  const result = await db.query(
    `DELETE FROM assets WHERE symbol = $1 RETURNING *`,
    [symbol]
  );
  return result.rows[0] || null;
}

export async function getTopTraders(limit = 10) {
  const result = await db.query(
    `SELECT u.id, u.username,
            COALESCE(SUM(th.realized_pnl), 0) as total_pnl,
            COUNT(th.id) as closed_trades
     FROM users u
     LEFT JOIN trade_history th ON th.user_id = u.id
     GROUP BY u.id, u.username
     ORDER BY total_pnl DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}
