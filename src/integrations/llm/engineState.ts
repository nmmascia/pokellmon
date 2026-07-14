import type { InitProgressReport, WebWorkerMLCEngine } from "@mlc-ai/web-llm"

export type EngineState =
  | { status: "idle" }
  | {
      status: "loading"
      modelId: string
      engine: WebWorkerMLCEngine
      progress: InitProgressReport | null
    }
  | { status: "ready"; modelId: string; engine: WebWorkerMLCEngine }
  | { status: "error"; modelId: string; error: Error }

export type EngineStateIdle = Extract<EngineState, { status: "idle" }>
export type EngineStateLoading = Extract<EngineState, { status: "loading" }>
export type EngineStateReady = Extract<EngineState, { status: "ready" }>
export type EngineStateError = Extract<EngineState, { status: "error" }>

export function createEngineStateIdle(): EngineStateIdle {
  return { status: "idle" }
}

export function createEngineStateLoading(
  modelId: string,
  engine: WebWorkerMLCEngine,
  progress: InitProgressReport | null = null
): EngineStateLoading {
  return { status: "loading", modelId, engine, progress }
}

export function createEngineStateReady(
  modelId: string,
  engine: WebWorkerMLCEngine
): EngineStateReady {
  return { status: "ready", modelId, engine }
}

export function createEngineStateError(
  modelId: string,
  error: Error
): EngineStateError {
  return { status: "error", modelId, error }
}

export function isEngineStateIdle(s: EngineState): s is EngineStateIdle {
  return s.status === "idle"
}

export function isEngineStateLoading(s: EngineState): s is EngineStateLoading {
  return s.status === "loading"
}

export function isEngineReady(s: EngineState): s is EngineStateReady {
  return s.status === "ready"
}

export function isEngineStateError(s: EngineState): s is EngineStateError {
  return s.status === "error"
}
