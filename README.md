# Ikagai

Next.js application with TypeScript, Tailwind CSS, Prisma, and Auth.js.

## Folder Structure

```
ikagai/
├── app/              # Next.js App Router
├── lib/              # Shared utilities
├── server/           # Server-side logic
├── prisma/           # Database schema
├── e2e/              # Playwright tests
└── __tests__/        # Unit tests
```

## Prerequisites

- Node.js 18+
- pnpm 8+
- PostgreSQL

## Setup

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Set up environment:
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` with your database URL and secrets.

3. Set up database:
   ```bash
   pnpm prisma generate
   ```

## Development

```bash
pnpm dev          # Start development server (localhost:3000)
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
pnpm type-check   # Check TypeScript
pnpm test         # Run unit tests
pnpm e2e          # Run E2E tests
```