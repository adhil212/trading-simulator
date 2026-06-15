import db from "../config/db.js";
import { cacheGet, cacheSet, cacheDel } from "../utils/cache.js";

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
  const cached = await cacheGet("admin:stats");
  if (cached) return cached;

  const userRes = await db.query(
    `SELECT COUNT(*) as total_users
     FROM users`
  );

  const tradeRes = await db.query(
    `SELECT COUNT(*) as total_trades
     FROM trades`
  );

  const todayVolumeRes = await db.query(
    `SELECT COALESCE(SUM(total_value), 0) as volume
     FROM trades
     WHERE DATE(executed_at) = CURRENT_DATE`
  );

  // const pnlRes = await db.query(
  //   `SELECT COALESCE(SUM(realized_pnl), 0) as total_realized_pnl
  //    FROM trade_history`
  // );

  const usersOverTime = await db.query(
    `SELECT TO_CHAR(DATE(created_at), 'YYYY-MM-DD') as date, COUNT(*) as count
     FROM users
     WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
     GROUP BY DATE(created_at)
     ORDER BY date`
  );

  const volumeOverTime = await db.query(
    `SELECT TO_CHAR(DATE(executed_at), 'YYYY-MM-DD') as date, SUM(total_value) as volume
     FROM trades
     WHERE executed_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
     GROUP BY DATE(executed_at)
     ORDER BY date`
  );

  const result = {
    users: {
      total: parseInt(userRes.rows[0].total_users, 10),
    },
    trades: {
      total: parseInt(tradeRes.rows[0].total_trades, 10),
      todayVolume: parseFloat(todayVolumeRes.rows[0].volume).toFixed(2),
    },
    charts: {
      usersOverTime: usersOverTime.rows,
      volumeOverTime: volumeOverTime.rows,
    },
  };

  await cacheSet("admin:stats", result, 30);
  return result;
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
  const cacheKey = `admin:assets:${includeInactive}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  const where = includeInactive ? '' : 'WHERE is_active = true';
  const result = await db.query(
    `SELECT symbol, name, type, base_price, volatility, trend,
            max_trend, min_trend, spread, trending, trend_strength,
            is_active, created_at, updated_at
     FROM assets ${where}
     ORDER BY symbol`
  );
  const rows = result.rows;
  await cacheSet(cacheKey, rows, 300);
  return rows;
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
  await cacheDel("admin:assets:*");
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
  await cacheDel("admin:assets:*");
  return result.rows[0] || null;
}

export async function deleteAsset(symbol) {
  const result = await db.query(
    `DELETE FROM assets WHERE symbol = $1 RETURNING *`,
    [symbol]
  );
  return result.rows[0] || null;
}

export async function getTotalCommissions() {
  const result = await db.query(
    "SELECT COALESCE(SUM(amount), 0) as total FROM commission_history"
  );
  return parseFloat(result.rows[0].total);
}

export async function getCommissionHistory(limit = 50, offset = 0) {
  const countRes = await db.query(
    "SELECT COUNT(*) as total FROM commission_history"
  );

  const result = await db.query(
    `SELECT ch.id, ch.trade_id, ch.user_id, u.username, ch.symbol, ch.amount, ch.type, ch.created_at
     FROM commission_history ch
     JOIN users u ON u.id = ch.user_id
     ORDER BY ch.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  return {
    commissions: result.rows,
    total: parseInt(countRes.rows[0].total, 10),
    limit,
    offset,
  };
}

export async function getAllTransactions(filters, limit, offset) {
  const conditions = [];
  const params = [];
  let paramIndex = 1;

  if (filters.type) {
    conditions.push(`t.type = $${paramIndex++}`);
    params.push(filters.type);
  }
  if (filters.status) {
    conditions.push(`t.status = $${paramIndex++}`);
    params.push(filters.status);
  }
  if (filters.user_id) {
    conditions.push(`t.user_id = $${paramIndex++}`);
    params.push(filters.user_id);
  }
  if (filters.date_from) {
    conditions.push(`t.created_at >= $${paramIndex++}`);
    params.push(filters.date_from);
  }
  if (filters.date_to) {
    conditions.push(`t.created_at <= $${paramIndex++}`);
    params.push(filters.date_to);
  }

  const whereClause = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

  const countRes = await db.query(
    `SELECT COUNT(*) as total FROM transactions t ${whereClause}`,
    params
  );

  const result = await db.query(
    `SELECT t.id, t.user_id, u.username, t.type, t.amount, t.status, t.details, t.created_at
     FROM transactions t
     JOIN users u ON u.id = t.user_id
     ${whereClause}
     ORDER BY t.created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, limit, offset]
  );

  return {
    transactions: result.rows,
    total: parseInt(countRes.rows[0].total, 10),
    limit,
    offset,
  };
}

export async function getWithdrawalRequests(status = "PENDING", limit = 50, offset = 0) {
  const countRes = await db.query(
    `SELECT COUNT(*) as total FROM transactions WHERE type = 'WITHDRAWAL' AND status = $1`,
    [status]
  );

  const result = await db.query(
    `SELECT t.id, t.user_id, u.username, u.email, t.amount, t.status, t.details, t.created_at
     FROM transactions t
     JOIN users u ON u.id = t.user_id
     WHERE t.type = 'WITHDRAWAL' AND t.status = $1
     ORDER BY t.created_at ASC
     LIMIT $2 OFFSET $3`,
    [status, limit, offset]
  );

  return {
    requests: result.rows,
    total: parseInt(countRes.rows[0].total, 10),
    limit,
    offset,
  };
}

export async function approveWithdrawal(id, adminId) {
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const txRes = await client.query(
      `SELECT id, user_id, amount, status FROM transactions WHERE id = $1 AND type = 'WITHDRAWAL' FOR UPDATE`,
      [id]
    );

    if (txRes.rows.length === 0) {
      throw new Error("Withdrawal request not found");
    }

    const tx = txRes.rows[0];
    if (tx.status !== "PENDING") {
      throw new Error(`Withdrawal request is already ${tx.status}`);
    }

    const walletRes = await client.query(
      `SELECT balance FROM wallets WHERE user_id = $1 FOR UPDATE`,
      [tx.user_id]
    );

    if (walletRes.rows.length === 0) {
      throw new Error("User wallet not found");
    }

    if (Number(walletRes.rows[0].balance) < Number(tx.amount)) {
      throw new Error("Insufficient balance in user wallet");
    }

    await client.query(
      `UPDATE wallets SET balance = balance - $1 WHERE user_id = $2`,
      [tx.amount, tx.user_id]
    );

    await client.query(
      `UPDATE transactions SET status = 'COMPLETED' WHERE id = $1`,
      [id]
    );

    await client.query("COMMIT");

    return { success: true, message: "Withdrawal approved" };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function rejectWithdrawal(id) {
  const result = await db.query(
    `UPDATE transactions SET status = 'REJECTED' WHERE id = $1 AND type = 'WITHDRAWAL' AND status = 'PENDING' RETURNING id`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new Error("Pending withdrawal request not found");
  }

  return { success: true, message: "Withdrawal rejected" };
}

export async function deleteUser(userId) {
  const userRes = await db.query(
    `SELECT is_admin FROM users WHERE id = $1`,
    [userId]
  );
  if (userRes.rows.length === 0) throw new Error("User not found");
  if (userRes.rows[0].is_admin) throw new Error("Cannot delete admin users");

  await db.query(`DELETE FROM users WHERE id = $1`, [userId]);
  await cacheDel("admin:stats");
  await cacheDel("admin:topTraders:*");
  return { success: true, message: "User deleted successfully" };
}

export async function getUserTransactions(userId, limit = 50, offset = 0) {
  const countRes = await db.query(
    "SELECT COUNT(*) as total FROM transactions WHERE user_id = $1",
    [userId]
  );

  const result = await db.query(
    `SELECT id, type, amount, status, details, created_at
     FROM transactions
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  return {
    transactions: result.rows,
    total: parseInt(countRes.rows[0].total, 10),
    limit,
    offset,
  };
}

export async function getTopTraders(limit = 10) {
  const cacheKey = `admin:topTraders:${limit}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

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
  const rows = result.rows;
  await cacheSet(cacheKey, rows, 60);
  return rows;
}
