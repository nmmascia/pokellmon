import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"
import { STAT_ORDER, statsRecord } from "@/integrations/pokemon/api"
import type { PokemonStatsRow } from "@/integrations/pokemon/api"

function prettyName(name: string) {
  return name.replace(/-/g, " ")
}

// A grouped bar chart putting the focused Pokémon's six base stats next to
// another's — the answer to "how do your base stats compare against X".
export function StatComparisonChart({
  self,
  other,
}: {
  self: PokemonStatsRow
  other: PokemonStatsRow
}) {
  const selfStats = statsRecord(self)
  const otherStats = statsRecord(other)

  const data = STAT_ORDER.map(({ key, label }) => ({
    stat: label,
    self: selfStats[key],
    other: otherStats[key],
  }))

  const config = {
    self: { label: prettyName(self.name), color: "var(--chart-1)" },
    other: { label: prettyName(other.name), color: "var(--chart-3)" },
  } satisfies ChartConfig

  return (
    <ChartContainer config={config} className="aspect-auto h-72 w-full">
      <BarChart accessibilityLayer data={data} margin={{ left: -12, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="stat"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <YAxis tickLine={false} axisLine={false} width={36} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="self" fill="var(--color-self)" radius={2} />
        <Bar dataKey="other" fill="var(--color-other)" radius={2} />
      </BarChart>
    </ChartContainer>
  )
}
