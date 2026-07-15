import { cn } from "@/lib/utils"

// A crisp, classic Poké Ball rendered as inline SVG so it inherits sizing via
// `className` (use `size-*`) and stays sharp at any resolution. Colors are the
// canonical red / white / black — deliberately NOT theme tokens, because a Poké
// Ball is a Poké Ball in light or dark mode.
export function PokeballIcon({
  className,
  ...props
}: React.ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 100 100"
      role="img"
      aria-label="Poké Ball"
      className={cn("size-5", className)}
      {...props}
    >
      {/* white base */}
      <circle cx="50" cy="50" r="46" fill="#f7f7f7" />
      {/* red top half */}
      <path d="M4 50a46 46 0 0 1 92 0Z" fill="#ee1c25" />
      {/* equator band */}
      <rect x="4" y="44.5" width="92" height="11" fill="#1a1a1a" />
      {/* outer ring */}
      <circle
        cx="50"
        cy="50"
        r="46"
        fill="none"
        stroke="#1a1a1a"
        strokeWidth="4"
      />
      {/* center button */}
      <circle cx="50" cy="50" r="15" fill="#1a1a1a" />
      <circle cx="50" cy="50" r="10" fill="#f7f7f7" />
      <circle
        cx="50"
        cy="50"
        r="10"
        fill="none"
        stroke="#1a1a1a"
        strokeWidth="2"
      />
    </svg>
  )
}

// A Poké Ball that wobbles like it's about to pop open — the "is it caught?"
// suspense animation. Great as a playful inline loading indicator.
export function PokeballSpinner({
  className,
  ...props
}: React.ComponentProps<"svg">) {
  return (
    <PokeballIcon
      className={cn("motion-safe:animate-pokeball-wobble size-5", className)}
      {...props}
    />
  )
}
