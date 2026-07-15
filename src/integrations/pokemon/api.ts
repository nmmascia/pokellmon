import { queryOptions } from "@tanstack/react-query"

// PokeAPI's public GraphQL endpoint. We use the `beta` endpoint, not the newer
// `graphql.pokeapi.co/v1beta2`: v1beta2 currently returns empty
// `pokemontype` / `pokemonstat` join tables, so it can't answer the type/stat
// queries that are the whole point of the search demo.
export const POKEAPI_GRAPHQL_ENDPOINT = "https://beta.pokeapi.co/graphql/v1beta"

// The one operation the search feature runs. The LLM never writes GraphQL — it
// emits a structured intent that deterministic code turns into the `$where`
// variables for this fixed, injection-safe query. Kept as a string so it can be
// shown verbatim in the "more info" dialog.
export const SEARCH_POKEMON_QUERY = `query SearchPokemon($where: pokemon_v2_pokemon_bool_exp!, $limit: Int!) {
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
}`

// The subset of PokeAPI's `pokemon_v2_pokemon_bool_exp` that the intent builder
// actually assembles. Hand-typed (the repo's gql.tada schema isn't generated
// yet) but only ever produced by `buildSearchVariables`, never user input.
export type PokemonWhere = {
  is_default?: { _eq: boolean }
  pokemon_v2_pokemontypes?: {
    pokemon_v2_type: { name: { _in: Array<string> } }
  }
  pokemon_v2_pokemonspecy?: {
    evolves_from_species_id?: { _is_null: boolean }
    generation_id?: { _eq: number }
  }
  pokemon_v2_pokemonstats?: {
    pokemon_v2_stat: { name: { _eq: string } }
    base_stat: { _gte: number }
  }
}

export type PokemonSearchVariables = {
  where: PokemonWhere
  limit: number
}

export type PokemonSearchRow = {
  id: number
  name: string
  pokemon_v2_pokemontypes: Array<{
    pokemon_v2_type: { name: string } | null
  }>
  pokemon_v2_pokemonstats: Array<{
    base_stat: number
    pokemon_v2_stat: { name: string } | null
  }>
  pokemon_v2_pokemonsprites: Array<{ sprites: unknown }>
  pokemon_v2_pokemonspecy: {
    is_baby: boolean
    evolves_from_species_id: number | null
    generation_id: number
  } | null
}

type SearchPokemonResult = {
  pokemon_v2_pokemon: Array<PokemonSearchRow>
}

async function execute(
  variables: PokemonSearchVariables
): Promise<SearchPokemonResult> {
  const response = await fetch(POKEAPI_GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: SEARCH_POKEMON_QUERY, variables }),
  })
  if (!response.ok) {
    throw new Error(`PokeAPI GraphQL request failed (${response.status})`)
  }
  const json = (await response.json()) as {
    data?: SearchPokemonResult
    errors?: Array<{ message: string }>
  }
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join("; "))
  }
  if (!json.data) {
    throw new Error("PokeAPI GraphQL response contained no data")
  }
  return json.data
}

export function pokemonSearchQueryOptions(variables: PokemonSearchVariables) {
  return queryOptions({
    queryKey: ["pokemon", "search", variables],
    queryFn: () => execute(variables),
    staleTime: Infinity,
  })
}

// The sprites column is an untyped JSON blob; pull out the nicest available art.
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
