import jwt from "jsonwebtoken"

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader) return res.status(401).json({ error: "No token" });

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || !parts[1]) {
    return res.status(401).json({ error: "Invalid token format" });
  }

  const token = parts[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
    next()
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
}
export default authMiddleware;
