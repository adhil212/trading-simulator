import db from "../config/db.js";

export const getWallet = async (req, res) => {
  try {
    const userId = req.user.id;

    const walletRes = await db.query(
      "SELECT id, user_id, balance FROM wallets WHERE user_id = $1",
      [userId]
    );

    const wallet = walletRes.rows[0];
    if (!wallet) return res.status(404).json({ error: "Wallet not found" });

    res.json(wallet);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = parseInt(req.query.offset, 10) || 0;

    const result = await db.query(
      `SELECT id, type, amount, status, razorpay_order_id, razorpay_payment_id, created_at
       FROM transactions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const count = await db.query(
      `SELECT COUNT(*) FROM transactions WHERE user_id = $1`,
      [userId]
    );

    res.json({
      transactions: result.rows,
      total: parseInt(count.rows[0].count, 10),
      limit,
      offset,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

