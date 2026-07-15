import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useMemo, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { RiSendPlaneFill, RiUserSmileLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ButtonGroup } from "@/components/ui/button-group"
import { Spinner } from "@/components/ui/spinner"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageGroup,
  MessageHeader,
} from "@/components/ui/message"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { PokeballIcon, PokeballSpinner } from "@/components/pokemon/pokeball"
import { StatComparisonChart } from "@/components/chat/stat-comparison-chart"
import { MoveLearnsetList } from "@/components/chat/move-learnset-list"
import useLLMEngine from "@/integrations/llm/engine"
import { isEngineReady } from "@/integrations/llm/engineState"
import {
  dedupeMoveLearns,
  pokemonDetailQueryOptions,
  pokemonMovesQueryOptions,
  pokemonStatsQueryOptions,
  spriteUrlFromSprites,
  statsRecord,
} from "@/integrations/pokemon/api"
import { generateChatIntent } from "@/integrations/pokemon/chatIntent"

// Feature B — per-Pokémon conversational Pokédex, entered from a search result.
// Left: a three-voice chat (you, a Trainer, and the Pokémon itself). Right: a
// visualization the model chose for your question — a stat comparison chart or a
// move learnset list, fetched live from the PokeAPI.
export const Route = createFileRoute("/_llm/chat/$pokemonId")({
  component: ChatRoute,
})

type ChatRole = "user" | "trainer" | "pokemon"
type ChatMessage = { id: number; role: ChatRole; text: string }

// The visualization to show on the right, derived from the model's intent.
type Panel =
  | { kind: "stats"; compare: string }
  | { kind: "moves"; moves: Array<string> }
  | null

function prettyName(name: string) {
  return name.replace(/-/g, " ")
}

function ChatRoute() {
  const { pokemonId } = Route.useParams()
  const id = Number(pokemonId)
  const [, engineState] = useLLMEngine()

  const detailQuery = useQuery(pokemonDetailQueryOptions(id))
  const detail = detailQuery.data?.pokemon_v2_pokemon[0]

  const context = useMemo(() => {
    if (!detail) return null
    return {
      name: detail.name,
      types: detail.pokemon_v2_pokemontypes
        .map((t) => t.pokemon_v2_type?.name)
        .filter((n): n is string => Boolean(n)),
      stats: statsRecord(detail),
      sprite: spriteUrlFromSprites(detail.pokemon_v2_pokemonsprites),
    }
  }, [detail])

  const [messages, setMessages] = useState<Array<ChatMessage>>([])
  const [thinking, setThinking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [panel, setPanel] = useState<Panel>(null)
  const nextId = useRef(0)
  // Monotonic id for the in-flight chat turn. Because runChat is async and a
  // second message can be sent (via Enter) before the first finishes, we tag
  // each turn and ignore any response that a newer turn has superseded — so the
  // panel always reflects the most recent question, not whichever model call
  // happened to finish last.
  const runSeq = useRef(0)

  // Seed the opening lines once we know who the Pokémon is.
  useEffect(() => {
    if (!context || messages.length > 0) return
    const name = prettyName(context.name)
    setMessages([
      {
        id: nextId.current++,
        role: "trainer",
        text: `This is ${name}. Ask me to compare its base stats with another Pokémon, or which moves it learns and when.`,
      },
      {
        id: nextId.current++,
        role: "pokemon",
        text: `${name}! ${name}~ 👋✨`,
      },
    ])
  }, [context, messages.length])

  function push(role: ChatRole, text: string) {
    setMessages((prev) => [...prev, { id: nextId.current++, role, text }])
  }

  async function runChat(formData: FormData) {
    const raw = formData.get("message")
    const message = typeof raw === "string" ? raw.trim() : ""
    // Ignore empty input, an unready engine, or a re-submit while a turn is
    // already generating (the send button is disabled, but Enter isn't).
    if (!message || !context || !isEngineReady(engineState) || thinking) return

    const seq = ++runSeq.current
    setError(null)
    push("user", message)
    setThinking(true)
    try {
      const intent = await generateChatIntent(
        engineState.engine,
        { name: context.name, types: context.types, stats: context.stats },
        message,
        { modelId: engineState.modelId }
      )
      // A newer message superseded this one while the model was running; drop
      // this (now stale) result so it can't clobber the latest answer.
      if (seq !== runSeq.current) return

      push("trainer", intent.trainerReply)
      if (intent.pokemonReply) push("pokemon", intent.pokemonReply)

      if (intent.panel === "stats" && intent.comparePokemon) {
        setPanel({ kind: "stats", compare: intent.comparePokemon })
      } else if (intent.panel === "moves" && intent.moves?.length) {
        setPanel({ kind: "moves", moves: intent.moves })
      }
    } catch (err) {
      if (seq === runSeq.current) {
        setError(err instanceof Error ? err.message : String(err))
      }
    } finally {
      if (seq === runSeq.current) setThinking(false)
    }
  }

  return (
    // A fixed-height wrapper bounds both panes (the ResizablePanelGroup fills it
    // via its built-in h-full), so each pane's internal overflow-y-auto scrolls:
    // the chat input stays pinned and a long conversation scrolls inside the
    // pane rather than scrolling the whole page.
    <div className="h-[calc(100vh-12rem)]">
      <ResizablePanelGroup
        orientation="horizontal"
        className="rounded-none border"
      >
        <ResizablePanel defaultSize={45} minSize={30}>
          <ChatPanel
            messages={messages}
            thinking={thinking}
            error={error}
            sprite={context?.sprite ?? null}
            pokemonName={context ? prettyName(context.name) : ""}
            onSubmit={runChat}
            disabled={!context || !isEngineReady(engineState)}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={55} minSize={30}>
          <VizPanel panel={panel} selfName={context?.name ?? ""} selfId={id} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Left: the conversation.
// ---------------------------------------------------------------------------

function ChatPanel({
  messages,
  thinking,
  error,
  sprite,
  pokemonName,
  onSubmit,
  disabled,
}: {
  messages: Array<ChatMessage>
  thinking: boolean
  error: string | null
  sprite: string | null
  pokemonName: string
  onSubmit: (formData: FormData) => void
  disabled: boolean
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, thinking])

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        <MessageGroup className="gap-4">
          {messages.map((m) => (
            <ChatBubble
              key={m.id}
              message={m}
              sprite={sprite}
              pokemonName={pokemonName}
            />
          ))}
          {thinking && (
            <Message align="start">
              <MessageContent>
                <Bubble variant="muted">
                  <BubbleContent>
                    <PokeballSpinner className="size-4" />
                  </BubbleContent>
                </Bubble>
              </MessageContent>
            </Message>
          )}
        </MessageGroup>
        <div ref={bottomRef} />
      </div>

      <div className="border-t p-3">
        {error && <p className="mb-2 text-xs text-destructive">{error}</p>}
        <form
          ref={formRef}
          action={(fd) => {
            onSubmit(fd)
            formRef.current?.reset()
          }}
        >
          <ButtonGroup className="w-full">
            <Input
              name="message"
              autoComplete="off"
              placeholder="How do your base stats compare against squirtle?"
              disabled={disabled}
            />
            <Button
              type="submit"
              variant="outline"
              size="icon"
              disabled={disabled || thinking}
            >
              {thinking ? <Spinner /> : <RiSendPlaneFill />}
            </Button>
          </ButtonGroup>
        </form>
      </div>
    </div>
  )
}

function ChatBubble({
  message,
  sprite,
  pokemonName,
}: {
  message: ChatMessage
  sprite: string | null
  pokemonName: string
}) {
  if (message.role === "user") {
    return (
      <Message align="end">
        <MessageContent>
          <Bubble variant="default">
            <BubbleContent>{message.text}</BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>
    )
  }

  const isPokemon = message.role === "pokemon"
  return (
    <Message align="start">
      <MessageAvatar>
        <Avatar size="sm">
          {isPokemon && sprite ? (
            <AvatarImage src={sprite} alt={pokemonName} />
          ) : null}
          <AvatarFallback>
            {isPokemon ? (
              pokemonName.charAt(0).toUpperCase()
            ) : (
              <RiUserSmileLine className="size-3.5" />
            )}
          </AvatarFallback>
        </Avatar>
      </MessageAvatar>
      <MessageContent>
        <MessageHeader className="capitalize">
          {isPokemon ? pokemonName : "Trainer"}
        </MessageHeader>
        <Bubble variant={isPokemon ? "tinted" : "muted"}>
          <BubbleContent>{message.text}</BubbleContent>
        </Bubble>
      </MessageContent>
    </Message>
  )
}

// ---------------------------------------------------------------------------
// Right: the visualization the model chose for the latest question.
// ---------------------------------------------------------------------------

function VizPanel({
  panel,
  selfName,
  selfId,
}: {
  panel: Panel
  selfName: string
  selfId: number
}) {
  return (
    <div className="h-full overflow-y-auto p-4">
      {panel === null && <VizEmpty />}
      {panel?.kind === "stats" && (
        <StatsPanel selfName={selfName} compare={panel.compare} />
      )}
      {panel?.kind === "moves" && (
        <MovesPanel selfId={selfId} moves={panel.moves} />
      )}
    </div>
  )
}

function VizEmpty() {
  return (
    <Empty className="h-full">
      <EmptyHeader>
        <EmptyMedia variant="default">
          <PokeballIcon className="size-12 opacity-80" />
        </EmptyMedia>
        <EmptyTitle>The Pokédex is listening</EmptyTitle>
        <EmptyDescription>
          Charts and lists appear here. Try “compare your stats to Squirtle” or
          “when do you learn tackle and water gun?”
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

function StatsPanel({
  selfName,
  compare,
}: {
  selfName: string
  compare: string
}) {
  const names = useMemo(
    () => [...new Set([selfName, compare])],
    [selfName, compare]
  )
  const query = useQuery({
    ...pokemonStatsQueryOptions(names),
    enabled: Boolean(selfName),
  })

  const rows = query.data?.pokemon_v2_pokemon ?? []
  const self = rows.find((r) => r.name === selfName)
  const other = rows.find((r) => r.name === compare)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold">Base stat comparison</h2>
        <Badge variant="outline" className="capitalize">
          {prettyName(selfName)} vs {prettyName(compare)}
        </Badge>
      </div>

      {query.isLoading && (
        <p className="text-xs text-muted-foreground">Fetching stats…</p>
      )}
      {query.isError && (
        <p className="text-xs text-destructive">
          Couldn&apos;t load stats: {query.error.message}
        </p>
      )}
      {query.isSuccess && !other && (
        <p className="text-xs text-muted-foreground">
          Couldn&apos;t find a Pokémon named “{prettyName(compare)}”.
        </p>
      )}
      {self && other && <StatComparisonChart self={self} other={other} />}
    </div>
  )
}

function MovesPanel({
  selfId,
  moves,
}: {
  selfId: number
  moves: Array<string>
}) {
  const query = useQuery(pokemonMovesQueryOptions(selfId, moves))
  const learns = query.data
    ? dedupeMoveLearns(query.data.pokemon_v2_pokemonmove)
    : []

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold">Move learnset</h2>
      {query.isLoading && (
        <p className="text-xs text-muted-foreground">Fetching learnset…</p>
      )}
      {query.isError && (
        <p className="text-xs text-destructive">
          Couldn&apos;t load moves: {query.error.message}
        </p>
      )}
      {query.isSuccess && <MoveLearnsetList learns={learns} asked={moves} />}
    </div>
  )
}
