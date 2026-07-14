<!-- intent-skills:start -->
## Skill Loading

Before editing files for a substantial task:
- Run `pnpm dlx @tanstack/intent@latest list` from the workspace root to see available local skills.
- If a listed skill matches the task, run `pnpm dlx @tanstack/intent@latest load <package>#<skill>` before changing files.
- Use the loaded `SKILL.md` guidance while making the change.
- Monorepos: when working across packages, run the skill check from the workspace root and prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing; load additional skills only when the task spans multiple packages or concerns.
<!-- intent-skills:end -->

---

# Project: pokellmon

A TanStack Start (React) application. This file is the durable source of truth for
how the project was built and how the TanStack pieces fit together. Read the Skill
Loading block above first, then this.

## Scaffolding provenance

This repo was bootstrapped from a host platform template (TanStack Start + shadcn/ui,
already installed with pnpm). Per the build brief, the canonical TanStack CLI create
command was **also** run in a scratch directory and its `tanstack-query` integration,
dependencies, config, scripts, and file structure were merged into this project.

**Exact TanStack CLI command used (in a scratch dir, for reference/merge):**

```bash
npx @tanstack/cli@latest create my-tanstack-app --agent --package-manager pnpm --tailwind --add-ons tanstack-query
```

**Follow-up TanStack Intent commands (run in this project root):**

```bash
npx @tanstack/intent@latest install   # wrote the Skill Loading block at the top of this file
npx @tanstack/intent@latest list      # enumerated available package skills
# Load a specific skill before an architectural change, e.g.:
pnpm dlx @tanstack/intent@latest load @tanstack/router-core#router-core/data-loading
```

## Stack & integrations

| Concern            | Choice                                                                 |
| ------------------ | ---------------------------------------------------------------------- |
| Framework          | TanStack Start (React 19), Vite 8, file-based routing                  |
| Package manager    | pnpm                                                                   |
| Styling            | Tailwind CSS v4 + shadcn/ui (base-ui primitives; **not** Radix)        |
| Data fetching      | TanStack Query, wired into the router context + SSR dehydration        |
| Toolchain          | Default CLI toolchain (Vite, Vitest, ESLint, Prettier)                 |

**Requested TanStack libraries — where each lives:**

- **TanStack Start** — the app itself; `vite.config.ts` `tanstackStart()` plugin;
  `createServerFn` server function `listPokemon` in `src/routes/demo.tsx`.
- **TanStack Router** — file routes under `src/routes/`; `src/router.tsx`;
  route `loader` + `context` DI in `src/routes/demo.tsx`; `<Link>` navigation.
- **TanStack Intent** — the Skill Loading block at the top of this file; skills are
  loaded on demand via `pnpm dlx @tanstack/intent@latest load ...`.
- **TanStack CLI** — `@tanstack/cli` scaffolded the reference app (command above);
  `@tanstack/router-cli` (`tsr`) is a devDependency, exposed via the
  `pnpm generate-routes` script (`tsr generate`, config in `tsr.config.json`).
- **TanStack Query** — `src/integrations/tanstack-query/{root-provider,devtools}.tsx`,
  QueryClient injected via router context, `useQuery` in the demo route.
- **TanStack Hotkeys** — `useHotkeys` in `src/routes/demo.tsx` (J/K/G/⇧G/R).
- **TanStack Virtual** — `useVirtualizer` in `src/routes/demo.tsx` (1,000-row list).

## Key architectural decisions

- **QueryClient lives in the router context.** `getContext()` in
  `src/integrations/tanstack-query/root-provider.tsx` creates the client;
  `src/router.tsx` passes it as `context` and calls
  `setupRouterSsrQueryIntegration({ router, queryClient })`. `__root.tsx` uses
  `createRootRouteWithContext<{ queryClient: QueryClient }>()`. This is the pattern
  confirmed by the `router-core/data-loading` intent skill — do not create ad-hoc
  QueryClients in components.
- **Loader prefetch + SSR hydration.** `/demo`'s loader calls
  `context.queryClient.ensureQueryData(...)`, so data is fetched on the server,
  dehydrated into the SSR stream, and hydrated on the client with no refetch.
- **shadcn uses base-ui, not Radix.** `Button` has no `asChild`. To render a
  `<Link>` as a button, apply `buttonVariants({ ... })` to the Link's `className`
  (see `src/routes/index.tsx` and `demo.tsx`), or use base-ui's `render` prop.
- **Path alias.** Imports use `@/*` → `src/*` (host convention, in `tsconfig.json`).
  The reference scaffold used `#/*`; we kept the host's `@/*` to avoid churn.

## Environment variables

None are required to run, build, or deploy this app today. The server function
returns generated data and needs no secrets.

When you add env vars under TanStack Start / Vite:

- **Client-exposed** values MUST be prefixed `VITE_` (e.g. `VITE_API_URL`) and are
  read via `import.meta.env.VITE_API_URL`. Anything without the prefix is
  server-only (`process.env.*`) and must never be imported into client code.
- Put local values in a git-ignored `.env` (`.env` is already covered by
  `.gitignore`). The `dotenv` intent skill documents gotchas if you adopt it.

## Deployment notes

- `pnpm build` produces `dist/client` and `dist/server` (SSR). `pnpm preview` serves
  the build locally. Dev: `pnpm dev` (port 3000; falls back to the next free port).
- No deployment target is configured yet. TanStack Start supports Node/Docker,
  Cloudflare, Netlify, Vercel, Bun, Railway. Before wiring one up, load the
  `@tanstack/start-client-core#start-core/deployment` intent skill.

## Known gotchas

- **TanStack Hotkeys key names are uppercase** single letters in the type
  (`"J"`, not `"j"`) even though they match the physical key regardless of Shift.
  Combos like `"Shift+G"` are fine.
- **Regenerate the route tree** after adding/removing/renaming routes if you rely on
  typecheck outside dev: `pnpm generate-routes` (dev/build do it automatically).
- The pre-existing `.agents/skills/` directory contains **Matt Pocock's** skill set
  (a different system from TanStack Intent). Intent skills are loaded on demand via
  the CLI, not from that directory.
- `@tanstack/eslint-config` currently warns about an `eslint@^10` peer (repo has
  eslint 9). Non-blocking.

## Common commands

```bash
pnpm dev              # dev server (port 3000 → next free port)
pnpm build            # SSR production build
pnpm preview          # serve the production build
pnpm generate-routes  # regenerate src/routeTree.gen.ts (tsr generate)
pnpm typecheck        # tsc --noEmit
pnpm lint             # eslint
pnpm format / check   # prettier write / check
pnpm test             # vitest run
```

## Next steps

- Replace the `listPokemon` server function with a real data source when ready.
- Choose and configure a deployment target (load the deployment skill first).
- Add tests for the demo route (Vitest + Testing Library are already installed).
