import jwt from "jsonwebtoken"

export function generateAccessToken(user) {
  return jwt.sign(
    { id: user.id, is_admin: user.is_admin || false },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "15m" }
  )
}

export function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET)
}
