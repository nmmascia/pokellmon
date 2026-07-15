import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"
import { TanStackDevtools } from "@tanstack/react-devtools"
import type { QueryClient } from "@tanstack/react-query"
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools"
import { ThemeProvider } from "../components/theme-provider"
import { SiteHeader } from "../components/site-header"
import { PokeballIcon } from "../components/pokemon/pokeball"
import { buttonVariants } from "../components/ui/button"

import appCss from "../styles.css?url"

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Pokéllmon",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "icon",
        type: "image/svg+xml",
        href: "/pokeball.svg",
      },
    ],
  }),
  notFoundComponent: () => (
    <main className="container mx-auto flex flex-col items-center gap-4 p-4 pt-24 text-center">
      <PokeballIcon className="size-16 opacity-80" />
      <h1 className="text-3xl font-bold">404 — This Pokémon fled!</h1>
      <p className="max-w-md text-muted-foreground">
        The page you were chasing darted into the tall grass. Let&apos;s head
        back to the Pokédex.
      </p>
      <a href="/" className={buttonVariants({ variant: "default" })}>
        Return to Pokéllmon
      </a>
    </main>
  ),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider>
          <SiteHeader />
          <main className="container mx-auto px-4 py-8">{children}</main>
        </ThemeProvider>
        <TanStackDevtools
          config={{
            position: "bottom-right",
          }}
          plugins={[
            {
              name: "Tanstack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
            TanStackQueryDevtools,
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
