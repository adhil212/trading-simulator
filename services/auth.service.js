import bcrypt from "bcrypt";
import validator from "validator";
import db from "../config/db.js";

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
     SELECT $1, 100000
     WHERE NOT EXISTS (SELECT 1 FROM wallets WHERE user_id = $1)`,
    [userId]
  );
}

export async function registerUser(username, email, password) {
  const normalizedEmail = normalizeEmail(email);
  const cleanUsername = String(username || "").trim();

  if (!cleanUsername) throw new Error("Username is required");
  assertValidEmail(normalizedEmail);
  assertStrongPassword(password);

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const existing = await client.query(
      "SELECT id FROM users WHERE email = $1 FOR UPDATE",
      [normalizedEmail]
    );

    if (existing.rows.length) {
      throw new Error("Email is already registered");
    }

    const userResult = await client.query(
      `INSERT INTO users (username, email, password)
       VALUES ($1, $2, $3)
       RETURNING id, username, email`,
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

export async function loginUser(email, password) {
  const normalizedEmail = normalizeEmail(email);
  assertValidEmail(normalizedEmail);

  const result = await db.query(
    `SELECT id, username, email, password
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
