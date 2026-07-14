import { useEffect, useRef, useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { queryOptions, useQuery } from "@tanstack/react-query"
import { useVirtualizer } from "@tanstack/react-virtual"
import { useHotkeys } from "@tanstack/react-hotkeys"
import { buttonVariants } from "@/components/ui/button"

// --- TanStack Start: a server function -------------------------------------
// Runs only on the server. The client calls it like an RPC. Here it fabricates
// a large dataset so the virtualizer (below) has something worth virtualizing.
const TYPES = [
  "Grass",
  "Fire",
  "Water",
  "Electric",
  "Psychic",
  "Rock",
  "Ghost",
  "Dragon",
] as const

const listPokemon = createServerFn({ method: "GET" }).handler(async () => {
  return Array.from({ length: 1000 }, (_, i) => ({
    id: i + 1,
    name: `Pokémon #${String(i + 1).padStart(4, "0")}`,
    type: TYPES[i % TYPES.length],
    power: 40 + ((i * 37) % 160),
  }))
})

// --- TanStack Query: typed query options -----------------------------------
const pokemonQueryOptions = () =>
  queryOptions({
    queryKey: ["pokemon"],
    queryFn: () => listPokemon(),
  })

// --- TanStack Router: file-based route with a loader -----------------------
// The loader prefetches into the QueryClient injected via router context, so
// the list is dehydrated during SSR and hydrated on the client (no refetch).
export const Route = createFileRoute("/demo")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(pokemonQueryOptions())
  },
  component: DemoPage,
})

function DemoPage() {
  const { data = [], isFetching, refetch } = useQuery(pokemonQueryOptions())

  const parentRef = useRef<HTMLDivElement>(null)
  const [selected, setSelected] = useState(0)

  // --- TanStack Virtual: only render the rows in view ----------------------
  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 8,
  })

  const move = (delta: number) => {
    setSelected((prev) => {
      if (data.length === 0) return prev
      const next = Math.min(Math.max(prev + delta, 0), data.length - 1)
      rowVirtualizer.scrollToIndex(next, { align: "auto" })
      return next
    })
  }

  const jumpTo = (index: number) => {
    if (data.length === 0) return
    const clamped = Math.min(Math.max(index, 0), data.length - 1)
    setSelected(clamped)
    rowVirtualizer.scrollToIndex(clamped, { align: "center" })
  }

  // --- TanStack Hotkeys: keyboard-driven navigation ------------------------
  useHotkeys(
    [
      { hotkey: "J", callback: () => move(1) },
      { hotkey: "K", callback: () => move(-1) },
      { hotkey: "G", callback: () => jumpTo(0) },
      { hotkey: "Shift+G", callback: () => jumpTo(data.length - 1) },
      { hotkey: "R", callback: () => void refetch() },
    ],
    { preventDefault: true }
  )

  // Keep the virtualizer scrolled to the selection after data (re)loads.
  // Intentionally keyed on data.length only (not `selected`/`rowVirtualizer`).
  useEffect(() => {
    if (data.length > 0)
      rowVirtualizer.scrollToIndex(selected, { align: "auto" })
  }, [data.length])

  const items = rowVirtualizer.getVirtualItems()

  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col gap-4 p-6">
      <div>
        <p className="text-xs tracking-wide text-muted-foreground uppercase">
          TanStack Start · Router · Query · Virtual · Hotkeys
        </p>
        <h1 className="text-2xl font-medium">Virtualized Pokédex</h1>
        <p className="text-sm text-muted-foreground">
          {data.length.toLocaleString()} rows fetched via a Start server
          function, cached by Query, rendered on demand by Virtual.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Kbd>j</Kbd> down
        <Kbd>k</Kbd> up
        <Kbd>g</Kbd> top
        <Kbd>⇧G</Kbd> bottom
        <Kbd>r</Kbd> refetch
        {isFetching && <span className="ml-2 animate-pulse">refetching…</span>}
      </div>

      <div
        ref={parentRef}
        className="h-[70vh] overflow-auto rounded-lg border border-border"
      >
        <div
          className="relative w-full"
          style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
        >
          {items.map((virtualRow) => {
            const row = data[virtualRow.index]
            const isSelected = virtualRow.index === selected
            return (
              <button
                key={virtualRow.key}
                type="button"
                onClick={() => jumpTo(virtualRow.index)}
                className={`absolute top-0 left-0 flex w-full items-center justify-between border-b px-4 text-left text-sm ${
                  isSelected ? "bg-accent text-accent-foreground" : ""
                }`}
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <span className="font-medium">{row.name}</span>
                <span className="flex items-center gap-3 text-muted-foreground">
                  <span>{row.type}</span>
                  <span className="tabular-nums">PWR {row.power}</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Link to="/" className={buttonVariants({ variant: "outline" })}>
          ← Home
        </Link>
        <span className="text-sm text-muted-foreground">
          Selected: {data[selected]?.name ?? "—"}
        </span>
      </div>
    </main>
  )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px]">
      {children}
    </kbd>
  )
}
