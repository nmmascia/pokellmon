import { createFileRoute } from "@tanstack/react-router"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

// Feature B — per-Pokémon conversational Pokédex, entered from a search result.
export const Route = createFileRoute("/_llm/chat/$pokemonId")({
  component: ChatRoute,
})

function ChatRoute() {
  const { pokemonId } = Route.useParams()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Chat</CardTitle>
        <CardDescription>Conversational Pokédex · #{pokemonId}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Placeholder — streamed chat grounded in this Pokémon&apos;s stats will
          go here.
        </p>
      </CardContent>
    </Card>
  )
}
