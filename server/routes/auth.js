const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body } = require("express-validator");
const { query } = require("../db");
const { requireAuth } = require("../middleware/auth");
const { validate } = require("../middleware/validate");

const signToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });

const sanitizeUser = (user) => {
  const { password_hash, ...safe } = user;
  return safe;
};

// POST /register
router.post("/register",
  [
    body("username").trim().isLength({ min: 3, max: 30 }).withMessage("Username must be 3-30 characters.")
      .matches(/^[a-zA-Z0-9_]+$/).withMessage("Letters, numbers, underscores only."),
    body("email").trim().isEmail().normalizeEmail().withMessage("Valid email required."),
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters."),
  ],
  validate,
  async (req, res) => {
    const { username, email, password } = req.body;
    try {
      const { rows: existing } = await query(
        "SELECT id, username, email FROM users WHERE username = $1 OR email = $2",
        [username, email]
      );
      if (existing.length) {
        const field = existing[0].username === username ? "username" : "email";
        return res.status(409).json({ data: null, error: { code: "CONFLICT", message: `That ${field} is already taken.`, fields: [{ field, message: `Already taken.` }] } });
      }
      const password_hash = await bcrypt.hash(password, 12);
      const { rows } = await query(
        "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING *",
        [username, email, password_hash]
      );
      res.status(201).json({ data: { user: sanitizeUser(rows[0]), token: signToken(rows[0].id) }, error: null });
    } catch (err) {
      console.error("[register]", err.message);
      res.status(500).json({ data: null, error: { code: "SERVER_ERROR", message: "Registration failed." } });
    }
  }
);

// POST /login
router.post("/login",
  [
    body("email").trim().isEmail().normalizeEmail().withMessage("Valid email required."),
    body("password").notEmpty().withMessage("Password required."),
  ],
  validate,
  async (req, res) => {
    const { email, password } = req.body;
    try {
      const { rows } = await query("SELECT * FROM users WHERE email = $1", [email]);
      const user = rows[0];
      const dummyHash = "$2a$12$invalidhashfortimingprotection00000000000000";
      const isValid = user
        ? await bcrypt.compare(password, user.password_hash)
        : await bcrypt.compare(password, dummyHash).then(() => false);
      if (!user || !isValid) {
        return res.status(401).json({ data: null, error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password." } });
      }
      res.json({ data: { user: sanitizeUser(user), token: signToken(user.id) }, error: null });
    } catch (err) {
      console.error("[login]", err.message);
      res.status(500).json({ data: null, error: { code: "SERVER_ERROR", message: "Login failed." } });
    }
  }
);

// GET /me
router.get("/me", requireAuth, (req, res) => {
  res.json({ data: { user: req.user }, error: null });
});

// PATCH /me
router.patch("/me", requireAuth,
  [
    body("bio").optional().isLength({ max: 300 }).withMessage("Bio max 300 characters."),
    body("avatar_url").optional().isURL().withMessage("Must be a valid URL."),
    body("username").optional().trim().isLength({ min: 3, max: 30 }).withMessage("Username must be 3-30 characters.")
      .matches(/^[a-zA-Z0-9_]+$/).withMessage("Letters, numbers, underscores only."),
  ],
  validate,
  async (req, res) => {
    const { bio, avatar_url, username } = req.body;
    try {
      if (username && username !== req.user.username) {
        const { rows } = await query("SELECT id FROM users WHERE username = $1 AND id != $2", [username, req.user.id]);
        if (rows.length) return res.status(409).json({ data: null, error: { code: "CONFLICT", message: "Username taken.", fields: [{ field: "username", message: "Already taken." }] } });
      }
      const { rows } = await query(
        `UPDATE users SET bio = COALESCE($1, bio), avatar_url = COALESCE($2, avatar_url), username = COALESCE($3, username)
         WHERE id = $4 RETURNING id, username, email, avatar_url, bio, created_at`,
        [bio ?? null, avatar_url ?? null, username ?? null, req.user.id]
      );
      res.json({ data: { user: rows[0] }, error: null });
    } catch (err) {
      console.error("[update me]", err.message);
      res.status(500).json({ data: null, error: { code: "SERVER_ERROR", message: "Update failed." } });
    }
  }
);

module.exports = router;
