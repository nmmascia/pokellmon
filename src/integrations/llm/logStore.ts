import { useSyncExternalStore } from "react"
import type { ChatCompletionMessageParam } from "@mlc-ai/web-llm"

// An in-session record of every real LLM call the app makes, so the /logs screen
// can show what the model was actually asked and what it produced — for eyeballing
// success and debugging why a given response happened. This is deliberately
// in-memory only: it lives for the browser session and resets on reload, matching
// the engine store (both are module-level singletons, not persisted). The /eval
// route has its own fixed-case harness; these are the *live* interactions.

// Which feature made the call. Keeps the two flows distinguishable on the screen.
export type LLMLogSource = "search" | "chat"

// A single message as sent to the model, flattened to a plain string so the UI
// can render it without knowing about WebLLM's content-part union.
export type LLMLogMessage = { role: string; content: string }

export type LLMLogEntry = {
  id: number
  // Wall-clock time the call finished (Date.now()); the screen formats it.
  timestamp: number
  source: LLMLogSource
  modelId: string
  // The user's own words for this turn — the headline of the entry.
  input: string
  // Extra context for chat turns (the Pokémon in focus). Undefined for search.
  contextLabel?: string
  // The full prompt sent: system prompt + few-shot examples + the user turn.
  // This is the "what the model was doing" detail the request asks for.
  messages: Array<LLMLogMessage>
  // Raw text the model emitted, before any parsing/salvage. Empty on error.
  rawContent: string
  // The final parsed object the app used (null when the call threw).
  parsed: unknown
  // How long engine.chat.completions.create took, in milliseconds.
  durationMs: number
  // WebLLM's usage block (token counts + decode timings) when present.
  usage?: unknown
  // Set when the call threw instead of returning; rawContent/parsed are empty.
  error?: string
}

// Keep the buffer bounded so a long session can't grow memory without limit.
// Newest entries are kept; oldest are dropped.
const MAX_ENTRIES = 100

// Stable empty reference for the initial/server snapshot — returning a fresh []
// each call would make useSyncExternalStore loop forever.
const EMPTY: Array<LLMLogEntry> = []

let logs: Array<LLMLogEntry> = EMPTY
let nextId = 1

const listeners = new Set<() => void>()
function emit(next: Array<LLMLogEntry>) {
  logs = next
  for (const listener of listeners) listener()
}
function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
function getSnapshot() {
  return logs
}
function getServerSnapshot() {
  return EMPTY
}

// Flatten a WebLLM message (whose content may be a string or an array of parts)
// into the plain { role, content } the log stores.
function messageContentToString(content: unknown): string {
  if (typeof content === "string") return content
  if (Array.isArray(content)) {
    return content
      .map((part) =>
        typeof part === "string"
          ? part
          : typeof (part as { text?: unknown }).text === "string"
            ? (part as { text: string }).text
            : JSON.stringify(part)
      )
      .join("")
  }
  return content == null ? "" : String(content)
}

export function toLogMessages(
  messages: Array<ChatCompletionMessageParam>
): Array<LLMLogMessage> {
  return messages.map((m) => ({
    role: m.role,
    content: messageContentToString(m.content),
  }))
}

// Append one call to the log (newest first), stamping id + timestamp here so
// callers pass only the payload.
export function recordLLMCall(
  entry: Omit<LLMLogEntry, "id" | "timestamp">
): void {
  const full: LLMLogEntry = { ...entry, id: nextId++, timestamp: Date.now() }
  emit([full, ...logs].slice(0, MAX_ENTRIES))
}

export function clearLLMLogs(): void {
  if (logs.length === 0) return
  emit(EMPTY)
}

// Read the log reactively. Newest entry is first.
export function useLLMLogs(): Array<LLMLogEntry> {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
