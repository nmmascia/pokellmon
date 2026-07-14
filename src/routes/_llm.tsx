import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router"
import { Activity } from "react"
import { ModelPickerForm } from "@/components/model-picker-form"
import useLLMEngine from "@/integrations/llm/engine"
import { isEngineReady } from "@/integrations/llm/engineState"

export const Route = createFileRoute("/_llm")({
  component: LlmLayout,
  validateSearch: (search) => ({
    modelId: typeof search.modelId === "string" ? search.modelId : undefined,
  }),
})

function LlmLayout() {
  const navigate = Route.useNavigate()
  const pathname = useLocation({
    select: (location) => {
      return location.pathname
    },
  })
  const params = Route.useSearch()
  const [initLLMEngine, engineState] = useLLMEngine()

  const onModelFormSubmit = (formData: FormData) => {
    const pickedModelId = formData.get("modelId")
    if (typeof pickedModelId !== "string") return
    initLLMEngine(pickedModelId)
    navigate({
      to: pathname,
      search: (prev) => ({ ...prev, modelId: pickedModelId }),
      viewTransition: true,
    })
  }

  return (
    <div className="space-y-2">
      <ModelPickerForm
        modelId={params.modelId}
        engineState={engineState}
        onSubmit={onModelFormSubmit}
      />
      <Activity mode={isEngineReady(engineState) ? "visible" : "hidden"}>
        <Outlet />
      </Activity>
    </div>
  )
}
