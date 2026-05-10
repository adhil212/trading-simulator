import db from "../config/db.js";
import bcrypt from "bcrypt";

export async function registerUser(username, email, password) {
  if (!username || !email || !password) {
    throw new Error("username, email and password are required");
  }

  const client = await db.connect();

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    await client.query("BEGIN");

    const userRes = await client.query(
      "INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email, created_at",
      [username, email, hashedPassword]
    );

    const user = userRes.rows[0];

    await client.query(
      "INSERT INTO wallets (user_id, balance) VALUES ($1, $2)",
      [user.id, 10000]
    );

    await client.query("COMMIT");
    return user;
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.code === "23505") {
      if (error.constraint === "users_email_key") {
        throw new Error("Email already exists");
      }

      if (error.constraint === "users_username_key") {
        throw new Error("Username already exists");
      }
    }

    throw error;
  } finally {
    client.release();
  }
}

export async function loginUser(email, password) {
  const userRes = await db.query(
    "SELECT * FROM users WHERE email = $1",
    [email]
  );

  const user = userRes.rows[0];
  if (!user) throw new Error("User not found");

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new Error("Invalid password");

  return user;
}
