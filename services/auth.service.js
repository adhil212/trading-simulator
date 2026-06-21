import bcrypt from "bcrypt";
import crypto from "crypto";
import validator from "validator";
import { OAuth2Client } from "google-auth-library";
import db from "../config/db.js";
import { sendOtpEmail } from "../utils/mail.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 12);

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function safeUser(user) {
  if (!user) return null;

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    is_admin: user.is_admin || false,
  };
}

function assertValidEmail(email) {
  if (!validator.isEmail(email)) {
    throw new Error("Invalid email address");
  }
}

function assertStrongPassword(password) {
  if (
    !validator.isStrongPassword(String(password || ""), {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    })
  ) {
    throw new Error(
      "Password must be at least 8 characters and include uppercase, lowercase, number, and symbol"
    );
  }
}

async function ensureWallet(client, userId) {
  await client.query(
    `INSERT INTO wallets (user_id, balance)
     SELECT $1, 10000
     WHERE NOT EXISTS (SELECT 1 FROM wallets WHERE user_id = $1)`,
    [userId]
  );
}

export async function sendOtp(email) {
  const normalizedEmail = normalizeEmail(email);
  assertValidEmail(normalizedEmail);

  const existing = await db.query(
    "SELECT id FROM users WHERE email = $1",
    [normalizedEmail]
  );

  if (existing.rows.length) {
    throw new Error("Email is already registered");
  }

  await db.query(
    "UPDATE otp_codes SET used = TRUE WHERE email = $1 AND used = FALSE",
    [normalizedEmail]
  );

  const otp = String(crypto.randomInt(100000, 999999));
  const client = await db.connect();

  try {
    await client.query(
      `INSERT INTO otp_codes (email, otp, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '10 minutes')`,
      [normalizedEmail, otp]
    );

    await sendOtpEmail(normalizedEmail, otp);
  } finally {
    client.release();
  }
}

export async function verifyOtpAndRegister(username, email, otp, password) {
  const normalizedEmail = normalizeEmail(email);
  const cleanUsername = String(username || "").trim();

  if (!cleanUsername) throw new Error("Username is required");
  assertValidEmail(normalizedEmail);
  assertStrongPassword(password);

  if (!otp || String(otp).length !== 6) {
    throw new Error("Invalid OTP");
  }

  const otpResult = await db.query(
    `SELECT id FROM otp_codes
     WHERE email = $1 AND otp = $2 AND used = FALSE AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [normalizedEmail, String(otp)]
  );

  if (!otpResult.rows.length) {
    throw new Error("Invalid or expired OTP");
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      "UPDATE otp_codes SET used = TRUE WHERE id = $1",
      [otpResult.rows[0].id]
    );

    const userResult = await client.query(
      `INSERT INTO users (username, email, password)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, is_admin`,
      [cleanUsername, normalizedEmail, passwordHash]
    );

    const user = userResult.rows[0];
    await ensureWallet(client, user.id);

    await client.query("COMMIT");

    return safeUser(user);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function googleLogin(googleIdToken) {
  const ticket = await googleClient.verifyIdToken({
    idToken: googleIdToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload) {
    throw new Error("Invalid Google token");
  }

  const google_id = payload.sub;
  const email = payload.email;
  const name = payload.name;
  const avatar_url = payload.picture;

  const existing = await db.query(
    "SELECT id, username, email, is_admin FROM users WHERE google_id = $1",
    [google_id]
  );

  if (existing.rows.length) {
    return safeUser(existing.rows[0]);
  }

  const existingByEmail = await db.query(
    "SELECT id, google_id FROM users WHERE email = $1",
    [email]
  );

  if (existingByEmail.rows.length) {
    if (!existingByEmail.rows[0].google_id) {
      throw new Error("This email is already registered with a password. Please log in normally.");
    }
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const userResult = await client.query(
      `INSERT INTO users (username, email, google_id, avatar_url)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (google_id) DO UPDATE SET avatar_url = EXCLUDED.avatar_url
       RETURNING id, username, email, is_admin`,
      [name, email, google_id, avatar_url]
    );

    const user = userResult.rows[0];
    await ensureWallet(client, user.id);

    await client.query("COMMIT");

    return safeUser(user);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function loginUser(email, password) {
  const normalizedEmail = normalizeEmail(email);
  assertValidEmail(normalizedEmail);

  const result = await db.query(
    `SELECT id, username, email, password, is_admin
     FROM users
     WHERE email = $1`,
    [normalizedEmail]
  );
  const user = result.rows[0];

  if (!user || !user.password) {
    throw new Error("Invalid email or password");
  }

  const passwordMatches = await bcrypt.compare(password || "", user.password);
  if (!passwordMatches) {
    throw new Error("Invalid email or password");
  }

  return safeUser(user);
}
