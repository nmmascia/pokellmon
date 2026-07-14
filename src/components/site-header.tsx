import { Link } from "@tanstack/react-router"

import { ModeToggle } from "@/components/mode-toggle"

// App-wide top bar. Uses the semantic tokens (`bg-background`, `border-border`,
// `text-foreground`) so it repaints correctly in both themes with no `dark:`
// overrides of its own.
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <nav className="flex items-center gap-4 text-sm">
          <Link to="/" className="font-semibold [&.active]:text-primary">
            Pokéllmon
          </Link>
          <Link
            to="/demo"
            className="text-muted-foreground hover:text-foreground [&.active]:text-foreground"
          >
            Demo
          </Link>
        </nav>
        <ModeToggle />
      </div>
    </header>
  )
}
