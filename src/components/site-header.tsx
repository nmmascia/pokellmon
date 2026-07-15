import { Link } from "@tanstack/react-router"

import { ModeToggle } from "@/components/mode-toggle"
import { PokeballIcon } from "@/components/pokemon/pokeball"

// App-wide top bar. Uses the semantic tokens (`bg-background`, `border-border`,
// `text-foreground`) so it repaints correctly in both themes with no `dark:`
// overrides of its own.
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <nav className="flex items-center gap-4 text-sm">
          <Link
            to="/"
            className="group flex items-center gap-1.5 font-semibold [&.active]:text-primary"
          >
            <PokeballIcon className="size-5 transition-transform duration-500 group-hover:rotate-[360deg]" />
            Pokéllmon
          </Link>
          <Link
            to="/search"
            search={(prev) => ({ modelId: prev.modelId })}
            className="text-muted-foreground hover:text-foreground [&.active]:text-foreground"
          >
            Search
          </Link>
          <Link
            to="/logs"
            search={(prev) => ({ modelId: prev.modelId })}
            className="text-muted-foreground hover:text-foreground [&.active]:text-foreground"
          >
            Logs
          </Link>
        </nav>
        <ModeToggle />
      </div>
    </header>
  )
}
