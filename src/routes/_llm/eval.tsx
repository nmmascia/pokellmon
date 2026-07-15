import { createFileRoute } from "@tanstack/react-router"
import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import useLLMEngine from "@/integrations/llm/engine"
import { isEngineReady } from "@/integrations/llm/engineState"
import { generateSearchIntent } from "@/integrations/pokemon/intent"
import type { SearchIntent } from "@/integrations/pokemon/intent"

// THROWAWAY eval harness for tuning search intent on small models. Not linked in
// nav — reach it at /eval. Delete once tuning is done.
export const Route = createFileRoute("/_llm/eval")({ component: EvalRoute })

type Expected = Partial<
  Pick<
    SearchIntent,
    "types" | "basicOnly" | "generation" | "sortStat" | "sortOrder"
  >
> & { minStatPositive?: boolean }

type Case = { prompt: string; expected: Expected }

const CASES: Array<Case> = [
  {
    prompt: "fast unevolved electric pokemon",
    expected: {
      types: ["electric"],
      basicOnly: true,
      sortStat: "speed",
      sortOrder: "highest",
      minStatPositive: true,
    },
  },
  {
    prompt: "bulky water types from gen 1",
    expected: {
      types: ["water"],
      generation: 1,
      sortStat: "defense",
      sortOrder: "highest",
    },
  },
  {
    prompt: "strongest dragon pokemon",
    expected: { types: ["dragon"], sortStat: "attack", sortOrder: "highest" },
  },
  {
    prompt: "slow rock pokemon",
    expected: { types: ["rock"], sortStat: "speed", sortOrder: "lowest" },
  },
  {
    prompt: "grass pokemon with low defense",
    expected: { types: ["grass"], sortStat: "defense", sortOrder: "lowest" },
  },
  {
    prompt: "tanky steel types",
    expected: { types: ["steel"], sortStat: "defense", sortOrder: "highest" },
  },
  {
    prompt: "high hp normal pokemon",
    expected: {
      types: ["normal"],
      sortStat: "hp",
      sortOrder: "highest",
      minStatPositive: true,
    },
  },
  {
    prompt: "gen 3 ghost pokemon",
    expected: { types: ["ghost"], generation: 3 },
  },
  {
    prompt: "fastest pokemon",
    expected: { sortStat: "speed", sortOrder: "highest" },
  },
  {
    prompt: "weakest bug pokemon",
    expected: { types: ["bug"], sortStat: "attack", sortOrder: "lowest" },
  },
  {
    prompt: "psychic pokemon with really high special attack",
    expected: {
      types: ["psychic"],
      sortStat: "special-attack",
      sortOrder: "highest",
      minStatPositive: true,
    },
  },
  {
    prompt: "hard hitting fighting types",
    expected: {
      types: ["fighting"],
      sortStat: "attack",
      sortOrder: "highest",
    },
  },
  {
    prompt: "unevolved fire pokemon",
    expected: { types: ["fire"], basicOnly: true },
  },
  {
    prompt: "ice pokemon",
    expected: { types: ["ice"] },
  },
]

type FieldCheck = { field: string; ok: boolean; got: unknown; want: unknown }
type Result = {
  prompt: string
  intent: SearchIntent
  checks: Array<FieldCheck>
  pass: boolean
}

function checkCase(intent: SearchIntent, expected: Expected): Array<FieldCheck> {
  const checks: Array<FieldCheck> = []
  if (expected.types) {
    const got = [...(intent.types ?? [])].sort()
    const want = [...expected.types].sort()
    checks.push({
      field: "types",
      ok: JSON.stringify(got) === JSON.stringify(want),
      got: intent.types,
      want: expected.types,
    })
  }
  if (expected.basicOnly !== undefined) {
    checks.push({
      field: "basicOnly",
      ok: Boolean(intent.basicOnly) === expected.basicOnly,
      got: intent.basicOnly,
      want: expected.basicOnly,
    })
  }
  if (expected.generation !== undefined) {
    checks.push({
      field: "generation",
      ok: intent.generation === expected.generation,
      got: intent.generation,
      want: expected.generation,
    })
  } else {
    // Generation must NOT be invented when unstated.
    checks.push({
      field: "generation(none)",
      ok: intent.generation == null,
      got: intent.generation,
      want: undefined,
    })
  }
  if (expected.sortStat) {
    checks.push({
      field: "sortStat",
      ok: intent.sortStat === expected.sortStat,
      got: intent.sortStat,
      want: expected.sortStat,
    })
  }
  if (expected.sortOrder) {
    checks.push({
      field: "sortOrder",
      ok: intent.sortOrder === expected.sortOrder,
      got: intent.sortOrder,
      want: expected.sortOrder,
    })
  }
  if (expected.minStatPositive) {
    checks.push({
      field: "minStat>0",
      ok: (intent.minStat ?? 0) > 0,
      got: intent.minStat,
      want: ">0",
    })
  }
  return checks
}

function EvalRoute() {
  const [, engineState] = useLLMEngine()
  const [results, setResults] = useState<Array<Result>>([])
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)

  const run = useCallback(async () => {
    if (!isEngineReady(engineState)) return
    setRunning(true)
    setDone(false)
    setResults([])
    const collected: Array<Result> = []
    for (const testCase of CASES) {
      const intent = await generateSearchIntent(
        engineState.engine,
        testCase.prompt
      )
      const checks = checkCase(intent, testCase.expected)
      const pass = checks.every((c) => c.ok)
      const result: Result = { prompt: testCase.prompt, intent, checks, pass }
      collected.push(result)
      setResults([...collected])
      // Machine-readable line for reading via the console.
      console.log(
        `EVAL_RESULT ${JSON.stringify({
          prompt: testCase.prompt,
          pass,
          fails: checks.filter((c) => !c.ok).map((c) => c.field),
          intent,
        })}`
      )
    }
    const passed = collected.filter((r) => r.pass).length
    console.log(
      `EVAL_SUMMARY ${JSON.stringify({
        passed,
        total: collected.length,
      })}`
    )
    setRunning(false)
    setDone(true)
  }, [engineState])

  useEffect(() => {
    if (isEngineReady(engineState) && results.length === 0 && !running) {
      void run()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engineState])

  const passed = results.filter((r) => r.pass).length

  return (
    <div className="mx-auto max-w-3xl space-y-3 p-2 text-xs">
      <div className="flex items-center gap-3">
        <Button onClick={() => void run()} disabled={running}>
          {running ? "Running…" : "Re-run"}
        </Button>
        <span data-testid="score" className="font-mono">
          {passed}/{results.length} passed{done ? " (done)" : ""}
        </span>
      </div>
      <ul className="divide-y rounded-md border font-mono">
        {results.map((r) => (
          <li key={r.prompt} className="space-y-1 px-3 py-2">
            <div className="flex items-center gap-2">
              <span className={r.pass ? "text-green-600" : "text-destructive"}>
                {r.pass ? "PASS" : "FAIL"}
              </span>
              <span className="font-semibold">{r.prompt}</span>
            </div>
            <div className="flex flex-wrap gap-x-3 text-muted-foreground">
              {r.checks.map((c) => (
                <span
                  key={c.field}
                  className={c.ok ? "" : "text-destructive"}
                >
                  {c.field}={JSON.stringify(c.got)}
                  {!c.ok && `≠${JSON.stringify(c.want)}`}
                </span>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
