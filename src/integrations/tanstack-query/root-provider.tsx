import { QueryClient } from "@tanstack/react-query"

// Router context factory. The QueryClient created here is injected into the
// router context (see src/router.tsx) so every route loader and component can
// reach the same cache via `Route.useRouteContext().queryClient`.
export function getContext() {
  const queryClient = new QueryClient()

  return {
    queryClient,
  }
}

export default function TanstackQueryProvider() {}
