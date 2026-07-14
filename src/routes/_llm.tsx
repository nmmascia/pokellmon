import { createFileRoute, Outlet } from "@tanstack/react-router"

// Pathless layout route. Everything under here (search, chat, battle) will
// eventually share the PokeLLMProvider + model-loading Suspense boundary. For
// now it just renders its children. The landing page ("/") sits outside this
// layout, so it never waits on the model. Nav links live in <SiteHeader />.
export const Route = createFileRoute("/_llm")({ component: LlmLayout })

function LlmLayout() {
  return <Outlet />
}
