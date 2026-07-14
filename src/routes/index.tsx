import { createFileRoute, Link } from "@tanstack/react-router"
import { buttonVariants } from "@/components/ui/button"

export const Route = createFileRoute("/")({ component: App })

function App() {
  return (
    <div className="flex min-h-svh p-6">
      <div className="flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose">
        <div>
          <h1 className="font-medium">Project ready!</h1>
          <p>
            A TanStack Start app wired with Router, Query, Virtual, and Hotkeys.
          </p>
          <p>
            The demo route fetches 1,000 rows through a Start server function,
            caches them with TanStack Query, virtualizes the list, and drives
            selection entirely from the keyboard.
          </p>
          <Link to="/demo" className={`mt-2 ${buttonVariants()}`}>
            Open the virtualized demo →
          </Link>
        </div>
      </div>
    </div>
  )
}
