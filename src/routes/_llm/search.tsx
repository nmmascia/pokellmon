import { createFileRoute } from "@tanstack/react-router"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

// Feature A — natural-language Pokédex search.
export const Route = createFileRoute("/_llm/search")({ component: SearchRoute })

function SearchRoute() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Search</CardTitle>
        <CardDescription>Natural-language Pokédex search</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Placeholder — the local LLM turns a query into a filter that drives
          the virtualized results list here.
        </p>
      </CardContent>
    </Card>
  )
}
