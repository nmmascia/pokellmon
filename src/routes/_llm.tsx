import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { createFileRoute, Outlet } from "@tanstack/react-router"
import { Activity } from "react"
import { prebuiltAppConfig } from "@mlc-ai/web-llm"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field"
import { Button } from "@/components/ui/button"
import { RiArrowRightLine } from "@remixicon/react"

export const Route = createFileRoute("/_llm")({ component: LlmLayout })

const modelList = prebuiltAppConfig.model_list.filter(({ model_id }) => {
  return [
    "Llama-3.2-1B-Instruct-q4f16_1-MLC",
    "Llama-3.2-3B-Instruct-q4f16_1-MLC",
    "Qwen2.5-3B-Instruct-q4f16_1-MLC",
  ].includes(model_id)
})

function LlmLayout() {
  return (
    <>
      <form className="mx-auto max-w-sm space-y-2">
        <FieldSet>
          <FieldLegend>Choose your model</FieldLegend>
          <RadioGroup defaultValue={modelList[0].model_id}>
            {modelList.map((modelRecord) => {
              return (
                <FieldLabel
                  key={modelRecord.model_id}
                  htmlFor={modelRecord.model_id}
                >
                  <Field orientation="horizontal">
                    <FieldContent>
                      <FieldTitle>{modelRecord.model_id}</FieldTitle>
                      <FieldDescription></FieldDescription>
                      <dl className="mt-1 flex flex-wrap items-center gap-1.5">
                        {[
                          {
                            label: "Size",
                            value: modelRecord.vram_required_MB
                              ? `${(modelRecord.vram_required_MB / 1024).toFixed(1)} GB`
                              : "—",
                          },
                          {
                            label: "Context",
                            // Only present when overrides sets it (e.g. -1k variants); else "—".
                            value:
                              modelRecord.overrides?.context_window_size?.toLocaleString() ??
                              "—",
                          },
                        ].map((stat) => (
                          <Badge
                            key={stat.label}
                            variant="outline"
                            className="font-normal"
                          >
                            <dt className="text-muted-foreground">
                              {stat.label}:
                            </dt>
                            <dd className="font-medium tabular-nums">
                              {stat.value}
                            </dd>
                          </Badge>
                        ))}
                      </dl>
                    </FieldContent>
                    <RadioGroupItem
                      value={modelRecord.model_id}
                      id={modelRecord.model_id}
                    />
                  </Field>
                </FieldLabel>
              )
            })}
          </RadioGroup>
        </FieldSet>
        <Button type="submit">
          Next
          <RiArrowRightLine />
        </Button>
      </form>
      <Activity mode="hidden">
        <Outlet />
      </Activity>
    </>
  )
}
