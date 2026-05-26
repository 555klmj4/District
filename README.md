# District

Your personal restaurant intelligence system. Bookmark restaurants from Google Maps, OpenRice, and Yelp links, then get AI-powered recommendations tailored to your taste.

## Features

- **URL Import** — paste a Google Maps, OpenRice, or Yelp link to import and bookmark a restaurant instantly
- **Multi-platform ratings** — aggregates Google, OpenRice, and Yelp ratings into a single weighted score
- **Location-aware** — distance filtering with geolocation, open-now detection based on current time
- **AI recommendations** — conversational, streaming explanations of why each restaurant matches your taste
- **Taste learning** — cuisine affinity weights derived from your bookmark history and feedback
- **Deduplication** — 3-level cascade (Place ID → slug → fuzzy name+location) prevents duplicate entries

## Stack

- **Next.js 15** (App Router, TypeScript)
- **tRPC v11** with superjson — end-to-end type safety
- **Drizzle ORM** + **PostgreSQL** (PostGIS + pg_trgm)
- **Vercel AI SDK v6** with LLM API (`gpt-4o-mini`) via OpenAI-compatible endpoint
- **Tailwind CSS v4** + **shadcn/ui**
- Deployed on **Vercel** + **Supabase**

## Setup

### 1. Prerequisites

- Node.js 20+
- pnpm (`npm install -g pnpm`)
- A [Supabase](https://supabase.com) project (PostgreSQL with PostGIS pre-installed)
- A [Google Cloud](https://console.cloud.google.com) project with **Places API (New)** enabled
- An [LLM API](https://llmapi.ai) account for AI features

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

```env
# Supabase connection string (Session mode on port 5432, not Transaction mode)
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres

# Google Places API (New) key — enable "Places API (New)" in Cloud Console
GOOGLE_PLACES_API_KEY=

# LLM API credentials — https://llmapi.ai
LLMAPI_API_KEY=
LLMAPI_BASE_URL=https://api.llmapi.ai/v1

# Your app's public URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> **Supabase connection**: Use the **Session mode** pooler URL (port 5432), not the Transaction mode (port 6543). Drizzle's postgres-js driver requires session-level features.

### 4. Run database migrations

```bash
pnpm db:migrate
```

This runs `drizzle-kit migrate` which applies `src/server/db/migrations/0000_open_moon_knight.sql`. The migration:
- Enables `postgis` and `pg_trgm` extensions
- Creates all 7 tables with appropriate indexes including GiST spatial index and GIN trigram index

Verify the migration worked:

```bash
pnpm db:studio
```

Open Drizzle Studio at `https://local.drizzle.studio` and confirm all tables exist.

### 5. Start development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Development

### Project structure

```
src/
├── app/                    # Next.js App Router pages + API routes
│   ├── api/
│   │   ├── trpc/[trpc]/    # tRPC HTTP handler
│   │   └── ai/recommend/   # Streaming AI explanation (SSE)
│   ├── bookmarks/          # Saved restaurants
│   ├── discover/           # Main discovery feed
│   └── recommend/          # AI recommendation interface
├── client/                 # Client-side tRPC hooks + providers
├── components/             # React components
│   ├── bookmark/           # ImportDialog, BookmarkList, BookmarkButton
│   ├── discover/           # DiscoverFeed, FilterBar
│   ├── layout/             # BottomNav, PageShell
│   ├── recommendation/     # RecommendationChat, FeedbackButtons
│   ├── restaurant/         # RestaurantCard, RestaurantDetail, MapLaunchButton
│   └── ui/                 # shadcn/ui primitives
├── server/                 # Server-only code (never bundled to client)
│   ├── ai/                 # LLM client + model config
│   ├── db/                 # Drizzle schema, client, migrations
│   ├── geo/                # Haversine, isOpenNow utilities
│   ├── ingestion/          # URL parsing, Places API, deduplication
│   ├── recommendation/     # Scoring engine, preference signals, explainer
│   └── trpc/               # Context, root router, sub-routers
└── shared/                 # Types and Zod validators safe for client + server
```

### Useful commands

```bash
pnpm dev          # Start dev server (http://localhost:3000)
pnpm build        # Production build
pnpm typecheck    # TypeScript type checking (tsc --noEmit)
pnpm db:generate  # Generate new Drizzle migration from schema changes
pnpm db:migrate   # Apply pending migrations
pnpm db:studio    # Open Drizzle Studio (visual DB browser)
```

### Adding a tRPC procedure

1. Add the procedure to the relevant router in `src/server/trpc/routers/`
2. Types are automatically available on the client via `trpc.<router>.<procedure>`

### Changing the database schema

1. Edit `src/server/db/schema.ts`
2. Run `pnpm db:generate` — Drizzle creates a new migration file
3. For PostGIS/trigram indexes, edit the generated SQL manually (Drizzle's builder doesn't support `USING gist` or `gin_trgm_ops`)
4. Run `pnpm db:migrate`

## Deployment

### Vercel

1. Push to GitHub
2. Import the repo in Vercel
3. Set root directory to `district/` if the repo root is the monorepo parent
4. Add all environment variables from `.env.local` to the Vercel project settings
5. Deploy

### Supabase

The database is already configured via the migration. No additional Supabase-specific setup is needed beyond providing the `DATABASE_URL`.

> **PostGIS**: Supabase has PostGIS pre-installed on all projects. The `CREATE EXTENSION IF NOT EXISTS postgis` in the migration is safe to run — it's a no-op if already enabled.

## Architecture notes

### Multi-user readiness

All tables carry `user_id varchar default 'default'`. V1 is single-user. To add auth in V2, change `createTRPCContext` in `src/server/trpc/init.ts` to extract the user ID from the session. No schema migrations are needed.

### Recommendation engine

The scorer (`src/server/recommendation/engine.ts`) is a pure function — no I/O, no database calls. It takes pre-fetched data and returns ranked results deterministically. Scoring dimensions:

| Dimension | Weight | Algorithm |
|---|---|---|
| Cuisine affinity | 0.30 | Learned from bookmark history |
| Distance | 0.25 | Exponential decay `exp(-km/3)` |
| Rating | 0.20 | Weighted avg across platforms, scaled by review count |
| Recency | 0.10 | 90-day half-life on when bookmarked |
| Feedback | 0.15 | thumbs_up +0.3, thumbs_down −0.5, visited −0.1 |

### AI streaming

`recommendations.generate` (tRPC) returns the scored restaurant list synchronously. The AI explanation streams separately from `/api/ai/recommend?historyId=...` using Server-Sent Events. This keeps restaurant cards instantly visible while the explanation loads progressively.

### Deduplication

When importing a URL, District checks for duplicates in three passes:
1. **Exact**: `google_place_id` match → skip insert, attach source URL
2. **Slug**: `(slug, user_id)` match → upsert name/metadata
3. **Fuzzy**: `pg_trgm similarity > 0.7` AND PostGIS distance < 300m → merge records
