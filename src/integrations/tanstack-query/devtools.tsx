import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools"

// Registered as a plugin in the TanStackDevtools shell (see src/routes/__root.tsx).
export default {
  name: "Tanstack Query",
  render: <ReactQueryDevtoolsPanel />,
}
