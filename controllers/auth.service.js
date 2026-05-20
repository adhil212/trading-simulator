import generatetoken from "../utils/token.js";

import {
  registerUser,
  loginUser,
  googleLogin,
} from "../services/auth.service.js";

export async function register(req, res) {
  try {
    const { username, email, password } = req.body;

    const user = await registerUser(username, email, password);

    res.status(201).json({
      message: "Registration successful",
      user,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function googleAuth(req, res) {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: "Missing idToken" });

    const user = await googleLogin(idToken);
    const token = generatetoken(user);

    res.json({
      message: "Google login successful",
      token,
      user,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await loginUser(email, password);

    const token = generatetoken(user);

    res.json({
      message: "login successful",
      token,
      user,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}
