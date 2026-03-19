const router = require("express").Router();
const { query, withTransaction } = require("../db");
const { requireAuth, optionalAuth } = require("../middleware/auth");
const slugify = require("slugify");

// GET /api/v1/posts — paginated feed
router.get("/", optionalAuth, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 10);
    const offset = (page - 1) * limit;
    const { search, tag } = req.query;

    let where = "WHERE p.published = true";
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      where += ` AND (p.title ILIKE $${params.length} OR p.body ILIKE $${params.length})`;
    }
    if (tag) {
      params.push(tag);
      where += ` AND $${params.length} = ANY(p.tags)`;
    }

    params.push(limit, offset);
    const result = await query(
      `SELECT p.*, u.username AS author_username, u.avatar_url AS author_avatar,
              COUNT(l.user_id)::int AS like_count
       FROM posts p
       JOIN users u ON u.id = p.author_id
       LEFT JOIN likes l ON l.post_id = p.id
       ${where}
       GROUP BY p.id, u.username, u.avatar_url
       ORDER BY p.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({ data: { posts: result.rows }, error: null });
  } catch (err) { next(err); }
});

// GET /api/v1/posts/user/:username
router.get("/user/:username", async (req, res, next) => {
  try {
    const result = await query(
      `SELECT p.*, u.username AS author_username,
              COUNT(l.user_id)::int AS like_count
       FROM posts p
       JOIN users u ON u.id = p.author_id
       LEFT JOIN likes l ON l.post_id = p.id
       WHERE u.username = $1
       GROUP BY p.id, u.username
       ORDER BY p.created_at DESC`,
      [req.params.username]
    );
    res.json({ data: result.rows, error: null });
  } catch (err) { next(err); }
});

// GET /api/v1/posts/:slug
router.get("/:slug", optionalAuth, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT p.*, u.username AS author_username, u.avatar_url AS author_avatar, u.bio AS author_bio,
              COUNT(DISTINCT l.user_id)::int AS like_count,
              BOOL_OR(l.user_id = $2) AS user_liked
       FROM posts p
       JOIN users u ON u.id = p.author_id
       LEFT JOIN likes l ON l.post_id = p.id
       WHERE p.slug = $1 AND p.published = true
       GROUP BY p.id, u.username, u.avatar_url, u.bio`,
      [req.params.slug, req.user?.id || null]
    );
    if (!result.rows[0]) return res.status(404).json({ data: null, error: { code: "NOT_FOUND", message: "Post not found." } });
    res.json({ data: result.rows[0], error: null });
  } catch (err) { next(err); }
});

// POST /api/v1/posts
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { title, body, tags = [], cover_image, excerpt, published = true } = req.body;
    if (!title || !body) return res.status(400).json({ data: null, error: { code: "VALIDATION", message: "Title and body required." } });

    const words = body.split(/\s+/).length;
    const read_time = Math.max(1, Math.round(words / 200));
    let slug = slugify(title, { lower: true, strict: true });
    const existing = await query("SELECT id FROM posts WHERE slug = $1", [slug]);
    if (existing.rows.length) slug = `${slug}-${Date.now()}`;

    const result = await query(
      `INSERT INTO posts (author_id, title, slug, body, tags, cover_image, excerpt, read_time, published)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.user.id, title, slug, body, tags, cover_image || null, excerpt || body.slice(0, 200), read_time, published]
    );
    res.status(201).json({ data: result.rows[0], error: null });
  } catch (err) { next(err); }
});

// PUT /api/v1/posts/:id
router.put("/:id", requireAuth, async (req, res, next) => {
  try {
    const post = await query("SELECT * FROM posts WHERE id = $1", [req.params.id]);
    if (!post.rows[0]) return res.status(404).json({ data: null, error: { code: "NOT_FOUND", message: "Post not found." } });
    if (post.rows[0].author_id !== req.user.id) return res.status(403).json({ data: null, error: { code: "FORBIDDEN", message: "Not your post." } });

    const { title, body, tags, cover_image, excerpt, published } = req.body;
    const result = await query(
      `UPDATE posts SET title=$1, body=$2, tags=$3, cover_image=$4, excerpt=$5, published=$6, updated_at=NOW()
       WHERE id=$7 RETURNING *`,
      [title, body, tags, cover_image || null, excerpt || body.slice(0, 200), published, req.params.id]
    );
    res.json({ data: result.rows[0], error: null });
  } catch (err) { next(err); }
});

// DELETE /api/v1/posts/:id
router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const post = await query("SELECT * FROM posts WHERE id = $1", [req.params.id]);
    if (!post.rows[0]) return res.status(404).json({ data: null, error: { code: "NOT_FOUND", message: "Post not found." } });
    if (post.rows[0].author_id !== req.user.id) return res.status(403).json({ data: null, error: { code: "FORBIDDEN", message: "Not your post." } });
    await query("DELETE FROM posts WHERE id = $1", [req.params.id]);
    res.json({ data: { message: "Post deleted." }, error: null });
  } catch (err) { next(err); }
});

// POST /api/v1/posts/:id/like
router.post("/:id/like", requireAuth, async (req, res, next) => {
  try {
    const existing = await query("SELECT * FROM likes WHERE user_id=$1 AND post_id=$2", [req.user.id, req.params.id]);
    if (existing.rows.length) {
      await query("DELETE FROM likes WHERE user_id=$1 AND post_id=$2", [req.user.id, req.params.id]);
    } else {
      await query("INSERT INTO likes (user_id, post_id) VALUES ($1,$2)", [req.user.id, req.params.id]);
    }
    const count = await query("SELECT COUNT(*)::int AS like_count FROM likes WHERE post_id=$1", [req.params.id]);
    res.json({ data: { liked: !existing.rows.length, like_count: count.rows[0].like_count }, error: null });
  } catch (err) { next(err); }
});

module.exports = router;