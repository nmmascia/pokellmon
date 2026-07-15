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
export type PokemonSearchRow = ResultOf<
  typeof SearchPokemonQuery
>["pokemon_v2_pokemon"][number]

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
    SpriteBlob | undefined
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

// ---------------------------------------------------------------------------
// Conversational Pokédex (Feature B) — the chat route grounds every reply in a
// single Pokémon and, depending on what the user asks, renders one of a fixed
// set of visualizations on the right. Each visualization is backed by one typed
// query below. As with search, the model never writes GraphQL: it emits a
// structured intent (see ./chatIntent.ts) that selects the query and its
// variables.
// ---------------------------------------------------------------------------

// The six base stats in canonical Pokédex order, with display labels. Kept here
// (not imported from ./intent.ts) so this module has no dependency on the search
// intent code.
export const STAT_ORDER = [
  { key: "hp", label: "HP" },
  { key: "attack", label: "Attack" },
  { key: "defense", label: "Defense" },
  { key: "special-attack", label: "Sp. Atk" },
  { key: "special-defense", label: "Sp. Def" },
  { key: "speed", label: "Speed" },
] as const

// Full detail for the Pokémon the conversation is about — enough to seed the
// chat header, ground the model, and answer stat questions about itself.
export const PokemonDetailQuery = graphql(`
  query PokemonDetail($id: Int!) {
    pokemon_v2_pokemon(where: { id: { _eq: $id } }, limit: 1) {
      id
      name
      height
      weight
      pokemon_v2_pokemontypes(order_by: { slot: asc }) {
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
    }
  }
`)

// Stats + sprite for an arbitrary set of Pokémon, keyed by name. Drives the
// "compare your base stats against X" bar chart.
export const PokemonStatsQuery = graphql(`
  query PokemonStats($names: [String!]!) {
    pokemon_v2_pokemon(where: { name: { _in: $names } }) {
      id
      name
      pokemon_v2_pokemonstats {
        base_stat
        pokemon_v2_stat {
          name
        }
      }
      pokemon_v2_pokemonsprites {
        sprites
      }
    }
  }
`)

// When (and how) a Pokémon learns the named moves. Not filtered by learn method
// so TM/egg/tutor moves are still answerable; deduped and prioritized in code
// (see `dedupeMoveLearns`).
export const PokemonMovesQuery = graphql(`
  query PokemonMoves($pokemonId: Int!, $moveNames: [String!]!) {
    pokemon_v2_pokemonmove(
      where: {
        pokemon_id: { _eq: $pokemonId }
        pokemon_v2_move: { name: { _in: $moveNames } }
      }
      order_by: { level: asc }
    ) {
      level
      pokemon_v2_move {
        name
      }
      pokemon_v2_movelearnmethod {
        name
      }
      pokemon_v2_versiongroup {
        name
      }
    }
  }
`)

export type PokemonDetail = ResultOf<
  typeof PokemonDetailQuery
>["pokemon_v2_pokemon"][number]
export type PokemonStatsRow = ResultOf<
  typeof PokemonStatsQuery
>["pokemon_v2_pokemon"][number]
export type PokemonMoveRow = ResultOf<
  typeof PokemonMovesQuery
>["pokemon_v2_pokemonmove"][number]

export function pokemonDetailQueryOptions(id: number) {
  return queryOptions({
    queryKey: ["pokemon", "detail", id],
    queryFn: () => execute(PokemonDetailQuery, { id }),
    staleTime: Infinity,
  })
}

export function pokemonStatsQueryOptions(names: Array<string>) {
  return queryOptions({
    queryKey: ["pokemon", "stats", [...names].sort()],
    queryFn: () => execute(PokemonStatsQuery, { names }),
    staleTime: Infinity,
  })
}

export function pokemonMovesQueryOptions(
  pokemonId: number,
  moveNames: Array<string>
) {
  return queryOptions({
    queryKey: ["pokemon", "moves", pokemonId, [...moveNames].sort()],
    queryFn: () => execute(PokemonMovesQuery, { pokemonId, moveNames }),
    staleTime: Infinity,
  })
}

// `sprites` is an untyped jsonb blob on every row shape above; this reads the
// nicest available art from any of them.
export function spriteUrlFromSprites(
  sprites: Array<{ sprites: unknown }>
): string | null {
  const raw = sprites[0]?.sprites as SpriteBlob | undefined
  return (
    raw?.other?.["official-artwork"]?.front_default ??
    raw?.other?.home?.front_default ??
    raw?.front_default ??
    null
  )
}

type StatBearing = {
  pokemon_v2_pokemonstats: PokemonSearchRow["pokemon_v2_pokemonstats"]
}

// A { hp, attack, … } record in canonical order for any stat-bearing row.
export function statsRecord(row: StatBearing): Record<string, number> {
  const out: Record<string, number> = {}
  for (const { key } of STAT_ORDER) {
    out[key] =
      row.pokemon_v2_pokemonstats.find((s) => s.pokemon_v2_stat?.name === key)
        ?.base_stat ?? 0
  }
  return out
}

export type MoveLearn = {
  move: string
  // The lowest level-up level, or null if this Pokémon never learns it by
  // leveling (learned via TM/egg/tutor instead).
  level: number | null
  method: string
}

// The API returns one row per (move, version group), so a single move appears
// many times. Collapse to one entry per move: prefer level-up (the common
// "what level do you learn X" question) at the lowest level seen, else fall
// back to whatever method teaches it.
export function dedupeMoveLearns(
  rows: Array<PokemonMoveRow>
): Array<MoveLearn> {
  const byMove = new Map<string, MoveLearn>()
  for (const row of rows) {
    const move = row.pokemon_v2_move?.name
    if (!move) continue
    const method = row.pokemon_v2_movelearnmethod?.name ?? "unknown"
    const isLevelUp = method === "level-up"
    const level = isLevelUp ? row.level : null
    const existing = byMove.get(move)
    if (!existing) {
      byMove.set(move, { move, level, method })
      continue
    }
    // Upgrade a non-level-up entry to level-up, or lower the level-up level.
    if (isLevelUp) {
      if (existing.method !== "level-up") {
        byMove.set(move, { move, level, method })
      } else if (
        level != null &&
        (existing.level == null || level < existing.level)
      ) {
        existing.level = level
      }
    }
  }
  return [...byMove.values()].sort((a, b) => {
    if (a.level == null) return 1
    if (b.level == null) return -1
    return a.level - b.level
  })
}

// Normalize a user/model-supplied Pokémon or move name to the PokeAPI slug
// form: lowercase, spaces and underscores to hyphens (e.g. "Water Gun" ->
// "water-gun", "Mr. Mime" -> "mr-mime").
export function toSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[.'’]/g, "")
    .replace(/[\s_]+/g, "-")
}
