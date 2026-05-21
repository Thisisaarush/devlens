# DevLens — AI Developer Suite

AI-powered PR review, PR summarization, and codebase Q&A — all in one place. Bring your own AI key (OpenAI, Anthropic, Gemini, or GitHub Copilot).

## Features

- **PR Reviewer** — Structured code review: bugs, security, performance, and style. Posts directly to GitHub.
- **PR Summarizer** — Plain-English PR summaries with risk level and testing checklist.
- **Codebase Q&A** — Ask anything about any repo using RAG (lazy indexing — only fetches what's needed).
- **GitHub Action** — Fully standalone CI/CD integration. No DevLens server required.
- **Bring your own AI** — OpenAI, Anthropic Claude, Google Gemini, GitHub Copilot. API key or OAuth.

## Architecture

```
devlens/
├── apps/
│   ├── web/                    # Next.js 14 App Router
│   └── github-action/          # Standalone GitHub Action
├── packages/
│   ├── core/                   # Shared types, AES-256 encryption
│   ├── ai-providers/           # Unified AI adapter (OpenAI/Anthropic/Gemini/Copilot)
│   ├── github/                 # Octokit client, diff fetching, prompt builders
│   └── rag/                    # Chunker, cosine similarity, RAG pipeline
```

Built with **Turborepo** + **pnpm** workspaces.

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 14 (App Router), Tailwind CSS v4, shadcn/ui |
| Auth | NextAuth.js v5 (GitHub OAuth + Google OAuth) |
| Database | PostgreSQL via Neon + Drizzle ORM + pgvector |
| Cache + Rate Limiting | Upstash Redis |
| AI Providers | OpenAI, Anthropic, Google Gemini, GitHub Copilot |
| Monorepo | Turborepo + pnpm |
| Deployment | Vercel (web) + standalone GitHub Action |

## Getting Started

### Prerequisites

- Node.js >= 20
- pnpm >= 10
- PostgreSQL database (Neon recommended)
- Upstash Redis instance

### 1. Clone and install

```bash
git clone https://github.com/your-username/devlens
cd devlens
pnpm install
```

### 2. Configure environment

```bash
cp apps/web/.env.example apps/web/.env.local
```

Fill in your `.env.local`:

```env
# Database (Neon)
DATABASE_URL=postgresql://...

# Auth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=   # openssl rand -base64 32

# GitHub OAuth App (https://github.com/settings/applications/new)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Google OAuth App (https://console.cloud.google.com)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Upstash Redis (https://upstash.com)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Encryption key for stored API keys
ENCRYPTION_SECRET=   # openssl rand -base64 32
```

### 3. Set up the database

```bash
cd apps/web
pnpm drizzle-kit push
```

### 4. Run locally

```bash
# From root
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## GitHub Action

Add to `.github/workflows/devlens.yml`:

```yaml
name: DevLens PR Review

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: devlens/review-action@v1
        with:
          ai-provider: openai          # openai | anthropic | gemini | copilot
          ai-api-key: ${{ secrets.OPENAI_API_KEY }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
          review-mode: full            # bugs | security | performance | style | full
          post-comment: true
```

The action is **fully standalone** — no DevLens server required. Your code never leaves your CI environment.

## AI Provider Setup

After signing in, go to **Settings** to configure your AI providers:

| Provider | Auth Method | Notes |
|----------|-------------|-------|
| OpenAI | API Key | Used for completions + embeddings |
| Anthropic | API Key | Used for completions only |
| Google Gemini | API Key or Google OAuth | Used for completions + embeddings |
| GitHub Copilot | Auto (GitHub login) | No key needed |

API keys are encrypted at rest using AES-256-GCM.

## Security

- All API keys are encrypted with AES-256-GCM before storage
- Keys are never exposed client-side
- Rate limiting: 20 requests/minute per user (Redis sliding window)
- GitHub OAuth scopes: `read:user user:email repo`

## Contributing

1. Fork the repo
2. Create a branch: `git checkout -b feat/your-feature`
3. Make your changes
4. Run type checks: `pnpm type-check`
5. Submit a PR

## License

MIT
