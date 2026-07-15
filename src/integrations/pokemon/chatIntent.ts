import type {
  ChatCompletionMessageParam,
  WebWorkerMLCEngine,
} from "@mlc-ai/web-llm"
import { toSlug } from "@/integrations/pokemon/api"
import { recordLLMCall, toLogMessages } from "@/integrations/llm/logStore"

// Callers pass this so the chat turn is recorded to the /logs screen.
export type ChatLogMeta = { modelId: string }

// What the LLM produces for one turn of the conversational Pokédex. As with
// search, this is *intent*, never facts and never raw GraphQL.
//
// Crucially, the model is NOT asked to classify which panel to show — small
// local models fill a discriminator enum unreliably (and it's the first field
// they must emit, before "seeing" the moves they'd list). Instead it only does
// entity extraction — pull out the other Pokémon to compare against and/or the
// moves named. Deterministic code (`routeIntent`) then decides the panel from
// the user's own words and pools those extracted names into the right bucket.
//
// The chat has three voices. `trainerReply` is a knowledgeable Pokémon Trainer
// answering the user; `pokemonReply` is the Pokémon itself chiming in, in
// character. Both are shown as chat bubbles; the panel is the visualization.
export type ChatPanel = "stats" | "moves" | "none"

export type ChatIntent = {
  // Derived in code from the fields below, not emitted by the model.
  panel: ChatPanel
  // The other Pokémon to compare base stats against, if the user named one.
  comparePokemon?: string
  // The moves the user asked about, if any.
  moves?: Array<string>
  trainerReply: string
  pokemonReply: string
}

// The model fills only these — entity extraction plus two chat lines.
export const chatIntentJsonSchema = {
  type: "object",
  properties: {
    comparePokemon: {
      type: "string",
      description:
        "If the user asks how stats compare against ANOTHER Pokémon, its name, lowercase (e.g. 'squirtle'). Empty string if the user named no other Pokémon.",
    },
    moves: {
      type: "array",
      items: { type: "string" },
      description:
        "Every move the user named or asked about learning, lowercase-hyphenated (e.g. 'water-gun', 'tackle'). Empty array if the user named no move.",
    },
    trainerReply: {
      type: "string",
      description:
        "The Trainer's friendly, knowledgeable answer to the user. This voice carries ALL the real information (one short sentence).",
    },
    pokemonReply: {
      type: "string",
      description:
        "The Pokémon reacting the way a real Pokémon does: ONLY its own species name (you may repeat or stylize it) plus a few emojis for its mood. NEVER human words or full sentences. E.g. 'Squirtle! Squir... 💦😎'.",
    },
  },
  required: ["comparePokemon", "moves", "trainerReply", "pokemonReply"],
  additionalProperties: false,
} as const

export const chatIntentSchemaString = JSON.stringify(chatIntentJsonSchema)

// The system prompt is parameterized by the Pokémon in focus so the model knows
// who "you" is and can ground both replies in real numbers.
export function buildChatSystemPrompt(context: {
  name: string
  types: Array<string>
  stats: Record<string, number>
}): string {
  const prettyName = context.name.replace(/-/g, " ")
  const statLine = Object.entries(context.stats)
    .map(([k, v]) => `${k} ${v}`)
    .join(", ")
  return [
    `You are TWO voices in a Pokédex chat about ${prettyName}, a ${context.types.join("/")}-type Pokémon.`,
    `${prettyName}'s base stats are: ${statLine}.`,
    "trainerReply is a knowledgeable human Pokémon Trainer answering the user. This voice does ALL the real talking and carries every fact — keep it to ONE short sentence.",
    `pokemonReply is ${prettyName} ITSELF. A real Pokémon cannot speak human language, so it must be ONLY the name "${prettyName}" (you may repeat or stylize it) plus a few emojis showing how it feels — e.g. "${prettyName}! ${prettyName}... 💪🔥". NEVER put human words or sentences in pokemonReply.`,
    "Only output JSON matching the schema. Never write GraphQL. Never invent stat numbers the user could verify — the chart/list shows the real data.",
    "Your job is to extract entities, not to decide what to display:",
    "- If the user asks how stats compare, contrast, or measure up against ANOTHER named Pokémon, put that other Pokémon in comparePokemon (lowercase) and leave moves EMPTY. Otherwise comparePokemon is an empty string.",
    "- If the user names any moves or asks which/when/how moves are learned (words like 'learn', 'move', 'attack', 'level'), put EVERY move named in moves (lowercase, hyphenated, e.g. 'vine-whip') and leave comparePokemon EMPTY. Otherwise moves is an empty array.",
    "Never fill BOTH comparePokemon and moves in the same answer — a message is either a stat comparison or a move question, not both.",
    "For a plain greeting or small talk that names no other Pokémon and no move, leave comparePokemon empty and moves empty.",
    `${prettyName} is 'you' — never put ${prettyName} in comparePokemon or moves.`,
    "Never claim the Pokémon can't learn a move; a list will show the real learnset — just fill moves.",
  ].join(" ")
}

// Worked examples so a small local model reliably (a) extracts the entities,
// (b) never fills both, and (c) keeps pokemonReply to name + emojis. The panel
// is derived from these in code, so the examples never mention a panel. The
// pokemonReply examples use the real focus name so the format is taught with
// the correct word.
function buildFewShot(name: string): Array<ChatCompletionMessageParam> {
  return [
    {
      role: "user",
      content: "How do your base stats compare against squirtle?",
    },
    {
      role: "assistant",
      content: JSON.stringify({
        comparePokemon: "squirtle",
        moves: [],
        trainerReply:
          "Let's put their base stats side by side — here's the full six-stat breakdown.",
        pokemonReply: `${name}! ${name}... 💪⚔️`,
      }),
    },
    {
      role: "user",
      content: "Show me when you'll learn tackle, water gun and bite",
    },
    {
      role: "assistant",
      content: JSON.stringify({
        comparePokemon: "",
        moves: ["tackle", "water-gun", "bite"],
        trainerReply:
          "Here's the learnset for those three — the level and how each is learned.",
        pokemonReply: `${name}, ${name}! 😤🔥`,
      }),
    },
    {
      role: "user",
      content: "hey there!",
    },
    {
      role: "assistant",
      content: JSON.stringify({
        comparePokemon: "",
        moves: [],
        trainerReply: "Hi! Ask me to compare stats or show a move's learnset.",
        pokemonReply: `${name}! 👋😊`,
      }),
    },
  ]
}

// Runs the local model with schema-constrained decoding, so the returned text is
// guaranteed to parse and match `chatIntentJsonSchema`. Normalizes the names it
// emits to PokeAPI slugs before they reach a query.
// Each call is deliberately self-contained: the Pokémon's identity and stats
// live in the system prompt, so we do NOT replay prior turns. Feeding back the
// model's own earlier JSON (which for a small model may include a misclassified
// panel) reinforces that mistake on later questions — the search feature avoids
// history for the same reason. Every question here ("compare to X", "when do
// you learn Y") stands on its own.
export async function generateChatIntent(
  engine: WebWorkerMLCEngine,
  context: {
    name: string
    types: Array<string>
    stats: Record<string, number>
  },
  message: string,
  meta?: ChatLogMeta
): Promise<ChatIntent> {
  const messages: Array<ChatCompletionMessageParam> = [
    { role: "system", content: buildChatSystemPrompt(context) },
    ...buildFewShot(context.name.replace(/-/g, " ")),
    { role: "user", content: message },
  ]
  const startedAt = performance.now()
  try {
    const res = await engine.chat.completions.create({
      stream: false,
      // Generous ceiling so a chatty reply doesn't truncate the JSON mid-string
      // (a truncated object can't be JSON.parsed — see parseIntent's salvage path).
      max_tokens: 700,
      // Deterministic decoding: reliable panel classification matters more than
      // varied prose (the search feature likewise runs at temperature 0).
      temperature: 0,
      // At temperature 0 a small model can get stuck in a greedy repetition loop
      // ("...goofball. ...goofball.") that runs to max_tokens and truncates the
      // JSON. A frequency penalty breaks such loops without affecting the
      // (short, structured) entity fields.
      frequency_penalty: 0.6,
      messages,
      response_format: {
        type: "json_object",
        schema: chatIntentSchemaString,
      },
    })
    const content = res.choices[0]?.message.content ?? "{}"
    const parsed = parseIntent(content)

    // Normalize extracted entities to PokeAPI slugs (the model emits an empty
    // string / empty array when the user named nothing).
    const compare = parsed.comparePokemon
      ? toSlug(parsed.comparePokemon)
      : undefined
    const moves = parsed.moves?.map(toSlug).filter(Boolean) ?? []
    const routed = routeIntent(message, compare, moves)

    const intent: ChatIntent = {
      comparePokemon: routed.comparePokemon,
      moves: routed.moves,
      trainerReply: parsed.trainerReply?.trim() || "Here you go!",
      pokemonReply: parsed.pokemonReply?.trim() || "",
      panel: routed.panel,
    }

    if (meta) {
      recordLLMCall({
        source: "chat",
        modelId: meta.modelId,
        input: message,
        contextLabel: context.name.replace(/-/g, " "),
        messages: toLogMessages(messages),
        rawContent: content,
        parsed: intent,
        durationMs: performance.now() - startedAt,
        usage: res.usage,
      })
    }

    return intent
  } catch (err) {
    if (meta) {
      recordLLMCall({
        source: "chat",
        modelId: meta.modelId,
        input: message,
        contextLabel: context.name.replace(/-/g, " "),
        messages: toLogMessages(messages),
        rawContent: "",
        parsed: null,
        durationMs: performance.now() - startedAt,
        error: err instanceof Error ? err.message : String(err),
      })
    }
    throw err
  }
}

type PartialIntent = {
  comparePokemon?: string
  moves?: Array<string>
  trainerReply?: string
  pokemonReply?: string
}

// Schema-constrained decoding guarantees well-formed JSON *only if the object
// finishes before max_tokens*. If a long reply is truncated, JSON.parse throws.
// Because comparePokemon and moves are the first properties emitted, they're
// intact even in a truncated response — so on parse failure we salvage the
// fields with regex, keeping the visualization working even if a reply is cut.
function parseIntent(content: string): PartialIntent {
  try {
    return JSON.parse(content) as PartialIntent
  } catch {
    const out: PartialIntent = {}
    const compare = content.match(/"comparePokemon"\s*:\s*"([^"]*)"/)
    if (compare) out.comparePokemon = compare[1]
    const moves = content.match(/"moves"\s*:\s*\[([^\]]*)\]/)
    if (moves) {
      out.moves = [...moves[1].matchAll(/"([^"]+)"/g)].map((m) => m[1])
    }
    // Reply strings may themselves be the truncated part; grab whatever is there.
    const trainer = content.match(/"trainerReply"\s*:\s*"((?:[^"\\]|\\.)*)/)
    if (trainer) out.trainerReply = trainer[1].replace(/\\"/g, '"')
    const pokemon = content.match(/"pokemonReply"\s*:\s*"((?:[^"\\]|\\.)*)/)
    if (pokemon) out.pokemonReply = pokemon[1].replace(/\\"/g, '"')
    return out
  }
}

// Decide the panel from the USER'S words, not from which field the model chose.
// A 1B model understands the question ("learn tackle" → moves) but routes the
// extracted names into the wrong field unreliably (it put "tackle" in
// comparePokemon). So: read the intent from message keywords, then pool every
// name the model extracted — from either field — into the right bucket.
const MOVE_WORDS =
  /\b(learn|learns|learned|learning|learnset|teach|teaches|move|moves|tm|hm)\b/
const COMPARE_WORDS =
  /\b(compare|compares|comparison|versus|vs|against|stronger|weaker|faster|slower|tankier|bulkier|better|worse|stack|matchup)\b/

function routeIntent(
  message: string,
  compare: string | undefined,
  moves: Array<string>
): {
  panel: ChatPanel
  comparePokemon: string | undefined
  moves: Array<string>
} {
  const m = message.toLowerCase()
  const moveish = MOVE_WORDS.test(m)
  const compareish = COMPARE_WORDS.test(m)
  // Every name the model pulled out, wherever it filed it.
  const all = [compare, ...moves].filter((x): x is string => Boolean(x))

  // Clear move question → the list, pooling all extracted names as moves.
  if (moveish && !compareish && all.length) {
    return { panel: "moves", comparePokemon: undefined, moves: all }
  }
  // Clear comparison → the chart; the target may have landed in either field.
  if (compareish && !moveish) {
    const target = compare ?? moves[0]
    if (target) return { panel: "stats", comparePokemon: target, moves: [] }
  }
  // Ambiguous or keyword-free: trust whichever field the model actually filled.
  if (moves.length) return { panel: "moves", comparePokemon: undefined, moves }
  if (compare) return { panel: "stats", comparePokemon: compare, moves: [] }
  return { panel: "none", comparePokemon: undefined, moves: [] }
}
