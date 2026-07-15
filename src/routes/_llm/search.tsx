import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { RiInformationLine } from "@remixicon/react"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ButtonGroup } from "@/components/ui/button-group"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import useLLMEngine from "@/integrations/llm/engine"
import { isEngineReady } from "@/integrations/llm/engineState"
import {
  SEARCH_POKEMON_QUERY,
  pokemonSearchQueryOptions,
  spriteUrl,
  statValue,
} from "@/integrations/pokemon/api"
import {
  buildSearchVariables,
  generateSearchIntent,
  sortRows,
} from "@/integrations/pokemon/intent"
import type { BuiltSearch, SearchIntent } from "@/integrations/pokemon/intent"

// Feature A — natural-language Pokédex search.
export const Route = createFileRoute("/_llm/search")({ component: SearchRoute })

function SearchRoute() {
  const [, engineState] = useLLMEngine()
  const [submittedPrompt, setSubmittedPrompt] = useState("")
  const [thinking, setThinking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [intent, setIntent] = useState<SearchIntent | null>(null)
  const [built, setBuilt] = useState<BuiltSearch | null>(null)

  const searchQuery = useQuery({
    ...pokemonSearchQueryOptions(built?.variables ?? { where: {}, limit: 0 }),
    enabled: built != null,
  })

  async function runSearch(formData: FormData) {
    const prompt = formData.get("pokemonPrompt")
    const trimmed = typeof prompt === "string" ? prompt.trim() : ""
    if (!trimmed || !isEngineReady(engineState)) return
    setError(null)
    setThinking(true)
    setIntent(null)
    setBuilt(null)
    try {
      const nextIntent = await generateSearchIntent(engineState.engine, trimmed)
      setSubmittedPrompt(trimmed)
      setIntent(nextIntent)
      setBuilt(buildSearchVariables(nextIntent))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setThinking(false)
    }
  }

  const rows =
    built && searchQuery.data
      ? sortRows(searchQuery.data.pokemon_v2_pokemon, built.sort)
      : []

  return (
    <div className="mx-auto max-w-md space-y-3">
      <form action={runSearch}>
        <Field>
          <FieldLabel htmlFor="input-button-group">Search</FieldLabel>
          <FieldDescription>
            Describe the Pokémon you're looking for in plain language — by type,
            ability, region, stats, or appearance — and we'll find the matches.
          </FieldDescription>
          <ButtonGroup>
            <Input
              name="pokemonPrompt"
              id="input-button-group"
              placeholder="e.g. fast Electric-type Pokémon from Kanto"
            />
            <Button type="submit" variant="outline" disabled={thinking}>
              {thinking ? <Spinner /> : "Search"}
            </Button>
            {intent && built && (
              <InfoDialog
                prompt={submittedPrompt}
                intent={intent}
                built={built}
              />
            )}
          </ButtonGroup>
        </Field>
      </form>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {searchQuery.isError && (
        <p className="text-sm text-destructive">
          PokeAPI query failed: {searchQuery.error.message}
        </p>
      )}
      {built && searchQuery.isLoading && (
        <p className="text-sm text-muted-foreground">Querying PokeAPI…</p>
      )}

      {rows.length > 0 && (
        <ul className="divide-y rounded-md border">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center gap-3 px-3 py-2">
              <img
                src={spriteUrl(row) ?? undefined}
                alt=""
                width={40}
                height={40}
                className="size-10 shrink-0 object-contain"
                loading="lazy"
              />
              <span className="flex-1 font-medium capitalize">
                {row.name.replace(/-/g, " ")}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                #{row.id}
              </span>
              {built?.sort && (
                <span className="text-sm tabular-nums">
                  <span className="text-muted-foreground capitalize">
                    {built.sort.stat.replace(/-/g, " ")}{" "}
                  </span>
                  <span className="font-semibold">
                    {statValue(row, built.sort.stat)}
                  </span>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// The "more info" dialog: shows exactly what drove the search — the raw prompt,
// the LLM's structured filter output, and the GraphQL query it was turned into.
function InfoDialog({
  prompt,
  intent,
  built,
}: {
  prompt: string
  intent: SearchIntent
  built: BuiltSearch
}) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Search details"
          >
            <RiInformationLine />
          </Button>
        }
      />
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Search details</DialogTitle>
          <DialogDescription>How your words became a query.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Section title="Prompt">
            <pre className="whitespace-pre-wrap">{prompt}</pre>
          </Section>
          <Section title="Filters (LLM output)">
            <pre className="overflow-x-auto">
              {JSON.stringify(intent, null, 2)}
            </pre>
          </Section>
          <Section title="Query variables">
            <pre className="overflow-x-auto">
              {JSON.stringify(built.variables, null, 2)}
            </pre>
          </Section>
          <Section title="GraphQL query">
            <pre className="overflow-x-auto">{SEARCH_POKEMON_QUERY}</pre>
          </Section>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <div className="rounded-md border bg-muted/40 p-2 font-mono text-xs">
        {children}
      </div>
    </div>
  )
}
