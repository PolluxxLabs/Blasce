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
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite, Tailwind CSS, TanStack React Query, Wouter, Framer Motion, Embla Carousel

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server (content, genres, watchlist routes)
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

- **Homepage**: Rotating hero banner with featured content, trending now carousel, genre rows
- **Browse page**: Filter by type (movie/TV), genre, search bar, full grid
- **Detail page**: Cinematic backdrop, trailer embed, cast grid, episode list (TV shows by season), watchlist button
- **Watchlist page**: Saved content grid, remove items
- **Anonymous sessions**: UUID-based session stored in localStorage

## Database Schema

- `content` — movies and TV shows
- `genres` — genre tags (14 genres)
- `content_genres` — many-to-many join
- `cast` — cast members per content
- `episodes` — TV episodes per season
- `watchlist` — user-session watchlist entries

## Re-seeding

```bash
pnpm --filter @workspace/scripts run seed
```

## API Routes

- `GET /api/content` — list with filters: ?type, ?genre, ?search, ?featured, ?limit, ?offset
- `GET /api/content/:id` — full detail with cast + episodes
- `GET /api/content/featured/hero` — random featured item
- `GET /api/content/trending/now` — trending items
- `GET /api/genres` — all genres
- `GET /api/watchlist?sessionId=` — user watchlist
- `POST /api/watchlist` — add to watchlist
- `DELETE /api/watchlist/:contentId?sessionId=` — remove from watchlist

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API client and Zod schemas
