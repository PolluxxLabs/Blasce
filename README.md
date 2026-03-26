# Blasce

A full-stack movie and TV streaming discovery site with a premium dark cinematic UI, built with Go and React.

![Blasce Hero](https://image.tmdb.org/t/p/original/ilRyazdMJwN3HJLZ6lOHrGFgv7t.jpg)

---

## Features

- **Auto-rotating hero carousel** — cycles through featured titles with crossfade transitions, progress indicators, and pause-on-hover
- **Browse & filter** — filter content by type (movie / TV) and genre; live search overlay with trending preview
- **Detail pages** — embedded YouTube trailers, IMDB & Rotten Tomatoes scores, genre chips, cast grid, collapsible season/episode accordion, "More Like This" carousel
- **Watchlist** — saved to the database per authenticated user; guests see a prompt to sign up
- **JWT authentication** — signup / login with bcrypt password hashing and 30-day tokens
- **58-title library** — curated movies and TV shows with full metadata, scores, and genre links
- **Skeleton loaders** — smooth loading states across all carousels and grids
- **Responsive dark UI** — Tailwind CSS, Framer Motion animations, Embla Carousel

---

## Tech Stack

| Layer | Technology |
|---|---|
| **API server** | Go 1.25, [chi](https://github.com/go-chi/chi) router |
| **Database** | PostgreSQL |
| **Auth** | JWT (`golang-jwt/jwt`), bcrypt (`golang.org/x/crypto`) |
| **Frontend** | React 19, Vite, TypeScript |
| **Styling** | Tailwind CSS v4 |
| **Animation** | Framer Motion |
| **Data fetching** | TanStack React Query |
| **Routing** | Wouter |
| **Carousel** | Embla Carousel |
| **Monorepo** | pnpm workspaces |
| **API codegen** | Orval (from OpenAPI spec) |

---

## Project Structure

```
blasce/
├── artifacts/
│   ├── api-server/          # Go API server
│   │   ├── main.go
│   │   └── internal/
│   │       ├── db/          # PostgreSQL connection
│   │       ├── handlers/    # Route handlers (content, auth, watchlist)
│   │       ├── middleware/  # JWT auth middleware
│   │       └── models/      # Shared Go types
│   └── blasce/              # React + Vite frontend
│       └── src/
│           ├── components/  # UI components (Navbar, ContentCard, etc.)
│           ├── context/     # AuthContext (JWT state)
│           ├── hooks/       # useWatchlist, custom hooks
│           ├── pages/       # Home, Browse, Detail, Watchlist, Auth pages
│           └── lib/         # Utilities
├── lib/
│   ├── api-spec/            # OpenAPI spec + Orval config
│   ├── api-client-react/    # Generated React Query hooks
│   ├── api-zod/             # Generated Zod schemas
│   └── db/                  # Drizzle ORM schema
├── scripts/src/
│   ├── seed.ts              # Database seed script
│   └── scrape.py            # IMDB + RT score scraper utility
├── .env.example
└── README.md
```

---

## Database Schema

| Table | Purpose |
|---|---|
| `content` | Movies and TV shows (title, type, scores, metadata) |
| `genres` | Genre list (action, drama, sci-fi, etc.) |
| `content_genres` | Many-to-many: content ↔ genres |
| `episodes` | TV episode list per season |
| `cast` | Cast members per title |
| `users` | Registered accounts (email, bcrypt hash, display name) |
| `watchlist` | Saved titles per user (FK to `users`) |

---

## Getting Started

### Prerequisites

- **Go** ≥ 1.22
- **Node.js** ≥ 20 and **pnpm** ≥ 9
- **PostgreSQL** ≥ 15

### 1. Clone and install

```bash
git clone https://github.com/your-username/blasce.git
cd blasce
pnpm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
# Edit .env with your real DATABASE_URL and JWT_SECRET
```

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Long random string for signing JWT tokens |
| `PORT` | Port the Go API server listens on (default `8080`) |

### 3. Set up the database

```bash
# Create tables
pnpm --filter @workspace/db run db:push

# Seed initial content (58 movies & TV shows)
# WARNING: truncates all content tables — only run once on a fresh database
pnpm --filter @workspace/scripts run seed
```

### 4. Run the development servers

**API server** (Go):
```bash
cd artifacts/api-server
go run .
```

**Frontend** (React + Vite):
```bash
pnpm --filter @workspace/blasce run dev
```

The frontend runs on `http://localhost:5173` and proxies API requests to the Go server.

---

## API Endpoints

### Content
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/content` | List content (filter by `type`, `genre`, `search`, `limit`, `offset`) |
| `GET` | `/api/content/:id` | Get content detail (with cast, episodes, genres) |
| `GET` | `/api/content/trending/now` | Trending titles |
| `GET` | `/api/content/top-rated` | Highest IMDB-scored titles |
| `GET` | `/api/content/new-releases` | Most recent releases |
| `GET` | `/api/content/featured/hero` | Single featured hero item |
| `GET` | `/api/genres` | All genre slugs and names |

### Auth
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/signup` | Register (returns JWT) |
| `POST` | `/api/auth/login` | Login (returns JWT) |
| `GET` | `/api/auth/me` | Get current user (requires `Authorization: Bearer <token>`) |

### Watchlist (auth required)
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/watchlist` | Get authenticated user's watchlist |
| `POST` | `/api/watchlist` | Add a title (`{ "contentId": 1 }`) |
| `DELETE` | `/api/watchlist/:contentId` | Remove a title |

---

## Score Scraper

`scripts/src/scrape.py` is a utility that populates `imdb_score` and `rt_score` in the database using public data sources:

- **IMDB** — official rating datasets from [datasets.imdbws.com](https://datasets.imdbws.com)
- **Rotten Tomatoes** — Tomatometer via [Scrapling](https://github.com/D4Vinci/Scrapling)

```bash
pip install scrapling psycopg2-binary
python scripts/src/scrape.py
```

Requires `DATABASE_URL` in the environment.

---

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for setup instructions, branch naming conventions, commit message format, code style guidelines, and the pull request process.

---

## License

MIT — see [LICENSE](./LICENSE) for details.
