# mealnova-admin

Mealnova admin portal — Next.js 15 (App Router), Tailwind CSS v4, TanStack Query/Table.
Auth-gated UI over [mealnova-api](https://github.com/mealnova/mealnova-api). Runs on port **3001**.

## Quickstart

```bash
cp .env.example .env.local      # point at your API (defaults to http://localhost:4000/api/v1)
pnpm install                    # see "Shared packages" below
pnpm dev                        # http://localhost:3001 → redirects to /login
```

## Shared packages (`@mealnova/shared`)

Resolved from **GitHub Packages** (`.npmrc`, auth via `GITHUB_TOKEN` with `read:packages`).
**Local development without a token:** clone
[mealnova-shared](https://github.com/mealnova/mealnova-shared) as a **sibling** directory and build
it once (`pnpm install && pnpm build`); the committed `.pnpmfile.cjs` links it automatically.

## Commands

| Command | Purpose |
|---|---|
| `pnpm dev` | dev server on :3001 |
| `pnpm build` / `pnpm start` | production build / serve on :3001 (override with `PORT`) |
| `pnpm lint` | typecheck (`tsc --noEmit`) |

## Deployment (Vercel, behind auth)

1. Import the GitHub repo into Vercel.
2. Env vars: `NEXT_PUBLIC_API_URL` + `INTERNAL_API_URL` (deployed API base) and `GITHUB_TOKEN`
   (`read:packages`) for the `@mealnova/*` registry.
3. The API's `CORS_ORIGINS` must include the admin domain. All routes are login-gated by the app's
   auth flow; consider additionally restricting by Vercel deployment protection for defense in depth.
