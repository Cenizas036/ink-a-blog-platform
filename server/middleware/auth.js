const jwt = require("jsonwebtoken");
const { query } = require("../db");

const extractToken = (req) => {
  const auth = req.headers.authorization || "";
  if (auth.startsWith("Bearer ")) return auth.slice(7);
  return null;
};

const requireAuth = async (req, res, next) => {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ data: null, error: { code: "UNAUTHORIZED", message: "Authentication token required." } });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await query(
      "SELECT id, username, email, avatar_url, bio FROM users WHERE id = $1",
      [payload.userId]
    );
    if (!rows.length) {
      return res.status(401).json({ data: null, error: { code: "USER_NOT_FOUND", message: "User no longer exists." } });
    }
    req.user = rows[0];
    next();
  } catch (err) {
    const code = err.name === "TokenExpiredError" ? "TOKEN_EXPIRED" : "TOKEN_INVALID";
    return res.status(401).json({ data: null, error: { code, message: err.message } });
  }
};

const optionalAuth = async (req, res, next) => {
  const token = extractToken(req);
  if (!token) return next();
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await query(
      "SELECT id, username, email, avatar_url, bio FROM users WHERE id = $1",
      [payload.userId]
    );
    if (rows.length) req.user = rows[0];
  } catch {}
  next();
};

module.exports = { requireAuth, optionalAuth };
