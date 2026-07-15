import { queryOptions } from "@tanstack/react-query"
import { print } from "graphql"
import { execute } from "@/api/client"
import { graphql } from "@/api/graphql"
import type { ResultOf, VariablesOf } from "@/api/graphql"

// The one operation the search feature runs, as a typed gql.tada document. The
// LLM never writes GraphQL — it emits a structured intent that deterministic
// code turns into the `$where` variables for this fixed, injection-safe query.
// Field selection and the `$where` / `$limit` variables are validated against
// the schema (see `src/api/schema.graphql`) at the type level.
export const SearchPokemonQuery = graphql(`
  query SearchPokemon($where: pokemon_v2_pokemon_bool_exp!, $limit: Int!) {
    pokemon_v2_pokemon(where: $where, limit: $limit) {
      id
      name
      pokemon_v2_pokemontypes {
        pokemon_v2_type {
          name
        }
      }
      pokemon_v2_pokemonstats {
        base_stat
        pokemon_v2_stat {
          name
        }
      }
      pokemon_v2_pokemonsprites {
        sprites
      }
      pokemon_v2_pokemonspecy {
        is_baby
        evolves_from_species_id
        generation_id
      }
    }
  }
`)

// The query text, printed from the typed document, so it can be shown verbatim
// in the search "more info" dialog.
export const SEARCH_POKEMON_QUERY = print(SearchPokemonQuery)

// Variables and row shapes are derived from the document above rather than
// hand-written — change the selection set and these follow automatically.
export type PokemonSearchVariables = VariablesOf<typeof SearchPokemonQuery>
export type PokemonWhere = PokemonSearchVariables["where"]
export type PokemonSearchRow =
  ResultOf<typeof SearchPokemonQuery>["pokemon_v2_pokemon"][number]

export function pokemonSearchQueryOptions(variables: PokemonSearchVariables) {
  return queryOptions({
    queryKey: ["pokemon", "search", variables],
    queryFn: () => execute(SearchPokemonQuery, variables),
    staleTime: Infinity,
  })
}

// The sprites column is an untyped JSON blob (`jsonb` scalar); pull out the
// nicest available art.
type SpriteBlob = {
  front_default?: string | null
  other?: {
    "official-artwork"?: { front_default?: string | null }
    home?: { front_default?: string | null }
  }
}

export function spriteUrl(row: PokemonSearchRow): string | null {
  const raw = row.pokemon_v2_pokemonsprites[0]?.sprites as
    | SpriteBlob
    | undefined
  return (
    raw?.other?.["official-artwork"]?.front_default ??
    raw?.other?.home?.front_default ??
    raw?.front_default ??
    null
  )
}

export function statValue(row: PokemonSearchRow, stat: string): number {
  const match = row.pokemon_v2_pokemonstats.find(
    (s) => s.pokemon_v2_stat?.name === stat
  )
  return match?.base_stat ?? 0
}
