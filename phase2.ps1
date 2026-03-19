# Run from C:\Users\KIIT0001\ink\
# Writes posts.js, comments.js, and patches server/index.js

# ─── server/routes/posts.js ─────────────────────────────────────────────────
@'
const router = require("express").Router();
const { body, query: queryParam } = require("express-validator");
const { query, withTransaction } = require("../db");
const { requireAuth, optionalAuth } = require("../middleware/auth");
const { validate } = require("../middleware/validate");

const slugify = (text) =>
  text.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");

const uniqueSlug = async (base, excludeId = null) => {
  let slug = base;
  let counter = 1;
  while (true) {
    const { rows } = await query(
      "SELECT id FROM posts WHERE slug = $1 AND ($2::int IS NULL OR id != $2)",
      [slug, excludeId]
    );
    if (!rows.length) return slug;
    slug = `${base}-${counter++}`;
  }
};

const calcReadTime = (body) => Math.max(1, Math.ceil(body.trim().split(/\s+/).length / 200));

const makeExcerpt = (body) =>
  body.replace(/#{1,6}\s/g, "").replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/[*_`>~\-\[\]()]/g, "").replace(/\n+/g, " ").trim().slice(0, 160) + "...";

const postSelect = (userId) => `
  SELECT
    p.*,
    u.username   AS author_username,
    u.avatar_url AS author_avatar,
    u.bio        AS author_bio,
    COUNT(DISTINCT l.user_id)::int AS like_count,
    COUNT(DISTINCT c.id)::int      AS comment_count,
    ${userId ? `BOOL_OR(l.user_id = ${userId})` : "FALSE"} AS liked_by_me
  FROM posts p
  JOIN users u ON u.id = p.author_id
  LEFT JOIN likes l ON l.post_id = p.id
  LEFT JOIN comments c ON c.post_id = p.id
`;

// GET / - paginated feed
router.get("/", optionalAuth,
  [
    queryParam("page").optional().isInt({ min: 1 }).toInt(),
    queryParam("limit").optional().isInt({ min: 1, max: 50 }).toInt(),
    queryParam("tag").optional().trim(),
    queryParam("search").optional().trim(),
  ],
  validate,
  async (req, res) => {
    const page = req.query.page || 1;
    const limit = req.query.limit || 10;
    const offset = (page - 1) * limit;
    const { tag, search } = req.query;
    const userId = req.user?.id || null;
    try {
      const conditions = ["p.published = TRUE"];
      const params = [];
      if (tag) { params.push(tag); conditions.push(`$${params.length} = ANY(p.tags)`); }
      if (search) {
        params.push(search);
        conditions.push(`to_tsvector('english', p.title || ' ' || p.body) @@ plainto_tsquery('english', $${params.length})`);
      }
      const where = `WHERE ${conditions.join(" AND ")}`;
      const { rows: countRows } = await query(`SELECT COUNT(*)::int AS total FROM posts p ${where}`, params);
      const total = countRows[0].total;
      params.push(limit, offset);
      const { rows: posts } = await query(
        `${postSelect(userId)} ${where} GROUP BY p.id, u.id ORDER BY p.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      );
      res.json({
        data: {
          posts,
          meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page * limit < total, hasPrev: page > 1 },
        },
        error: null,
      });
    } catch (err) {
      console.error("[GET /posts]", err.message);
      res.status(500).json({ data: null, error: { code: "SERVER_ERROR", message: err.message } });
    }
  }
);

// GET /user/:username
router.get("/user/:username", optionalAuth, async (req, res) => {
  const userId = req.user?.id || null;
  try {
    const { rows: userRows } = await query(
      "SELECT id, username, email, avatar_url, bio, created_at FROM users WHERE username = $1",
      [req.params.username]
    );
    if (!userRows.length) return res.status(404).json({ data: null, error: { code: "NOT_FOUND", message: "User not found." } });
    const author = userRows[0];
    const { rows: posts } = await query(
      `${postSelect(userId)} WHERE p.author_id = $1 AND p.published = TRUE GROUP BY p.id, u.id ORDER BY p.created_at DESC`,
      [author.id]
    );
    res.json({ data: { author, posts }, error: null });
  } catch (err) {
    console.error("[GET /posts/user/:username]", err.message);
    res.status(500).json({ data: null, error: { code: "SERVER_ERROR", message: err.message } });
  }
});

// GET /:slug
router.get("/:slug", optionalAuth, async (req, res) => {
  const userId = req.user?.id || null;
  try {
    const { rows } = await query(
      `${postSelect(userId)} WHERE p.slug = $1 GROUP BY p.id, u.id`,
      [req.params.slug]
    );
    if (!rows.length) return res.status(404).json({ data: null, error: { code: "NOT_FOUND", message: "Post not found." } });
    res.json({ data: { post: rows[0] }, error: null });
  } catch (err) {
    console.error("[GET /posts/:slug]", err.message);
    res.status(500).json({ data: null, error: { code: "SERVER_ERROR", message: err.message } });
  }
});

// POST / - create
router.post("/", requireAuth,
  [
    body("title").trim().isLength({ min: 3, max: 200 }).withMessage("Title must be 3-200 characters."),
    body("body").trim().isLength({ min: 10 }).withMessage("Body must be at least 10 characters."),
    body("cover_image").optional().isURL().withMessage("Cover image must be a valid URL."),
    body("tags").optional().isArray({ max: 5 }).withMessage("Max 5 tags."),
    body("published").optional().isBoolean(),
  ],
  validate,
  async (req, res) => {
    const { title, body: postBody, cover_image, tags = [], published = true } = req.body;
    try {
      const slug = await uniqueSlug(slugify(title));
      const { rows } = await query(
        `INSERT INTO posts (author_id, title, slug, body, cover_image, excerpt, read_time, tags, published)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [req.user.id, title, slug, postBody, cover_image || null, makeExcerpt(postBody), calcReadTime(postBody), tags, published]
      );
      res.status(201).json({ data: { post: rows[0] }, error: null });
    } catch (err) {
      console.error("[POST /posts]", err.message);
      res.status(500).json({ data: null, error: { code: "SERVER_ERROR", message: err.message } });
    }
  }
);

// PUT /:id - edit
router.put("/:id", requireAuth,
  [
    body("title").optional().trim().isLength({ min: 3, max: 200 }).withMessage("Title must be 3-200 characters."),
    body("body").optional().trim().isLength({ min: 10 }).withMessage("Body must be at least 10 characters."),
    body("cover_image").optional().isURL().withMessage("Must be a valid URL."),
    body("tags").optional().isArray({ max: 5 }).withMessage("Max 5 tags."),
    body("published").optional().isBoolean(),
  ],
  validate,
  async (req, res) => {
    const { id } = req.params;
    const { title, body: postBody, cover_image, tags, published } = req.body;
    try {
      const { rows: existing } = await query("SELECT * FROM posts WHERE id = $1", [id]);
      if (!existing.length) return res.status(404).json({ data: null, error: { code: "NOT_FOUND", message: "Post not found." } });
      if (existing[0].author_id !== req.user.id) return res.status(403).json({ data: null, error: { code: "FORBIDDEN", message: "You can only edit your own posts." } });
      const newBody = postBody ?? existing[0].body;
      const newTitle = title ?? existing[0].title;
      let slug = existing[0].slug;
      if (title && title !== existing[0].title) slug = await uniqueSlug(slugify(title), Number(id));
      const { rows } = await query(
        `UPDATE posts SET title=$1, slug=$2, body=$3, cover_image=COALESCE($4, cover_image),
         excerpt=$5, read_time=$6, tags=COALESCE($7, tags), published=COALESCE($8, published)
         WHERE id=$9 RETURNING *`,
        [newTitle, slug, newBody, cover_image ?? null, makeExcerpt(newBody), calcReadTime(newBody), tags ?? null, published ?? null, id]
      );
      res.json({ data: { post: rows[0] }, error: null });
    } catch (err) {
      console.error("[PUT /posts/:id]", err.message);
      res.status(500).json({ data: null, error: { code: "SERVER_ERROR", message: err.message } });
    }
  }
);

// DELETE /:id
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const { rows } = await query("SELECT author_id FROM posts WHERE id = $1", [req.params.id]);
    if (!rows.length) return res.status(404).json({ data: null, error: { code: "NOT_FOUND", message: "Post not found." } });
    if (rows[0].author_id !== req.user.id) return res.status(403).json({ data: null, error: { code: "FORBIDDEN", message: "You can only delete your own posts." } });
    await query("DELETE FROM posts WHERE id = $1", [req.params.id]);
    res.status(204).send();
  } catch (err) {
    console.error("[DELETE /posts/:id]", err.message);
    res.status(500).json({ data: null, error: { code: "SERVER_ERROR", message: err.message } });
  }
});

// POST /:id/like - toggle
router.post("/:id/like", requireAuth, async (req, res) => {
  const postId = Number(req.params.id);
  const userId = req.user.id;
  try {
    const { rows: postRows } = await query("SELECT id FROM posts WHERE id = $1", [postId]);
    if (!postRows.length) return res.status(404).json({ data: null, error: { code: "NOT_FOUND", message: "Post not found." } });
    const { rows: existing } = await query("SELECT 1 FROM likes WHERE user_id = $1 AND post_id = $2", [userId, postId]);
    let liked;
    if (existing.length) {
      await query("DELETE FROM likes WHERE user_id = $1 AND post_id = $2", [userId, postId]);
      liked = false;
    } else {
      await query("INSERT INTO likes (user_id, post_id) VALUES ($1, $2)", [userId, postId]);
      liked = true;
    }
    const { rows: countRows } = await query("SELECT COUNT(*)::int AS like_count FROM likes WHERE post_id = $1", [postId]);
    res.json({ data: { liked, like_count: countRows[0].like_count }, error: null });
  } catch (err) {
    console.error("[POST /posts/:id/like]", err.message);
    res.status(500).json({ data: null, error: { code: "SERVER_ERROR", message: err.message } });
  }
});

module.exports = router;
'@ | Set-Content -Encoding UTF8 server\routes\posts.js
Write-Host "wrote server/routes/posts.js"

# ─── server/routes/comments.js ──────────────────────────────────────────────
@'
const router = require("express").Router();
const { body } = require("express-validator");
const { query } = require("../db");
const { requireAuth, optionalAuth } = require("../middleware/auth");
const { validate } = require("../middleware/validate");

// GET /:postId
router.get("/:postId", optionalAuth, async (req, res) => {
  try {
    const { rows: postRows } = await query("SELECT id FROM posts WHERE id = $1", [req.params.postId]);
    if (!postRows.length) return res.status(404).json({ data: null, error: { code: "NOT_FOUND", message: "Post not found." } });
    const { rows: comments } = await query(
      `SELECT c.id, c.body, c.created_at, c.updated_at, c.author_id,
              u.username AS author_username, u.avatar_url AS author_avatar
       FROM comments c JOIN users u ON u.id = c.author_id
       WHERE c.post_id = $1 ORDER BY c.created_at ASC`,
      [req.params.postId]
    );
    res.json({ data: { comments }, error: null });
  } catch (err) {
    console.error("[GET /comments/:postId]", err.message);
    res.status(500).json({ data: null, error: { code: "SERVER_ERROR", message: err.message } });
  }
});

// POST /:postId
router.post("/:postId", requireAuth,
  [body("body").trim().isLength({ min: 1, max: 1000 }).withMessage("Comment must be 1-1000 characters.")],
  validate,
  async (req, res) => {
    try {
      const { rows: postRows } = await query("SELECT id FROM posts WHERE id = $1 AND published = TRUE", [req.params.postId]);
      if (!postRows.length) return res.status(404).json({ data: null, error: { code: "NOT_FOUND", message: "Post not found." } });
      const { rows } = await query(
        "INSERT INTO comments (post_id, author_id, body) VALUES ($1, $2, $3) RETURNING *",
        [req.params.postId, req.user.id, req.body.body]
      );
      const comment = { ...rows[0], author_username: req.user.username, author_avatar: req.user.avatar_url };
      res.status(201).json({ data: { comment }, error: null });
    } catch (err) {
      console.error("[POST /comments/:postId]", err.message);
      res.status(500).json({ data: null, error: { code: "SERVER_ERROR", message: err.message } });
    }
  }
);

// DELETE /:id
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT c.author_id, p.author_id AS post_author_id
       FROM comments c JOIN posts p ON p.id = c.post_id WHERE c.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ data: null, error: { code: "NOT_FOUND", message: "Comment not found." } });
    const { author_id, post_author_id } = rows[0];
    if (author_id !== req.user.id && post_author_id !== req.user.id) {
      return res.status(403).json({ data: null, error: { code: "FORBIDDEN", message: "You cannot delete this comment." } });
    }
    await query("DELETE FROM comments WHERE id = $1", [req.params.id]);
    res.status(204).send();
  } catch (err) {
    console.error("[DELETE /comments/:id]", err.message);
    res.status(500).json({ data: null, error: { code: "SERVER_ERROR", message: err.message } });
  }
});

module.exports = router;
'@ | Set-Content -Encoding UTF8 server\routes\comments.js
Write-Host "wrote server/routes/comments.js"

# ─── server/index.js — patch to mount new routes ────────────────────────────
@'
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const authRoutes    = require("./routes/auth");
const postRoutes    = require("./routes/posts");
const commentRoutes = require("./routes/comments");

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
  windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false,
  message: { data: null, error: { code: "RATE_LIMITED", message: "Too many requests." } },
}));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 20,
  message: { data: null, error: { code: "AUTH_RATE_LIMITED", message: "Too many auth attempts. Wait 15 minutes." } },
});

app.use("/api/v1/auth",     authLimiter, authRoutes);
app.use("/api/v1/posts",    postRoutes);
app.use("/api/v1/comments", commentRoutes);

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
    error: { code: err.code || "SERVER_ERROR", message: err.message || "Unexpected error." },
  });
});

app.listen(PORT, () => {
  console.log(`\nINK API running on port ${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health\n`);
});

module.exports = app;
'@ | Set-Content -Encoding UTF8 server\index.js
Write-Host "wrote server/index.js"

Write-Host ""
Write-Host "All Phase 2 files written!"
Write-Host "Now run: npm run dev"
Write-Host "Then test: http://localhost:3001/api/v1/posts"