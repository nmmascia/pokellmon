import { ThemeProvider as NextThemesProvider } from "next-themes"

// Wraps next-themes. `attribute="class"` toggles the `.dark` class on <html>,
// which is exactly what src/styles.css keys its dark tokens off of
// (`@custom-variant dark (&:is(.dark *))`). `defaultTheme="system"` follows the
// OS setting until the user picks explicitly; `enableSystem` keeps them in sync.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  )
}
