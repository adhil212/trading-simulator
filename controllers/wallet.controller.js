import db from "../config/db.js";
import Razorpay from "razorpay";
import crypto from "crypto";
import { MAX_DEPOSIT_AMOUNT, MAX_WITHDRAWAL_AMOUNT } from "../utils/constants.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export const createDepositOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }
    if (amount > MAX_DEPOSIT_AMOUNT) {
      return res.status(400).json({ error: `Deposit amount cannot exceed ${MAX_DEPOSIT_AMOUNT}` });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: `deposit_${userId}_${Date.now()}`,
    });

    await db.query(
      `INSERT INTO transactions (user_id, type, amount, razorpay_order_id, status)
       VALUES ($1, 'DEPOSIT', $2, $3, 'PENDING')`,
      [userId, amount, order.id]
    );

    res.json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const verifyDeposit = async (req, res) => {
  try {
    const userId = req.user.id;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: "Invalid payment signature" });
    }

    const client = await db.connect();
    try {
      await client.query("BEGIN");

      const txRes = await client.query(
        `SELECT id, amount FROM transactions
         WHERE razorpay_order_id = $1 AND user_id = $2 AND status = 'PENDING'
         FOR UPDATE`,
        [razorpay_order_id, userId]
      );

      if (txRes.rows.length === 0) {
        throw new Error("Transaction not found or already processed");
      }

      const tx = txRes.rows[0];

      await client.query(
        `UPDATE transactions SET status = 'COMPLETED', razorpay_payment_id = $1, razorpay_signature = $2
         WHERE id = $3`,
        [razorpay_payment_id, razorpay_signature, tx.id]
      );

      await client.query(
        `UPDATE wallets SET balance = balance + $1 WHERE user_id = $2`,
        [tx.amount, userId]
      );

      await client.query("COMMIT");

      res.json({ success: true, message: "Deposit successful" });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const withdraw = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, method, upi_id, account_no, ifsc } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }
    if (amount > MAX_WITHDRAWAL_AMOUNT) {
      return res.status(400).json({ error: `Withdrawal amount cannot exceed ${MAX_WITHDRAWAL_AMOUNT}` });
    }

    if (method === "upi" && !upi_id) {
      return res.status(400).json({ error: "UPI ID is required" });
    }
    if (method === "bank" && (!account_no || !ifsc)) {
      return res.status(400).json({ error: "Account number and IFSC are required" });
    }

    if (method !== "upi" && method !== "bank") {
      return res.status(400).json({ error: "Method must be 'upi' or 'bank'" });
    }

    const details = method === "upi"
      ? { method, upi_id }
      : { method, account_no, ifsc };

    const balanceRes = await db.query(
      "SELECT balance FROM wallets WHERE user_id = $1",
      [userId]
    );

    if (balanceRes.rows.length === 0) {
      return res.status(404).json({ error: "Wallet not found" });
    }

    if (Number(balanceRes.rows[0].balance) < amount) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    await db.query(
      `INSERT INTO transactions (user_id, type, amount, status, details)
       VALUES ($1, 'WITHDRAWAL', $2, 'PENDING', $3)`,
      [userId, amount, JSON.stringify(details)]
    );

    res.json({ success: true, message: "Withdrawal request submitted for admin approval" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
