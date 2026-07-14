import {
  WebWorkerMLCEngine,
  deleteModelAllInfoInCache,
  type MLCEngineConfig,
} from "@mlc-ai/web-llm"
import { useSyncExternalStore } from "react"
import {
  type EngineState,
  createEngineStateIdle,
  createEngineStateLoading,
  createEngineStateReady,
  createEngineStateError,
  isEngineStateLoading,
  isEngineReady,
} from "./engineState"

let engineState: EngineState = createEngineStateIdle()
let engine: WebWorkerMLCEngine | null = null

function getEngine(): WebWorkerMLCEngine {
  if (!engine) {
    const worker = new Worker(new URL("./worker.ts", import.meta.url), {
      type: "module",
    })
    const config: MLCEngineConfig = {
      initProgressCallback: (report) => {
        if (isEngineStateLoading(engineState)) {
          emit(
            createEngineStateLoading(
              engineState.modelId,
              engineState.engine,
              report
            )
          )
        }
      },
    }
    engine = new WebWorkerMLCEngine(worker, config)
  }
  return engine
}

function toLoadError(err: unknown): Error {
  if (err instanceof Error) {
    if (err.name === "QuotaExceededError") {
      return new Error(
        "Not enough browser storage to cache this model. Free up space or choose a smaller model."
      )
    }
    return err
  }
  return new Error(String(err) || "Unknown error loading model")
}

async function initLLMWebWorker(modelId: string) {
  if (
    (isEngineStateLoading(engineState) || isEngineReady(engineState)) &&
    engineState.modelId === modelId
  ) {
    return
  }

  const previousModelId =
    isEngineStateLoading(engineState) || isEngineReady(engineState)
      ? engineState.modelId
      : null

  try {
    if (typeof navigator === "undefined" || !navigator.gpu) {
      throw new Error(
        "WebGPU is not available in this browser. WebLLM requires a WebGPU-capable browser such as Chrome or Edge 113+ (Safari/Firefox need it enabled behind a flag)."
      )
    }

    const active = getEngine()
    emit(createEngineStateLoading(modelId, active))

    if (previousModelId && previousModelId !== modelId) {
      await deleteModelAllInfoInCache(previousModelId).catch(() => {})
    }

    await active.reload(modelId)
    emit(createEngineStateReady(modelId, active))
  } catch (err) {
    console.error("Model load failed:", err)
    emit(createEngineStateError(modelId, toLoadError(err)))
  }
}

const listeners = new Set<() => void>()
function emit(next: EngineState) {
  engineState = next
  for (const listener of listeners) listener()
}
function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
function getSnapshot() {
  return engineState
}
function getServerSnapshot() {
  return engineState
}

export default function useLLMEngine(): [typeof initLLMWebWorker, EngineState] {
  const engineState = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  )
  return [initLLMWebWorker, engineState]
}
