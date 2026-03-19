# INK — Write What Matters

> A full-stack blogging platform with a dark editorial aesthetic. Think Medium, but moodier.

🌐 **Live:** [ink-a-blog-platform-g157.vercel.app](https://ink-a-blog-platform-g157.vercel.app)  
⚙️ **API:** [ink-a-blog-platform-production.up.railway.app/health](https://ink-a-blog-platform-production.up.railway.app/health)

---

## Preview

### Feed Page
![INK Feed](https://res.cloudinary.com/do0dfbjqs/image/upload/v1773864434/ChatGPT_Image_Mar_19_2026_12_40_16_AM_a8h6kk.png)

### Library Background (all other pages)
![INK Library](https://res.cloudinary.com/do0dfbjqs/image/upload/v1773864434/ChatGPT_Image_Mar_19_2026_01_29_24_AM_zj6oya.png)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js + Express |
| Database | PostgreSQL (pg pool) |
| Auth | JWT + bcryptjs |
| Frontend | React + Vite |
| Animations | Framer Motion |
| Markdown | react-markdown + remark-gfm |
| State | Zustand |
| HTTP Client | Axios |
| Image Hosting | Cloudinary |
| Backend Deploy | Railway |
| Frontend Deploy | Vercel |

---

## Features

- 🌑 **Dark editorial UI** — Playfair Display headings, IBM Plex body, amber gold accent
- 🔐 **Full auth** — register, login, JWT-protected routes, animated login success overlay
- ✍️ **Markdown editor** — write and preview posts with live tab switching
- 🖼️ **Cloudinary image upload** — cover images and profile avatars
- ❤️ **Likes** — optimistic UI, instant update without page reload
- 💬 **Comments** — add and delete in real time
- 🏷️ **Tag filtering** — click any tag to filter the feed
- ♾️ **Infinite scroll** — IntersectionObserver based pagination
- 🔍 **Search** — full-text search across titles and bodies
- 👤 **Profile pages** — stats, bio, avatar upload, all user posts
- 🔔 **Toast notifications** — success, error, info
- 📚 **Library background** — immersive dark bookshelf aesthetic
- 🪟 **Glass morphism cards** — backdrop blur throughout
- 🚫 **Custom 404 page**

---

## Project Structure

```
ink/
├── server/
│   ├── db/
│   │   ├── index.js        # pg Pool singleton
│   │   ├── migrate.js      # CREATE TABLE statements
│   │   └── seed.js         # demo users + posts
│   ├── middleware/
│   │   ├── auth.js         # requireAuth + optionalAuth
│   │   └── validate.js     # express-validator handler
│   ├── routes/
│   │   ├── auth.js         # register, login, /me, PATCH /me
│   │   ├── posts.js        # full CRUD + likes + feed + search
│   │   └── comments.js     # list, create, delete
│   └── index.js            # Express app entry point
│
└── client/
    └── src/
        ├── api/index.js            # Axios instance + all API calls
        ├── store/authStore.js      # Zustand auth state
        ├── components/
        │   ├── Navbar.jsx          # Sticky nav with dropdown profile menu
        │   ├── PostCard.jsx        # Animated feed card
        │   ├── Toast.jsx           # Toast notification system
        │   └── LoginSuccess.jsx    # Login success overlay animation
        └── pages/
            ├── Feed.jsx            # Paginated grid, search, tag filter, infinite scroll
            ├── PostPage.jsx        # Markdown render, likes, comments
            ├── Write.jsx           # Markdown editor + preview + Cloudinary upload
            ├── Auth.jsx            # Login + register with animation
            ├── Profile.jsx         # User posts, stats, bio, avatar upload
            └── NotFound.jsx        # Custom 404
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+

### Setup

```bash
# Clone the repo
git clone https://github.com/Cenizas036/ink-a-blog-platform.git
cd ink-a-blog-platform

# Install backend dependencies
npm install

# Install frontend dependencies
cd client && npm install --legacy-peer-deps && cd ..

# Create environment file
cp .env.example .env
# Fill in your DATABASE_URL, JWT_SECRET etc.

# Run migrations and seed demo data
npm run db:migrate
npm run db:seed
```

### Run locally

```bash
# Terminal 1 — backend (port 3001)
npm run dev

# Terminal 2 — frontend (port 5173)
cd client && npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

**Test credentials:**
```
elara@ink.dev / password123
kaito@ink.dev / password123
```

---

## Environment Variables

### Backend (`/.env`)

```env
DATABASE_URL=postgresql://user:password@localhost:5432/ink
JWT_SECRET=your_super_secret_key
PORT=3001
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

### Frontend (`/client/.env`)

```env
VITE_API_URL=/api/v1
VITE_CLOUDINARY_CLOUD=your_cloud_name
VITE_CLOUDINARY_PRESET=ink_uploads
```

---

## API Reference

```
BASE: /api/v1/

AUTH
  POST   /auth/register        → { user, token }
  POST   /auth/login           → { user, token }
  GET    /auth/me              🔒 → { user }
  PATCH  /auth/me              🔒 → { user }

POSTS
  GET    /posts                → paginated feed (?page, ?limit, ?search, ?tag)
  GET    /posts/:slug          → single post + like count + author
  GET    /posts/user/:username → all posts by user
  POST   /posts                🔒 → create post
  PUT    /posts/:id            🔒 → edit post (owner only)
  DELETE /posts/:id            🔒 → delete post (owner only)
  POST   /posts/:id/like       🔒 → toggle like

COMMENTS
  GET    /comments/:postId     → all comments
  POST   /comments/:postId     🔒 → add comment
  DELETE /comments/:id         🔒 → delete comment

HEALTH
  GET    /health               → { status: "ok", timestamp }
```

All responses use a consistent envelope:
```json
{ "data": { ... }, "error": null }
{ "data": null, "error": { "code": "...", "message": "..." } }
```

---

## Deployment

### Backend → Railway

| Setting | Value |
|---|---|
| Service | `ink-a-blog-platform` |
| Database | PostgreSQL plugin |
| Start Command | `npm run db:migrate && node server/index.js` |
| Live URL | `https://ink-a-blog-platform-production.up.railway.app` |

**Environment variables on Railway:**
```
NODE_ENV=production
JWT_SECRET=<your secret>
CLIENT_URL=https://ink-a-blog-platform-g157.vercel.app
DATABASE_URL=<auto-injected by Railway Postgres plugin>
```

### Frontend → Vercel

| Setting | Value |
|---|---|
| Root Directory | `client` |
| Install Command | `npm install --legacy-peer-deps` |
| Build Command | `node ./node_modules/vite/bin/vite.js build` |
| Live URL | `https://ink-a-blog-platform-g157.vercel.app` |

**Environment variables on Vercel:**
```
VITE_API_URL=https://ink-a-blog-platform-production.up.railway.app/api/v1
VITE_CLOUDINARY_CLOUD=do0dfbjqs
VITE_CLOUDINARY_PRESET=ink_uploads
```

---

## Design System

| Token | Value |
|---|---|
| Background | `#080808` |
| Card | `rgba(18,18,18,0.88)` |
| Text | `#f0ebe0` (warm cream) |
| Accent | `#c9a84c` (amber gold) |
| Display font | Playfair Display |
| Body font | IBM Plex Sans |
| Mono font | IBM Plex Mono |

---

Built by [Cenizas036](https://github.com/Cenizas036)
