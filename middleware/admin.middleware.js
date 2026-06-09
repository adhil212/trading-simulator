import jwt from "jsonwebtoken"

function adminMiddleware(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader) return res.status(401).json({ error: "No token" });

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || !parts[1]) {
    return res.status(401).json({ error: "Invalid token format" });
  }

  const token = parts[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    if (!decoded.is_admin) {
      return res.status(403).json({ error: "Admin access required" });
    }
    req.user = decoded
    next()
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
}

export default adminMiddleware;
