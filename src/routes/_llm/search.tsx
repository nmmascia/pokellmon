import { createFileRoute } from "@tanstack/react-router"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ButtonGroup } from "@/components/ui/button-group"
import { Button } from "@/components/ui/button"

// Feature A — natural-language Pokédex search.
export const Route = createFileRoute("/_llm/search")({ component: SearchRoute })

function SearchRoute() {
  return (
    <div className="mx-auto max-w-md">
      <form action={(formData) => {}}>
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
            <Button type="submit" variant="outline">
              Search
            </Button>
          </ButtonGroup>
        </Field>
      </form>
    </div>
  )
}
