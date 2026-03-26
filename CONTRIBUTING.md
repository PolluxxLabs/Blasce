# Contributing to Blasce

Thank you for your interest in contributing! This document covers everything you need to get started.

---

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Making Changes](#making-changes)
- [Code Style](#code-style)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Reporting Issues](#reporting-issues)

---

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/your-username/blasce.git
   cd blasce
   ```
3. **Add the upstream remote** so you can pull future changes:
   ```bash
   git remote add upstream https://github.com/original-owner/blasce.git
   ```

---

## Development Setup

### Prerequisites

- **Go** ≥ 1.22
- **Node.js** ≥ 20
- **pnpm** ≥ 9
- **PostgreSQL** ≥ 15

### Install dependencies

```bash
pnpm install
```

### Configure environment

```bash
cp .env.example .env
# Fill in DATABASE_URL, JWT_SECRET, and PORT
```

### Set up the database

```bash
# Push schema
pnpm --filter @workspace/db run db:push

# Seed content (only on a fresh database — this truncates tables)
pnpm --filter @workspace/scripts run seed
```

### Run the development servers

In two separate terminals:

```bash
# Terminal 1 — Go API server
cd artifacts/api-server && go run .

# Terminal 2 — React frontend
pnpm --filter @workspace/blasce run dev
```

---

## Project Structure

```
blasce/
├── artifacts/
│   ├── api-server/       # Go API (chi router, JWT auth, PostgreSQL)
│   └── blasce/           # React + Vite frontend
├── lib/
│   ├── api-spec/         # OpenAPI spec (source of truth for the API)
│   ├── api-client-react/ # Generated React Query hooks (do not edit manually)
│   ├── api-zod/          # Generated Zod schemas (do not edit manually)
│   └── db/               # Drizzle ORM schema
└── scripts/src/          # Seed and scraper utilities
```

### Key conventions

- **API changes** — update `lib/api-spec/openapi.yaml`, then run `pnpm --filter @workspace/api-spec run codegen` to regenerate the client
- **New content** — add via direct SQL (`INSERT INTO content ...`) followed by genre links in `content_genres`; do **not** rerun the seed script on an existing database
- **Watchlist** — requires a valid JWT `Authorization: Bearer <token>` header; anonymous access returns 401
- **Cast table** — the SQL table is named `"cast"` (reserved keyword) and must always be quoted in queries

---

## Making Changes

### Branch naming

| Type | Pattern | Example |
|---|---|---|
| Feature | `feature/short-description` | `feature/search-filters` |
| Bug fix | `fix/short-description` | `fix/hero-carousel-pause` |
| Docs | `docs/short-description` | `docs/api-reference` |
| Refactor | `refactor/short-description` | `refactor/watchlist-hooks` |

### Workflow

```bash
# Sync with upstream before starting
git fetch upstream
git rebase upstream/main

# Create your branch
git checkout -b feature/your-feature

# Make changes, then commit
git add .
git commit -m "feat: short description of what changed"
```

### Commit message format

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <short summary>

[optional body]
```

Common types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

---

## Code Style

### Go (API server)

- Standard `gofmt` formatting — run `gofmt -w .` before committing
- Keep handlers thin; move reusable logic into helpers
- Always return JSON errors via `writeError(w, status, message)` — never write raw strings

### TypeScript / React (frontend)

- Prettier and ESLint are configured — run `pnpm --filter @workspace/blasce run lint` to check
- Components live in `src/components/`; pages in `src/pages/`
- Custom hooks go in `src/hooks/`
- Use Tailwind utility classes; avoid inline styles

### Database

- Schema changes go through Drizzle (`lib/db/schema.ts`) — never write raw `ALTER TABLE` migrations
- New content is added via direct `INSERT` SQL only — the seed script truncates data and should not be rerun

---

## Submitting a Pull Request

1. Push your branch to your fork:
   ```bash
   git push origin feature/your-feature
   ```
2. Open a pull request against the `main` branch of the upstream repo
3. Fill in the PR description:
   - **What** changed and **why**
   - Screenshots or recordings for UI changes
   - Any breaking changes or migration steps
4. Ensure there are no console errors and the app builds cleanly

---

## Reporting Issues

When filing a bug report, please include:

- A clear description of the problem
- Steps to reproduce
- Expected vs. actual behaviour
- Browser/OS/Go version if relevant
- Relevant logs or screenshots

For feature requests, describe the use case and why it would be valuable to other users.

---

## Questions

Open a [GitHub Discussion](../../discussions) or file an issue tagged `question`.
