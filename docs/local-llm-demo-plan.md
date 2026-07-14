# PokéLLMon — Local LLMs in the Browser (talk demo plan)

A build plan + reference for a conference-talk demo: **how to architect a browser app
that embeds a *local* LLM.** The LLM runs fully client-side (WebGPU, in a Web Worker),
produces structured output, and streams tokens — wired into a normal React/TanStack app
that also talks to a real API (PokeAPI).

> This is the durable spec agreed during grilling. Check work against it; update it if a
> decision changes.

---

## 1. Thesis (what the audience should learn)

Not "offline." The teaching goal is the **engineering pattern** for building browser apps
with local LLMs:

1. **Loading/caching model weights** in the browser (progress UX; cached after first load).
2. **Running inference off the main thread** in a Web Worker so the UI stays responsive.
3. **Streaming** tokens into React.
4. **Structured output** — constrain the model to emit JSON, then let deterministic code
   do the real work.
5. Doing all of the above inside a **real app** that also uses a real API.

The "naive main-thread version janks; the worker version stays smooth" contrast is a
deliberate teaching beat.

---

## 2. Stack (already in repo) + additions

| Concern            | Choice |
| ------------------ | ------ |
| Framework          | TanStack Start (React 19), Vite 8, file-based routing |
| Data fetching      | TanStack Query (already wired into router context + SSR) |
| List rendering     | TanStack Virtual (reuse from the old `/demo`) |
| Styling            | Tailwind v4 + shadcn/ui (base-ui primitives — **no `asChild`**, use `buttonVariants`) |
| **Local LLM**      | **WebLLM** (`@mlc-ai/web-llm`), `WebWorkerMLCEngine` |
| **Default model**  | **`Qwen2.5-0.5B-Instruct-q4f16_1-MLC`** (~945 MB VRAM, 4096 ctx) — smallest; picker to dial up |

Install:

```bash
pnpm add @mlc-ai/web-llm
```

**Docs / references**
- WebLLM repo & README: https://github.com/mlc-ai/web-llm
- WebLLM SDK docs: https://llm.mlc.ai/docs/deploy/webllm.html
- Web Worker example: https://github.com/mlc-ai/web-llm/tree/main/examples/web-worker
- JSON-schema (structured output) example: https://github.com/mlc-ai/web-llm/tree/main/examples/json-schema
- Prebuilt model list (`prebuiltAppConfig.model_list`): https://github.com/mlc-ai/web-llm/blob/main/src/config.ts
- PokeAPI v2 docs: https://pokeapi.co/docs/v2
- Vite Web Workers: https://vite.dev/guide/features.html#web-workers
- WebGPU availability (`navigator.gpu`): https://developer.mozilla.org/en-US/docs/Web/API/GPU
- TanStack Query: https://tanstack.com/query/latest — Router: https://tanstack.com/router/latest

---

## 3. Architecture decisions (the "why")

- **Engine runs in a Web Worker** (`WebWorkerMLCEngine`), not the main thread. Optional
  main-thread toggle only to *demo the jank* on stage.
- **One engine instance for the whole app**, owned by a **`PokeLLMProvider`** context and
  consumed via a **`usePokeLLM()`** hook. Load progress is first-class, visible state.
- **Provider lives in a shared layout route** so the model loads once and persists across
  `/search` → `/chat` → `/battle` navigation.
- **Feature A produces structured output**: LLM → schema-constrained filter JSON →
  deterministic filter over the data → virtualized list updates. The model parses *intent*,
  not facts (keeps a 0.5B model honest).
- **Data is live PokeAPI (Gen 1, 151) via TanStack Query.** Offline is not a goal; Query's
  cache is enough for stage reliability.
- **Gate on WebGPU** (`navigator.gpu`) with a friendly fallback message.

---

## 4. Routes / file layout

```
src/routes/
  __root.tsx                 # unchanged (queryClient context)
  index.tsx                  # landing (update copy/links)
  _llm.tsx                   # NEW layout route: mounts PokeLLMProvider + model status bar + nav
  _llm/search.tsx            # Feature A (build first)
  _llm/chat.$pokemonId.tsx   # Feature B (after A) — reached from a search result
  _llm/battle.tsx            # Feature C — scaffold nav only, deferred
  demo.tsx                   # DELETE (lift virtualizer bits into search)

src/llm/
  worker.ts                  # WebWorkerMLCEngineHandler
  provider.tsx               # PokeLLMProvider + usePokeLLM()
  models.ts                  # model picker list (subset of prebuiltAppConfig)
  schemas.ts                 # search filter JSON schema

src/pokemon/
  api.ts                     # PokeAPI fetch + queryOptions (Gen 1)
  types.ts
```

(Route file naming follows TanStack file-based routing; `_llm` is a pathless layout route.)

---

## 5. Build sequence

### Milestone 1 (talk-ready core)

1. **Delete `/demo`.** Salvage the `useVirtualizer` list mechanics into `/search`.
2. **LLM setup + loading + proof-of-life** *(build and verify before any feature)*:
   worker + `WebWorkerMLCEngine`, `PokeLLMProvider`, visible load-progress bar, model
   picker, WebGPU gate. A tiny "generate" button that streams a one-line Pokémon quip —
   proves worker + streaming + progress all work in isolation.
3. **`/search` (Feature A):** NL query → filter JSON → deterministic filter over Gen-1 data
   → virtualized results + optional one-line summary. Each result links to `/chat/$id`.
4. **Scaffold** `/chat/$pokemonId` and `/battle` nav (empty).

### Milestone 2 — `/chat/$pokemonId` (Feature B)
Per-Pokémon conversational Pokédex, entered from a search result. Streamed chat grounded in
that Pokémon's fetched stats.

### Milestone 3 — `/battle` (Feature C)
Streaming play-by-play battle narration from stats. **Entry point undecided** — design later
(candidate: pick two Pokémon from search/chat).

---

## 6. Reference code snippets (verified against WebLLM main)

### 6.1 Worker (`src/llm/worker.ts`)

```ts
import { WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm"

const handler = new WebWorkerMLCEngineHandler()
self.onmessage = (msg: MessageEvent) => {
  handler.onmessage(msg)
}
```

### 6.2 Create the engine (main thread) with load progress

```ts
import { CreateWebWorkerMLCEngine, type InitProgressReport } from "@mlc-ai/web-llm"

const engine = await CreateWebWorkerMLCEngine(
  // Vite needs this exact form to bundle the worker (module worker):
  new Worker(new URL("./worker.ts", import.meta.url), { type: "module" }),
  selectedModelId, // e.g. "Qwen2.5-0.5B-Instruct-q4f16_1-MLC"
  {
    initProgressCallback: (report: InitProgressReport) => {
      // report.progress (0..1), report.text — drive the status bar
      setLoadProgress(report)
    },
  },
)
```

### 6.3 Streaming a completion

```ts
const chunks = await engine.chat.completions.create({
  messages,
  stream: true,
  stream_options: { include_usage: true },
})

let reply = ""
for await (const chunk of chunks) {
  reply += chunk.choices[0]?.delta.content ?? ""
  if (chunk.usage) console.log(chunk.usage) // tokens/sec etc.
  setStreamingText(reply)
}
```

### 6.4 Structured output for `/search` (schema-constrained JSON)

`response_format.schema` is a **stringified JSON Schema**. The model is constrained to emit
matching JSON, so parsing is safe.

```ts
// src/llm/schemas.ts
export const filterSchema = JSON.stringify({
  type: "object",
  properties: {
    types:    { type: "array", items: { type: "string" } }, // e.g. ["fire"]
    minSpeed: { type: "number" },
    maxSpeed: { type: "number" },
    evolves:  { type: "boolean" },
    summary:  { type: "string" }, // one-line human explanation
  },
  required: ["summary"],
  additionalProperties: false,
})
```

```ts
import type { ResponseFormat } from "@mlc-ai/web-llm"
import { filterSchema } from "@/llm/schemas"

const res = await engine.chat.completions.create({
  stream: false,
  max_tokens: 256,
  messages: [
    { role: "system", content: "Convert the user's request into a Pokémon filter. Only output JSON." },
    { role: "user", content: query },
  ],
  response_format: { type: "json_object", schema: filterSchema } as ResponseFormat,
})

const filter = JSON.parse(res.choices[0].message.content ?? "{}")
// deterministic code applies `filter` to the Gen-1 list → virtualizer re-renders
```

### 6.5 Model picker (`src/llm/models.ts`)

```ts
import { prebuiltAppConfig } from "@mlc-ai/web-llm"

// Curated subset for the picker; default first.
export const MODELS = [
  "Qwen2.5-0.5B-Instruct-q4f16_1-MLC", // default (smallest)
  "Llama-3.2-1B-Instruct-q4f16_1-MLC",
  "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
  "Llama-3.2-3B-Instruct-q4f16_1-MLC",
] as const

// Full catalog if you want to browse live:
export const ALL_MODEL_IDS = prebuiltAppConfig.model_list.map((m) => m.model_id)
```

> Verify each `model_id` string against `prebuiltAppConfig.model_list` at build time —
> exact IDs/quantizations change between WebLLM releases. Source of truth:
> https://github.com/mlc-ai/web-llm/blob/main/src/config.ts

### 6.6 WebGPU gate

```ts
if (!("gpu" in navigator)) {
  // render a friendly "This demo needs a WebGPU-capable browser (Chrome/Edge)" message
}
```

### 6.7 PokeAPI (Gen 1) via TanStack Query

```ts
// src/pokemon/api.ts
import { queryOptions } from "@tanstack/react-query"

// Gen 1 = ids 1..151. Fetch list, then details as needed.
export const gen1QueryOptions = queryOptions({
  queryKey: ["pokemon", "gen1"],
  queryFn: async () => {
    const ids = Array.from({ length: 151 }, (_, i) => i + 1)
    return Promise.all(
      ids.map(async (id) => {
        const r = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`)
        return r.json() // extract name, types, stats (speed/attack/…), sprites in types.ts
      }),
    )
  },
  staleTime: Infinity, // Gen 1 data never changes
})
```

Endpoints: `https://pokeapi.co/api/v2/pokemon/{id}` (stats, types, sprites),
`.../type/{name}`, `.../evolution-chain/{id}`. Docs: https://pokeapi.co/docs/v2
(PokeAPI asks consumers to cache — `staleTime: Infinity` + Query dedup covers it.)

---

## 7. Landmines / gotchas

- **Vite + worker:** use the literal `new Worker(new URL("./worker.ts", import.meta.url), { type: "module" })`
  form so Vite 8 bundles it. Any other construction breaks the module worker.
  https://vite.dev/guide/features.html#web-workers
- **First-token warm-up:** even at 0.5B there's a delay on the first generation after
  "ready." Fire a throwaway 1-token generation on load so the on-stage first token is instant.
- **Don't hand-parse free text** for search — always use `response_format` schema constraint.
- **Small model = parse intent, not recall facts.** Never ask it for stats; it hallucinates.
  Feed real PokeAPI numbers; let the model only classify/route/narrate.
- **base-ui shadcn:** no `asChild`. Render `<Link>` as a button via `buttonVariants({...})`
  on `className` (see existing `index.tsx`).
- **Model IDs drift** between WebLLM versions — validate against `prebuiltAppConfig`.
- **VRAM/device:** 0.5B ≈ ~945 MB VRAM. Fine on Apple Silicon; check a borrowed laptop.

---

## 8. Open questions

- **Battle (Feature C) entry point** — how do you get into a battle? (pick two from search?
  from two chats? a dedicated picker?) Decide before Milestone 3.
- Whether to keep a **main-thread engine toggle** for the "watch it jank" beat, or just
  describe it on a slide.
