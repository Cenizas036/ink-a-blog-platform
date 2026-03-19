# Run this from C:\Users\KIIT0001\ink\
# It will overwrite all empty server files with correct content

# ─── server/db/migrate.js ───────────────────────────────────────────────────
@'
require("dotenv").config();
const { pool } = require("./index");

const schema = `
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";
  CREATE EXTENSION IF NOT EXISTS "pg_trgm";

  CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    username      TEXT    UNIQUE NOT NULL,
    email         TEXT    UNIQUE NOT NULL,
    password_hash TEXT    NOT NULL,
    avatar_url    TEXT,
    bio           TEXT    DEFAULT '',
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS posts (
    id            SERIAL PRIMARY KEY,
    author_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title         TEXT    NOT NULL,
    slug          TEXT    UNIQUE NOT NULL,
    body          TEXT    NOT NULL,
    cover_image   TEXT,
    excerpt       TEXT,
    read_time     INTEGER NOT NULL DEFAULT 1,
    published     BOOLEAN NOT NULL DEFAULT TRUE,
    tags          TEXT[]  DEFAULT '{}',
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS posts_fts_idx
    ON posts USING gin(to_tsvector('english', title || ' ' || body));
  CREATE INDEX IF NOT EXISTS posts_slug_idx ON posts(slug);
  CREATE INDEX IF NOT EXISTS posts_author_idx ON posts(author_id, created_at DESC);

  CREATE TABLE IF NOT EXISTS likes (
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, post_id)
  );

  CREATE TABLE IF NOT EXISTS comments (
    id         SERIAL PRIMARY KEY,
    post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body       TEXT    NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS comments_post_idx ON comments(post_id, created_at ASC);

  CREATE OR REPLACE FUNCTION update_updated_at()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  DROP TRIGGER IF EXISTS users_updated_at    ON users;
  DROP TRIGGER IF EXISTS posts_updated_at    ON posts;
  DROP TRIGGER IF EXISTS comments_updated_at ON comments;

  CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  CREATE TRIGGER posts_updated_at
    BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  CREATE TRIGGER comments_updated_at
    BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
`;

(async () => {
  const client = await pool.connect();
  try {
    console.log("Running migrations...");
    await client.query(schema);
    console.log("Migrations complete.");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();
'@ | Set-Content -Encoding UTF8 server\db\migrate.js
Write-Host "wrote server/db/migrate.js"

# ─── server/index.js ────────────────────────────────────────────────────────
@'
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/auth");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { data: null, error: { code: "RATE_LIMITED", message: "Too many requests." } },
}));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { data: null, error: { code: "AUTH_RATE_LIMITED", message: "Too many auth attempts. Wait 15 minutes." } },
});

app.use("/api/v1/auth", authLimiter, authRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use((req, res) => {
  res.status(404).json({ data: null, error: { code: "NOT_FOUND", message: `Route ${req.method} ${req.path} not found.` } });
});

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({
    data: null,
    error: { code: err.code || "SERVER_ERROR", message: err.message || "An unexpected error occurred." },
  });
});

app.listen(PORT, () => {
  console.log(`INK API running on port ${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
});

module.exports = app;
'@ | Set-Content -Encoding UTF8 server\index.js
Write-Host "wrote server/index.js"

# ─── server/middleware/auth.js ───────────────────────────────────────────────
@'
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
'@ | Set-Content -Encoding UTF8 server\middleware\auth.js
Write-Host "wrote server/middleware/auth.js"

# ─── server/middleware/validate.js ──────────────────────────────────────────
@'
const { validationResult } = require("express-validator");

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      data: null,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid input.",
        fields: errors.array().map((e) => ({ field: e.path, message: e.msg })),
      },
    });
  }
  next();
};

module.exports = { validate };
'@ | Set-Content -Encoding UTF8 server\middleware\validate.js
Write-Host "wrote server/middleware/validate.js"

# ─── server/routes/auth.js ──────────────────────────────────────────────────
@'
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
'@ | Set-Content -Encoding UTF8 server\routes\auth.js
Write-Host "wrote server/routes/auth.js"

# ─── server/routes/posts.js (placeholder for Phase 2) ───────────────────────
@'
// Phase 2 — Posts routes coming soon
const router = require("express").Router();
module.exports = router;
'@ | Set-Content -Encoding UTF8 server\routes\posts.js
Write-Host "wrote server/routes/posts.js"

# ─── server/routes/comments.js (placeholder for Phase 2) ────────────────────
@'
// Phase 2 — Comments routes coming soon
const router = require("express").Router();
module.exports = router;
'@ | Set-Content -Encoding UTF8 server\routes\comments.js
Write-Host "wrote server/routes/comments.js"

Write-Host ""
Write-Host "All files written. Now run: npm run db:migrate"