# Setup Checklist

## Prerequisites
- [ ] Node.js 18+ installed
- [ ] pnpm 8+ installed  
- [ ] PostgreSQL running

## Installation
- [ ] Clone repository
- [ ] Run `pnpm install`
- [ ] Copy `.env.example` to `.env.local`
- [ ] Update `.env.local` with database credentials
- [ ] Run `pnpm prisma generate`

## Verification
- [ ] `pnpm dev` starts server on localhost:3000
- [ ] `/api/health` returns `{ "ok": true }`
- [ ] `pnpm lint` passes
- [ ] `pnpm type-check` passes
- [ ] `pnpm test` passes
- [ ] `pnpm e2e` passes

## Next Steps
- Set up database schema migrations
- Configure authentication providers
- Add shadcn/ui components as needed