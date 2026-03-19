# Run from C:\Users\KIIT0001\ink\
@'
require("dotenv").config();
const bcrypt = require("bcryptjs");
const { pool, query } = require("./index");

const USERS = [
  { username: "elara_writes", email: "elara@ink.dev", password: "password123", bio: "Novelist. Coffee addict. Oxford comma defender.", avatar_url: "https://i.pravatar.cc/150?u=elara" },
  { username: "kaito_dev",    email: "kaito@ink.dev", password: "password123", bio: "Building things on the web. Writing about it here.", avatar_url: "https://i.pravatar.cc/150?u=kaito" },
];

const POSTS = [
  {
    title: "Why Markdown Is the Writer's Best Friend",
    body: `# Why Markdown Is the Writer's Best Friend

Writing shouldn't require fighting your tools. That's the philosophy behind **Markdown** — a lightweight markup language that gets out of your way.

## The Problem with Rich Text Editors

Rich text editors introduce invisible formatting chaos. You paste text and suddenly your font is wrong, your spacing is off.

Markdown solves this by making formatting *explicit and readable*. A \`#\` is a heading. \`**bold**\` is bold. That's it.

## A Quick Demo

\`\`\`markdown
# Heading 1
**bold** and *italic*
- list item one
- list item two
> A blockquote
\`\`\`

## The Writer's Workflow

1. Open any plain text editor
2. Write in Markdown
3. Export anywhere — GitHub, blogs, documentation

The portability is the point. Your writing is just text, not locked in a proprietary format.

---

*Start with the basics. You'll never go back.*`,
    cover_image: "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=1200",
    tags: ["writing", "markdown", "productivity"],
  },
  {
    title: "The Architecture of a Clean REST API",
    body: `# The Architecture of a Clean REST API

A REST API is a contract between your server and its clients. Clarity is everything.

## The Principles

**1. Resources, not actions**

\`GET /posts\` is correct. \`GET /getPosts\` is not.

Your URL identifies *what*, your HTTP method identifies *how*.

**2. Consistent response shapes**

Every endpoint should return the same envelope:

\`\`\`json
{ "data": { ... }, "error": null }
\`\`\`

**3. Version from day one**

\`/api/v1/posts\` — not because you'll break it, but because you *might*.

## Status Codes Actually Matter

- 201 — Created a resource
- 204 — No content to return
- 400 — Bad input
- 401 — Not authenticated
- 403 — Authenticated but forbidden
- 404 — Not found

Most APIs only use 200 and 500. Don't be most APIs.

---

*The best API makes its consumers feel clever for using it.*`,
    cover_image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200",
    tags: ["api", "backend", "architecture"],
  },
];

const slugify = (text) =>
  text.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");

const calcReadTime = (body) => Math.max(1, Math.ceil(body.trim().split(/\s+/).length / 200));

const makeExcerpt = (body) =>
  body.replace(/#{1,6}\s/g, "").replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/[*_`>~\-\[\]()]/g, "").replace(/\n+/g, " ").trim().slice(0, 160) + "...";

(async () => {
  const client = await pool.connect();
  try {
    console.log("Seeding database...");
    await client.query("DELETE FROM comments");
    await client.query("DELETE FROM likes");
    await client.query("DELETE FROM posts");
    await client.query("DELETE FROM users");

    const userIds = [];
    for (const u of USERS) {
      const hash = await bcrypt.hash(u.password, 12);
      const { rows } = await client.query(
        "INSERT INTO users (username, email, password_hash, bio, avatar_url) VALUES ($1, $2, $3, $4, $5) RETURNING id",
        [u.username, u.email, hash, u.bio, u.avatar_url]
      );
      userIds.push(rows[0].id);
      console.log(`  Created user: ${u.username}`);
    }

    const postIds = [];
    for (let i = 0; i < POSTS.length; i++) {
      const p = POSTS[i];
      const { rows } = await client.query(
        `INSERT INTO posts (author_id, title, slug, body, cover_image, excerpt, read_time, tags)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [userIds[i % userIds.length], p.title, slugify(p.title), p.body, p.cover_image, makeExcerpt(p.body), calcReadTime(p.body), p.tags]
      );
      postIds.push(rows[0].id);
      console.log(`  Created post: "${p.title}"`);
    }

    await client.query("INSERT INTO likes (user_id, post_id) VALUES ($1, $2)", [userIds[1], postIds[0]]);
    await client.query(
      "INSERT INTO comments (post_id, author_id, body) VALUES ($1, $2, $3)",
      [postIds[0], userIds[1], "This is exactly why I switched to Markdown three years ago. Great piece."]
    );

    console.log("\nSeed complete!");
    console.log("Test credentials:");
    USERS.forEach(u => console.log(`  ${u.email} / ${u.password}`));
  } catch (err) {
    console.error("Seed failed:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();
'@ | Set-Content -Encoding UTF8 server\db\seed.js
Write-Host "Done! Now run: npm run db:seed"