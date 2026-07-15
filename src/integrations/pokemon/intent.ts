import type {
  ChatCompletionMessageParam,
  WebWorkerMLCEngine,
} from "@mlc-ai/web-llm"
import type {
  PokemonSearchRow,
  PokemonSearchVariables,
  PokemonWhere,
} from "@/integrations/pokemon/api"
import { statValue } from "@/integrations/pokemon/api"

// The 18 Pokémon types and the six base stats, as PokeAPI names them. These are
// the *only* values the model is allowed to emit — constraining the schema to
// enums keeps a small local model from inventing types like "electric-fire".
export const POKEMON_TYPES = [
  "normal",
  "fire",
  "water",
  "grass",
  "electric",
  "ice",
  "fighting",
  "poison",
  "ground",
  "flying",
  "psychic",
  "bug",
  "rock",
  "ghost",
  "dragon",
  "dark",
  "steel",
  "fairy",
] as const

export const POKEMON_STATS = [
  "hp",
  "attack",
  "defense",
  "special-attack",
  "special-defense",
  "speed",
] as const

export type PokemonType = (typeof POKEMON_TYPES)[number]
export type PokemonStat = (typeof POKEMON_STATS)[number]

// What the LLM produces: parsed *intent*, never facts and never raw GraphQL.
// Deterministic code (buildSearchVariables) turns this into the typed query.
export type SearchIntent = {
  types?: Array<PokemonType>
  basicOnly?: boolean
  generation?: number
  sortStat?: PokemonStat
  // Natural-language tokens, not DB jargon: small models reliably map
  // 'fast'/'strong' -> 'highest' but not -> 'desc'. Converted to asc/desc in
  // buildSearchVariables.
  sortOrder?: "highest" | "lowest"
  minStat?: number
  limit?: number
  summary: string
}

// JSON Schema handed to WebLLM's `response_format`. The engine constrains
// generation so the emitted text is guaranteed to parse and match this shape.
export const searchIntentJsonSchema = {
  type: "object",
  properties: {
    types: {
      type: "array",
      items: { type: "string", enum: [...POKEMON_TYPES] },
      description:
        "Elemental types the user explicitly named. Omit entirely if no type is named — never guess.",
    },
    basicOnly: {
      type: "boolean",
      description:
        "True for basic/unevolved Pokémon (does not evolve from anything).",
    },
    generation: {
      type: "integer",
      minimum: 1,
      maximum: 9,
      description: "Restrict to a specific generation, if the user asks.",
    },
    sortStat: {
      type: "string",
      enum: [...POKEMON_STATS],
      description: "The stat to rank by, e.g. speed for 'fast' Pokémon.",
    },
    sortOrder: {
      type: "string",
      // `highest` first on purpose: greedy constrained decoding is biased toward
      // the first enum token, and 'high/best/fast' (highest) is the common case.
      enum: ["highest", "lowest"],
      description:
        "highest for 'high/best/most/fast/strong/tanky', lowest for 'low/worst/slow/weak'.",
    },
    minStat: {
      type: "integer",
      minimum: 0,
      maximum: 255,
      description:
        "Minimum value for sortStat. Use ~80 for 'high', ~100 for 'very high'.",
    },
    limit: { type: "integer", minimum: 1, maximum: 30 },
    summary: {
      type: "string",
      description: "One friendly sentence describing what was searched for.",
    },
  },
  required: ["summary"],
  additionalProperties: false,
} as const

// WebLLM wants the schema as a JSON string.
export const searchIntentSchemaString = JSON.stringify(searchIntentJsonSchema)

export const SEARCH_SYSTEM_PROMPT = [
  "You convert a user's natural-language Pokémon request into a JSON search filter.",
  "Only output JSON matching the schema. Never write GraphQL, never invent stats or facts.",
  "Fill in EVERY field the request implies — do not stop after `types`. A request usually implies several fields at once.",
  "sortStat picks WHICH stat to rank by: 'fast' AND 'slow' -> speed; 'strong/hard-hitting/powerful/weak/weakest' -> attack; 'tanky/bulky' -> defense; 'tough' -> hp. The adjective's speed/weak/etc. sets the stat; whether it's high or low goes in sortOrder, not here.",
  "sortOrder: pick 'highest' for high, fast, strong, great, best, most, top, tanky, bulky, hard-hitting; pick 'lowest' ONLY for low, slow, weak, worst, least. Superlatives like 'strongest', 'fastest', 'tankiest' are ALWAYS 'highest'.",
  "minStat: use ~80 for 'high/fast', ~100 for 'very high/really fast'. Omit it otherwise.",
  "basicOnly true for 'basic', 'unevolved', or 'starter-stage'.",
  "types: include ONLY the elemental types the user literally names (e.g. 'fire', 'water'). If the request names no type, leave `types` out completely — never guess or list many types.",
  "Set `generation` ONLY when the user explicitly names a generation or region — never guess it.",
  "Always write a short, friendly `summary` of what you searched for.",
].join(" ")

// Worked examples. Small models under grammar constraints tend to emit only the
// required field unless shown that requests map to *many* fields, and they get
// sort order backwards without explicit examples. These deliberately cover the
// cases a 1B model gets wrong: superlatives/adjectives -> 'highest', a bare
// superlative with no type (must NOT invent types), 'weak' -> attack + 'lowest',
// unevolved -> basicOnly, and generation-only-when-stated.
const FEW_SHOT: Array<ChatCompletionMessageParam> = [
  {
    role: "user",
    content: "unevolved bug pokemon with high speed",
  },
  {
    role: "assistant",
    content: JSON.stringify({
      types: ["bug"],
      basicOnly: true,
      sortStat: "speed",
      sortOrder: "highest",
      minStat: 80,
      summary: "Unevolved Bug-type Pokémon with high Speed.",
    }),
  },
  {
    role: "user",
    content: "strongest dragon pokemon",
  },
  {
    role: "assistant",
    content: JSON.stringify({
      types: ["dragon"],
      sortStat: "attack",
      sortOrder: "highest",
      summary: "Dragon-type Pokémon with the highest Attack.",
    }),
  },
  {
    role: "user",
    content: "tanky steel types",
  },
  {
    role: "assistant",
    content: JSON.stringify({
      types: ["steel"],
      sortStat: "defense",
      sortOrder: "highest",
      summary: "Steel-type Pokémon with the highest Defense.",
    }),
  },
  {
    role: "user",
    content: "fastest pokemon",
  },
  {
    role: "assistant",
    content: JSON.stringify({
      sortStat: "speed",
      sortOrder: "highest",
      summary: "Pokémon with the highest Speed.",
    }),
  },
  {
    role: "user",
    content: "weakest grass pokemon",
  },
  {
    role: "assistant",
    content: JSON.stringify({
      types: ["grass"],
      sortStat: "attack",
      sortOrder: "lowest",
      summary: "Grass-type Pokémon with the lowest Attack.",
    }),
  },
  {
    // 'slow' is about Speed, not Defense — a mapping the 1B model gets wrong from
    // instructions alone, so pin it with an example.
    role: "user",
    content: "slow water pokemon",
  },
  {
    role: "assistant",
    content: JSON.stringify({
      types: ["water"],
      sortStat: "speed",
      sortOrder: "lowest",
      summary: "Water-type Pokémon with the lowest Speed.",
    }),
  },
  {
    role: "user",
    content: "gen 1 psychic pokemon with really high special attack",
  },
  {
    role: "assistant",
    content: JSON.stringify({
      types: ["psychic"],
      generation: 1,
      sortStat: "special-attack",
      sortOrder: "highest",
      minStat: 100,
      summary:
        "Generation 1 Psychic-type Pokémon with very high Special Attack.",
    }),
  },
]

// Sensible default so the query is always valid even if the model omits fields.
const DEFAULT_LIMIT = 20

export type BuiltSearch = {
  variables: PokemonSearchVariables
  sort: { stat: PokemonStat; direction: "asc" | "desc" } | null
}

// Deterministic: intent -> typed GraphQL variables. This is the "let real code
// do the real work" half of the structured-output pattern.
export function buildSearchVariables(intent: SearchIntent): BuiltSearch {
  const where: PokemonWhere = { is_default: { _eq: true } }

  // Dedup: small models sometimes repeat a type (e.g. ["rock","rock"]).
  const types = intent.types?.length ? [...new Set(intent.types)] : []
  if (types.length) {
    where.pokemon_v2_pokemontypes = {
      pokemon_v2_type: { name: { _in: types } },
    }
  }

  const species: NonNullable<PokemonWhere["pokemon_v2_pokemonspecy"]> = {}
  if (intent.basicOnly) {
    species.evolves_from_species_id = { _is_null: true }
  }
  if (intent.generation != null) {
    species.generation_id = { _eq: intent.generation }
  }
  if (Object.keys(species).length > 0) {
    where.pokemon_v2_pokemonspecy = species
  }

  // A minStat threshold only makes sense against a specific stat.
  if (intent.sortStat && intent.minStat != null) {
    where.pokemon_v2_pokemonstats = {
      pokemon_v2_stat: { name: { _eq: intent.sortStat } },
      base_stat: { _gte: intent.minStat },
    }
  }

  return {
    variables: { where, limit: intent.limit ?? DEFAULT_LIMIT },
    sort: intent.sortStat
      ? {
          stat: intent.sortStat,
          direction: intent.sortOrder === "lowest" ? "asc" : "desc",
        }
      : null,
  }
}

// Runs the local model with schema-constrained decoding, so the returned text is
// guaranteed to be JSON matching `searchIntentJsonSchema`.
export async function generateSearchIntent(
  engine: WebWorkerMLCEngine,
  query: string
): Promise<SearchIntent> {
  const res = await engine.chat.completions.create({
    stream: false,
    max_tokens: 256,
    temperature: 0,
    messages: [
      { role: "system", content: SEARCH_SYSTEM_PROMPT },
      ...FEW_SHOT,
      { role: "user", content: query },
    ],
    response_format: {
      type: "json_object",
      schema: searchIntentSchemaString,
    },
  })
  const content = res.choices[0]?.message.content ?? "{}"
  const parsed = JSON.parse(content) as SearchIntent
  if (!parsed.summary) {
    parsed.summary = `Results for “${query}”.`
  }
  return parsed
}

// The API returns rows in id order; we sort by the LLM-chosen stat client-side
// (result sets are small, and stat-specific ordering in Hasura is awkward).
export function sortRows(
  rows: Array<PokemonSearchRow>,
  sort: BuiltSearch["sort"]
): Array<PokemonSearchRow> {
  if (!sort) return rows
  const factor = sort.direction === "asc" ? 1 : -1
  return [...rows].sort(
    (a, b) => factor * (statValue(a, sort.stat) - statValue(b, sort.stat))
  )
}
