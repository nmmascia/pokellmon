import { createFileRoute } from "@tanstack/react-router"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

// Feature C — streaming battle narrator. Entry point still to be designed.
export const Route = createFileRoute("/_llm/battle")({ component: BattleRoute })

function BattleRoute() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Battle</CardTitle>
        <CardDescription>Streaming battle narrator</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Placeholder — the LLM will stream play-by-play commentary from two
          Pokémon&apos;s stats here.
        </p>
      </CardContent>
    </Card>
  )
}
