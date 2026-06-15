import crypto from "crypto"
import db from "../config/db.js"

const REFRESH_EXPIRY_DAYS = parseInt(process.env.REFRESH_TOKEN_EXPIRES_IN || "7", 10)

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex")
}

export async function createRefreshToken(userId) {
  const token = crypto.randomBytes(40).toString("hex")
  const tokenHash = hashToken(token)
  const expiresAt = new Date(Date.now() + REFRESH_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

  await db.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt]
  )

  return token
}

export async function verifyRefreshToken(token) {
  const tokenHash = hashToken(token)
  const result = await db.query(
    `SELECT rt.id, rt.user_id, rt.expires_at
     FROM refresh_tokens rt
     WHERE rt.token_hash = $1 AND rt.revoked = false AND rt.expires_at > NOW()`,
    [tokenHash]
  )
  return result.rows[0] || null
}

export async function revokeRefreshToken(token) {
  const tokenHash = hashToken(token)
  await db.query(
    `UPDATE refresh_tokens SET revoked = true WHERE token_hash = $1`,
    [tokenHash]
  )
}

export async function revokeAllUserTokens(userId) {
  await db.query(
    `UPDATE refresh_tokens SET revoked = true WHERE user_id = $1`,
    [userId]
  )
}
