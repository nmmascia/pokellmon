import { Badge } from "@/components/ui/badge"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import type { MoveLearn } from "@/integrations/pokemon/api"

function pretty(name: string) {
  return name.replace(/-/g, " ")
}

// Human-readable learn method (PokeAPI names are hyphenated slugs).
const METHOD_LABEL: Record<string, string> = {
  "level-up": "Level up",
  machine: "TM / HM",
  egg: "Egg move",
  tutor: "Move tutor",
  "form-change": "Form change",
}

// A list answering "when will you learn X, Y, Z" — one row per move, showing the
// level it's learned at (or the method, for TM/egg/tutor moves). `asked` are the
// slugs the user named, so we can call out any the Pokémon can't actually learn.
export function MoveLearnsetList({
  learns,
  asked,
}: {
  learns: Array<MoveLearn>
  asked: Array<string>
}) {
  const found = new Set(learns.map((l) => l.move))
  const missing = asked.filter((m) => !found.has(m))

  return (
    <div className="flex flex-col gap-2">
      {learns.map((learn) => (
        <Item key={learn.move} variant="outline" size="sm">
          <ItemMedia>
            {learn.level != null ? (
              <Badge className="tabular-nums">Lv {learn.level}</Badge>
            ) : (
              <Badge variant="secondary">—</Badge>
            )}
          </ItemMedia>
          <ItemContent>
            <ItemTitle className="capitalize">{pretty(learn.move)}</ItemTitle>
            <ItemDescription>
              {learn.level != null
                ? `Learned at level ${learn.level}`
                : (METHOD_LABEL[learn.method] ?? pretty(learn.method))}
            </ItemDescription>
          </ItemContent>
        </Item>
      ))}

      {missing.map((move) => (
        <Item key={move} variant="muted" size="sm">
          <ItemMedia>
            <Badge variant="secondary">?</Badge>
          </ItemMedia>
          <ItemContent>
            <ItemTitle className="capitalize">{pretty(move)}</ItemTitle>
            <ItemDescription>Not in this Pokémon's learnset.</ItemDescription>
          </ItemContent>
        </Item>
      ))}
    </div>
  )
}
