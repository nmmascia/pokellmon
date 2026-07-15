import { createFileRoute, Link } from "@tanstack/react-router"
import { RiSearchLine, RiSwordLine, RiChatSmile3Line } from "@remixicon/react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { PokeballIcon } from "@/components/pokemon/pokeball"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/")({ component: App })

function App() {
  return (
    <div className="mx-auto max-w-4xl space-y-10">
      {/* ---- Hero ---- */}
      <section className="relative overflow-hidden rounded-xl border bg-gradient-to-b from-accent/40 to-background px-6 py-14 text-center">
        {/* oversized pokeball watermark bleeding off the corner */}
        <PokeballIcon
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-16 size-64 opacity-10"
        />
        <div className="relative flex flex-col items-center gap-4">
          <Badge variant="outline" className="gap-1.5">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/60" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
            Runs 100% in your browser
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Gotta prompt&nbsp;’em all
          </h1>
          <p className="max-w-xl text-balance text-muted-foreground">
            Pokéllmon is a Pokédex powered by a language model running entirely
            on your machine — no server, no API key. Search in plain English,
            then chat with any Pokémon about its stats and moves.
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/search"
              search={(prev) => ({ modelId: prev.modelId })}
              className={cn(buttonVariants({ size: "lg" }), "gap-2")}
            >
              <RiSearchLine className="size-4" />
              Start searching
            </Link>
            <Link
              to="/battle"
              search={(prev) => ({ modelId: prev.modelId })}
              className={cn(
                buttonVariants({ size: "lg", variant: "outline" }),
                "gap-2"
              )}
            >
              <RiSwordLine className="size-4" />
              Battle mode
            </Link>
          </div>
        </div>
      </section>

      {/* ---- Feature trio, each keyed to an elemental type color ---- */}
      <section className="grid gap-4 sm:grid-cols-3">
        <FeatureCard
          icon={<RiSearchLine className="size-5" />}
          title="Natural-language Pokédex"
          type="Electric"
          accent="var(--chart-2)"
          // Pikachu-yellow is light — pair it with dark ink, not white.
          fg="#3a2c12"
          description="“Fast Electric-types from Kanto” becomes a live GraphQL query against the PokéAPI."
        />
        <FeatureCard
          icon={<RiChatSmile3Line className="size-5" />}
          title="Chat with a Pokémon"
          type="Water"
          accent="var(--chart-3)"
          fg="#ffffff"
          description="Ask about base stats or learnsets and watch charts appear alongside the conversation."
        />
        <FeatureCard
          icon={<RiSwordLine className="size-5" />}
          title="Streaming battles"
          type="Fire"
          accent="var(--chart-1)"
          fg="#ffffff"
          description="Pit two Pokémon against each other and let the model narrate the play-by-play."
        />
      </section>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  type,
  accent,
  fg,
  description,
}: {
  icon: React.ReactNode
  title: string
  type: string
  accent: string
  fg: string
  description: string
}) {
  return (
    <Card className="relative h-full overflow-hidden">
      {/* type-colored accent strip along the top */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: accent }}
      />
      <CardHeader>
        <div
          className="mb-2 flex size-9 items-center justify-center rounded-md"
          style={{ background: accent, color: fg }}
        >
          {icon}
        </div>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>
          <Badge
            variant="outline"
            className="border-transparent font-medium"
            style={{ background: accent, color: fg }}
          >
            {type}
          </Badge>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}
