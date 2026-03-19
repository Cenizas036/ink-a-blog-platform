-- Users
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Posts
CREATE TABLE posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  author_id INTEGER REFERENCES users(id),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,       -- SEO-friendly URL
  body TEXT NOT NULL,              -- Raw markdown
  cover_image TEXT,
  read_time INTEGER,               -- Auto-calculated
  published INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Likes (many-to-many)
CREATE TABLE likes (
  user_id INTEGER REFERENCES users(id),
  post_id INTEGER REFERENCES posts(id),
  PRIMARY KEY (user_id, post_id)
);

-- Comments
CREATE TABLE comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER REFERENCES posts(id),
  author_id INTEGER REFERENCES users(id),
  body TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

### 🔐 API Design (`/api/v1/`)
```
AUTH
  POST   /auth/register          → { token, user }
  POST   /auth/login             → { token, user }
  GET    /auth/me                → { user }          🔒

POSTS
  GET    /posts                  → paginated feed
  GET    /posts/:slug            → single post + author
  POST   /posts                  → create            🔒
  PUT    /posts/:id              → edit              🔒 (owner)
  DELETE /posts/:id              → delete            🔒 (owner)
  POST   /posts/:id/like         → toggle like       🔒
  GET    /posts/user/:username   → user's posts

COMMENTS
  GET    /posts/:id/comments     → comment thread
  POST   /posts/:id/comments     → add comment       🔒
  DELETE /comments/:id           → delete            🔒 (owner)