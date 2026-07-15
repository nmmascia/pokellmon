import { cn } from "@/lib/utils"

// Pikachu, charging up. The signature red cheeks pulse and little lightning
// bolts crackle around them while the model (or any slow thing) loads. Built as
// a self-contained inline SVG so it scales via `className` (set a `size-*`) and
// respects `prefers-reduced-motion` — the sparks only animate for motion-safe.
//
// The `label` renders as an aria-label AND, when `showLabel` is set, as a line
// of text beneath Pikachu — handy for "Loading model… 42%".
export function PikachuLoader({
  className,
  label = "Charging up…",
  showLabel = false,
  ...props
}: React.ComponentProps<"div"> & {
  label?: string
  showLabel?: boolean
}) {
  return (
    <div
      role="status"
      aria-label={label}
      className={cn("flex flex-col items-center gap-3", className)}
      {...props}
    >
      <svg
        viewBox="0 0 120 120"
        className="size-20 overflow-visible"
        aria-hidden="true"
      >
        <defs>
          <filter id="pika-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="2.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ---- Ears (yellow with black tips) ---- */}
        <g stroke="#3a2c12" strokeWidth="2" strokeLinejoin="round">
          {/* left */}
          <path d="M50 44 Q34 26 25 7 Q45 14 60 40 Z" fill="#f9d423" />
          <path d="M25 7 Q31 18 37 26 L46 18 Q34 11 25 7 Z" fill="#3a2c12" />
          {/* right */}
          <path d="M70 44 Q86 26 95 7 Q75 14 60 40 Z" fill="#f9d423" />
          <path d="M95 7 Q89 18 83 26 L74 18 Q86 11 95 7 Z" fill="#3a2c12" />
        </g>

        {/* ---- Head ---- */}
        <ellipse
          cx="60"
          cy="70"
          rx="34"
          ry="30"
          fill="#f9d423"
          stroke="#3a2c12"
          strokeWidth="2"
        />

        {/* ---- Cheeks: the charging bits ---- */}
        <g
          className="motion-safe:[animation:pika-charge_1s_ease-in-out_infinite]"
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
          filter="url(#pika-glow)"
        >
          <circle cx="34" cy="78" r="9" fill="#f0322b" />
          <circle cx="86" cy="78" r="9" fill="#f0322b" />
        </g>

        {/* ---- Lightning sparks flanking the cheeks ---- */}
        <g
          fill="#fff07a"
          stroke="#eab308"
          strokeWidth="1.5"
          strokeLinejoin="round"
          className="motion-safe:[animation:pika-spark_1s_steps(2,end)_infinite]"
        >
          <path d="M16 66 L23 72 L19 74 L25 82 L14 74 L18 72 Z" />
          <path d="M104 66 L97 72 L101 74 L95 82 L106 74 L102 72 Z" />
        </g>

        {/* ---- Face ---- */}
        <g fill="#3a2c12">
          <ellipse cx="48" cy="64" rx="4.5" ry="5.5" />
          <ellipse cx="72" cy="64" rx="4.5" ry="5.5" />
          {/* nose */}
          <ellipse cx="60" cy="72" rx="2" ry="1.4" />
          {/* mouth */}
          <path
            d="M54 78 Q60 84 66 78"
            fill="none"
            stroke="#3a2c12"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
        {/* eye highlights */}
        <g fill="#fff">
          <circle cx="49.6" cy="62" r="1.6" />
          <circle cx="73.6" cy="62" r="1.6" />
        </g>
      </svg>

      {showLabel && (
        <p className="text-xs font-medium text-muted-foreground tabular-nums">
          {label}
        </p>
      )}
    </div>
  )
}
