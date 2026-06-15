import db from "../config/db.js";
import { generateAccessToken } from "../utils/token.js";
import {
  verifyRefreshToken,
  revokeRefreshToken,
  createRefreshToken,
} from "../utils/refreshToken.js";

export async function refresh(req, res) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token required" });
    }

    const tokenData = await verifyRefreshToken(refreshToken);
    if (!tokenData) {
      return res.status(401).json({ error: "Invalid or expired refresh token" });
    }

    await revokeRefreshToken(refreshToken);

    const userResult = await db.query(
      "SELECT id, username, email, is_admin FROM users WHERE id = $1",
      [tokenData.user_id]
    );

    if (!userResult.rows[0]) {
      return res.status(401).json({ error: "User not found" });
    }

    const user = userResult.rows[0];
    const accessToken = generateAccessToken(user);
    const newRefreshToken = await createRefreshToken(user.id);

    res.json({
      token: accessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        is_admin: user.is_admin,
      },
    });
  } catch (error) {
    res.status(401).json({ error: "Invalid refresh token" });
  }
}

export async function logout(req, res) {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await revokeRefreshToken(refreshToken);
  }
  res.json({ message: "Logged out successfully" });
}
