# INK — Write What Matters

A full-stack blogging platform built with a dark editorial aesthetic. Think Medium, but moodier.

![INK Feed](https://res.cloudinary.com/do0dfbjqs/image/upload/v1773864434/ChatGPT_Image_Mar_19_2026_12_40_16_AM_a8h6kk.png)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js + Express |
| Database | PostgreSQL (pg pool) |
| Auth | JWT + bcrypt |
| Frontend | React + Vite |
| Animations | Framer Motion |
| Markdown | react-markdown + remark-gfm |
| State | Zustand |
| HTTP Client | Axios |
| Image Hosting | Cloudinary |
| Deploy | Railway (backend) + Vercel (frontend) |

---

## Features

- **Dark editorial UI** — Playfair Display headings, IBM Plex body, amber gold accent
- **Full auth** — register, login, JWT-protected routes, login success animation
- **Markdown editor** — write and preview posts with live tab switching
- **Cloudinary image upload** — cover images and profile avatars
- **Likes** — optimistic UI, no page reload
- **Comments** — real-time add/delete
- **Tag filtering** — click any tag to filter the feed
- **Infinite scroll** — IntersectionObserver based
- **Search** — full-text search across titles and bodies
- **Profile pages** — stats, bio, avatar, all user posts
- **Toast notifications** — success, error, info
- **404 page** — custom not found
- **Library background** — immersive dark bookshelf aesthetic
- **Glass morphism cards** — backdrop blur throughout

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
│   │   ├── auth.js         # register, login, /me
│   │   ├── posts.js        # full CRUD + likes + feed
│   │   └── comments.js     # list, create, delete
│   └── index.js            # Express app entry point
│
└── client/
    └── src/
        ├── api/index.js        # Axios instance + all API calls
        ├── store/authStore.js  # Zustand auth state
        ├── components/
        │   ├── Navbar.jsx
        │   ├── PostCard.jsx
        │   ├── Toast.jsx
        │   └── LoginSuccess.jsx
        └── pages/
            ├── Feed.jsx
            ├── PostPage.jsx
            ├── Write.jsx
            ├── Auth.jsx
            ├── Profile.jsx
            └── NotFound.jsx
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+

### Setup

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/ink.git
cd ink

# Install backend dependencies
npm install

# Install frontend dependencies
cd client && npm install && cd ..

# Create environment file
cp .env.example .env
# Fill in your DATABASE_URL, JWT_SECRET, etc.

# Run migrations and seed data
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
```

---

## Deployment

### Backend → Railway

1. Push repo to GitHub
2. Railway → New Project → Deploy from GitHub
3. Add PostgreSQL plugin
4. Set env vars: `NODE_ENV`, `JWT_SECRET`, `CLIENT_URL`
5. Run `npm run db:migrate` in Railway shell

### Frontend → Vercel

1. Vercel → New Project → Import repo
2. Set root directory to `client`
3. Set env vars: `VITE_API_URL`, `VITE_CLOUDINARY_CLOUD`, `VITE_CLOUDINARY_PRESET`
4. Deploy

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

Built by [Sanket](https://github.com/Cenizas036)
