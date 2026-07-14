import { createFileRoute } from "@tanstack/react-router"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export const Route = createFileRoute("/")({ component: App })

function App() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Project ready!</CardTitle>
        <CardDescription>
          A TanStack Start app wired with Router, Query, Virtual, and Hotkeys.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          The demo route fetches 1,000 rows through a Start server function,
          caches them with TanStack Query, virtualizes the list, and drives
          selection entirely from the keyboard.
        </p>
      </CardContent>
    </Card>
  )
}
