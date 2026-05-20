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

