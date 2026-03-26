# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Project: Blasce — Movie & TV Streaming Site

Blasce is a full-stack streaming platform with a cinematic dark UI, browsing, searching, detailed content pages, and a watchlist.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Go + chi router (migrated from Express)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite, Tailwind CSS, TanStack React Query, Wouter, Framer Motion, Embla Carousel

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Go API server (chi router, content, genres, watchlist routes)
│   └── blasce/             # Blasce frontend (React + Vite, dark streaming UI)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/
│   └── src/seed.ts         # Database seed with 16 movies/TV shows
```

## Blasce Features

- **Homepage**: Auto-rotating hero carousel (6 trending items, 9s crossfade, dot progress indicators, prev/next nav, pause-on-hover), Trending Now, Top Rated, New Releases carousels, curated genre rows (Drama, Crime, Sci-Fi, Comedy, Action, Fantasy, Horror, Animation)
- **Browse page**: Filter by type (movie/TV), genre chips, search bar, sort dropdown (Relevance/Newest/Oldest/Top Rated/A–Z), full responsive grid
- **Detail page**: Cinematic backdrop, trailer embed, IMDB + RT score badges, cast grid, episode list (TV shows by season), watchlist button, Watch Now stream player
- **Watchlist page**: Saved content grid, remove items (JWT-authenticated)
- **Auth**: JWT-based signup/login/me; accounts stored in users table; token in localStorage
- **Profile/Account page** (`/profile`): Update display name, change password, sign out; "Account Settings" link in navbar dropdown

## Database Schema

- `content` — movies and TV shows
- `genres` — genre tags (14 genres)
- `content_genres` — many-to-many join
- `cast` — cast members per content
- `episodes` — TV episodes per season
- `watchlist` — user-session watchlist entries
- `users` — registered accounts (id UUID, email UNIQUE, password_hash, display_name, created_at)

## Content Library

34 titles in the database (all unique, no duplicates). Add new content via direct SQL INSERT (do NOT rerun seed — it truncates everything).
Stream URLs sourced from moviebox.ph (5 confirmed: IDs 5, 7, 11, 12, 13).
All 34 titles have RT scores, IMDB scores, trailer YouTube IDs, and correct MPAA/TV ratings.
Horror genre: Get Out (41), Hereditary (42), A Quiet Place (43) + Stranger Things, Wednesday.
Fantasy genre: Game of Thrones, House of the Dragon, Stranger Things, Wednesday, Spirited Away, Encanto.
TV shows (11 total): Breaking Bad, Stranger Things, The Last of Us, House of the Dragon, The Bear, Succession, Wednesday, Black Mirror, Game of Thrones, The Crown, Ted Lasso.

## API Routes (Go)

- `GET /api/content` — list with filters: ?type, ?genre, ?search, ?featured, ?sort (newest/oldest/rating/title), ?limit, ?offset
- `GET /api/content/:id` — full detail with cast + episodes
- `GET /api/content/featured/hero` — random featured item
- `GET /api/content/trending/now` — trending items (ordered by trending_rank)
- `GET /api/content/top-rated` — sorted by IMDB score desc
- `GET /api/content/new-releases` — sorted by release year desc
- `GET /api/genres` — all genres
- `POST /api/auth/signup` — create account {displayName, email, password} → {token, id, email, displayName, createdAt}
- `POST /api/auth/login` — login {email, password} → {token, id, email, displayName, createdAt}
- `GET /api/auth/me` — verify JWT, returns user info
- `PUT /api/auth/me` — update profile {displayName?, password?} → {token, id, email, displayName, createdAt}
- `GET /api/watchlist` — JWT-authenticated user watchlist
- `POST /api/watchlist` — JWT-authenticated, add to watchlist
- `DELETE /api/watchlist/:contentId` — JWT-authenticated, remove from watchlist

## Critical Notes

- Go `cast` SQL table must be quoted as `"cast"` (reserved keyword in PostgreSQL)
- `rt_score` column is in content table (integer, nullable)
- Watchlist is JWT-authenticated (token from localStorage `blasce_token`)
- Genre IDs: action=1, adventure=2, animation=3, comedy=4, crime=5, documentary=6, drama=7, fantasy=8, horror=9, mystery=10, romance=11, sci-fi=12, thriller=13, western=14
- `setAuthTokenGetter(() => localStorage.getItem("blasce_token"))` wired in main.tsx
- `AuthContext` exposes: signup, login, logout, updateUserProfile

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API client and Zod schemas
