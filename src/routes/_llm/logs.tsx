import { createFileRoute } from "@tanstack/react-router"
import { useMemo, useState } from "react"
import { RiDeleteBinLine, RiFileList3Line } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { clearLLMLogs, useLLMLogs } from "@/integrations/llm/logStore"
import type { LLMLogEntry, LLMLogMessage } from "@/integrations/llm/logStore"

// A running record of every real LLM call this session — search intents and chat
// turns alike — so you can eyeball success and see exactly what the model was
// asked and what it produced. Not linked from primary nav clutter; reached at
// /logs (and from the header link). Logs are in-memory: they reset on reload.
export const Route = createFileRoute("/_llm/logs")({ component: LogsRoute })

type Filter = "all" | "search" | "chat"

function LogsRoute() {
  const logs = useLLMLogs()
  const [filter, setFilter] = useState<Filter>("all")

  const shown = useMemo(
    () => (filter === "all" ? logs : logs.filter((l) => l.source === filter)),
    [logs, filter]
  )

  const failures = logs.filter((l) => l.error).length

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h1 className="text-lg font-semibold">Model logs</h1>
          <p className="text-sm text-muted-foreground">
            {logs.length} call{logs.length === 1 ? "" : "s"} this session
            {failures > 0 && (
              <>
                {" · "}
                <span className="text-destructive">{failures} failed</span>
              </>
            )}
            . Expand a row to see the full prompt, raw output, and parsed result.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ToggleGroup
            value={[filter]}
            onValueChange={(value) => {
              const next = value[0] as Filter | undefined
              if (next) setFilter(next)
            }}
          >
            <ToggleGroupItem value="all">All</ToggleGroupItem>
            <ToggleGroupItem value="search">Search</ToggleGroupItem>
            <ToggleGroupItem value="chat">Chat</ToggleGroupItem>
          </ToggleGroup>
          <Button
            variant="outline"
            size="sm"
            onClick={() => clearLLMLogs()}
            disabled={logs.length === 0}
          >
            <RiDeleteBinLine className="size-4" />
            Clear
          </Button>
        </div>
      </div>

      {logs.length === 0 ? (
        <Empty className="rounded-md border">
          <EmptyHeader>
            <EmptyMedia variant="default">
              <RiFileList3Line className="size-8 opacity-80" />
            </EmptyMedia>
            <EmptyTitle>No calls yet</EmptyTitle>
            <EmptyDescription>
              Run a search or chat with a Pokémon and every model call will show
              up here — request, raw response, and the parsed result the app used.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : shown.length === 0 ? (
        <p className="rounded-md border p-6 text-center text-sm text-muted-foreground">
          No {filter} calls yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {shown.map((entry) => (
            <LogRow key={entry.id} entry={entry} />
          ))}
        </ul>
      )}
    </div>
  )
}

// One call, collapsed to a headline by default. Uses a native <details> so the
// open/closed state is free and each row is independent.
function LogRow({ entry }: { entry: LLMLogEntry }) {
  const failed = Boolean(entry.error)
  return (
    <li className="overflow-hidden rounded-md border">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-2.5 hover:bg-muted/40">
          <Badge variant={entry.source === "search" ? "secondary" : "outline"}>
            {entry.source}
          </Badge>
          {failed && <Badge variant="destructive">error</Badge>}
          <span className="min-w-0 flex-1 truncate text-sm font-medium">
            {entry.contextLabel && (
              <span className="text-muted-foreground capitalize">
                {entry.contextLabel} ·{" "}
              </span>
            )}
            {entry.input || <span className="italic">（empty）</span>}
          </span>
          <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
            {Math.round(entry.durationMs)}ms
            {tokenLabel(entry.usage) && ` · ${tokenLabel(entry.usage)}`}
          </span>
          <span className="shrink-0 text-xs text-muted-foreground transition-transform group-open:rotate-90">
            ▸
          </span>
        </summary>

        <div className="space-y-3 border-t bg-muted/20 px-3 py-3 text-xs">
          <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-muted-foreground">
            <span>{formatTime(entry.timestamp)}</span>
            <span>model: {entry.modelId}</span>
          </div>

          {entry.error && (
            <Section title="Error">
              <pre className="whitespace-pre-wrap text-destructive">
                {entry.error}
              </pre>
            </Section>
          )}

          <Section title="Prompt sent">
            <div className="space-y-2">
              {entry.messages.map((m, i) => (
                <MessageBlock key={i} message={m} />
              ))}
            </div>
          </Section>

          {!failed && (
            <Section title="Raw model output">
              <pre className="overflow-x-auto whitespace-pre-wrap">
                {entry.rawContent || "(empty)"}
              </pre>
            </Section>
          )}

          {entry.parsed != null && (
            <Section title="Parsed result (used by the app)">
              <pre className="overflow-x-auto">
                {JSON.stringify(entry.parsed, null, 2)}
              </pre>
            </Section>
          )}

          {entry.usage != null && (
            <Section title="Usage">
              <pre className="overflow-x-auto">
                {JSON.stringify(entry.usage, null, 2)}
              </pre>
            </Section>
          )}
        </div>
      </details>
    </li>
  )
}

function MessageBlock({ message }: { message: LLMLogMessage }) {
  return (
    <div className="rounded border bg-background p-2">
      <div className="mb-1 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        {message.role}
      </div>
      <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs">
        {message.content}
      </pre>
    </div>
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
      <p className="text-[11px] font-medium text-muted-foreground">{title}</p>
      <div className="rounded-md border bg-background/60 p-2 font-mono">
        {children}
      </div>
    </div>
  )
}

// WebLLM's usage block carries prompt/completion token counts. Show them compact
// in the headline when present; tolerate the shape being absent or partial.
function tokenLabel(usage: unknown): string | null {
  if (usage == null || typeof usage !== "object") return null
  const u = usage as {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
  if (typeof u.completion_tokens === "number") {
    const prompt =
      typeof u.prompt_tokens === "number" ? `${u.prompt_tokens}→` : ""
    return `${prompt}${u.completion_tokens} tok`
  }
  if (typeof u.total_tokens === "number") return `${u.total_tokens} tok`
  return null
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}
