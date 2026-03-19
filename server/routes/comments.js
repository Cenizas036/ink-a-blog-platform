const router = require("express").Router();
const { query } = require("../db");
const { requireAuth } = require("../middleware/auth");

// GET /api/v1/comments/:postId
router.get("/:postId", async (req, res, next) => {
  try {
    const result = await query(
      `SELECT c.*, u.username AS author_username, u.avatar_url AS author_avatar
       FROM comments c
       JOIN users u ON u.id = c.author_id
       WHERE c.post_id = $1
       ORDER BY c.created_at DESC`,
      [req.params.postId]
    );
    res.json({ data: result.rows, error: null });
  } catch (err) { next(err); }
});

// POST /api/v1/comments/:postId
router.post("/:postId", requireAuth, async (req, res, next) => {
  try {
    const { body } = req.body;
    if (!body?.trim()) return res.status(400).json({ data: null, error: { code: "VALIDATION", message: "Comment body required." } });

    const result = await query(
      `INSERT INTO comments (post_id, author_id, body) VALUES ($1,$2,$3)
       RETURNING *, (SELECT username FROM users WHERE id=$2) AS author_username`,
      [req.params.postId, req.user.id, body.trim()]
    );
    res.status(201).json({ data: result.rows[0], error: null });
  } catch (err) { next(err); }
});

// DELETE /api/v1/comments/:id
router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const comment = await query(
      `SELECT c.*, p.author_id AS post_author_id FROM comments c
       JOIN posts p ON p.id = c.post_id WHERE c.id = $1`,
      [req.params.id]
    );
    if (!comment.rows[0]) return res.status(404).json({ data: null, error: { code: "NOT_FOUND", message: "Comment not found." } });
    const c = comment.rows[0];
    if (c.author_id !== req.user.id && c.post_author_id !== req.user.id) {
      return res.status(403).json({ data: null, error: { code: "FORBIDDEN", message: "Not allowed." } });
    }
    await query("DELETE FROM comments WHERE id = $1", [req.params.id]);
    res.json({ data: { message: "Comment deleted." }, error: null });
  } catch (err) { next(err); }
});

module.exports = router;