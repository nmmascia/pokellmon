import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useState } from "react"
import { Spinner } from "@/components/ui/spinner"
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
import {
  RiArrowRightLine,
  RiCheckboxCircleFill,
  RiErrorWarningFill,
} from "@remixicon/react"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { modelRecordsList } from "@/integrations/llm/demoModels"
import {
  isEngineReady,
  isEngineStateError,
  isEngineStateLoading,
  type EngineState,
} from "@/integrations/llm/engineState"
import { AnimatePresence, motion } from "motion/react"

type ModelPickerFormProps = {
  modelId: string | undefined
  engineState: EngineState
  onSubmit: (formData: FormData) => void
}

export function ModelPickerForm({
  modelId,
  engineState,
  onSubmit,
}: ModelPickerFormProps) {
  const [selectedModelId, setSelectedModelId] = useState(
    modelRecordsList[0].model_id
  )

  const statusLabel = isEngineStateLoading(engineState)
    ? `${engineState.progress?.text ?? "Loading model…"} (${Math.round(
        (engineState.progress?.progress ?? 0) * 100
      )}%)`
    : isEngineReady(engineState)
      ? "Model ready"
      : isEngineStateError(engineState)
        ? `Failed to load model: ${engineState.error.message}`
        : ""

  if (modelId) {
    return (
      <form
        action={onSubmit}
        className="flex items-center justify-end gap-0"
      >
        <span
          role="status"
          title={statusLabel}
          aria-label={statusLabel}
          className="relative mr-2 flex size-5 shrink-0 items-center justify-center"
        >
          <AnimatePresence initial={false}>
            {isEngineStateLoading(engineState) && (
              <motion.span
                key="loading"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{
                  type: "spring",
                  bounce: 0.35,
                  visualDuration: 0.25,
                }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <Spinner className="size-4 text-muted-foreground" />
              </motion.span>
            )}
            {isEngineReady(engineState) && (
              <motion.span
                key="ready"
                initial={{ scale: 0, opacity: 0, rotate: -90 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{
                  type: "spring",
                  bounce: 0.5,
                  visualDuration: 0.3,
                }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <RiCheckboxCircleFill className="size-4 text-emerald-500" />
              </motion.span>
            )}
            {isEngineStateError(engineState) && (
              <motion.span
                key="error"
                initial={{ scale: 0, opacity: 0, rotate: -90 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{
                  type: "spring",
                  bounce: 0.5,
                  visualDuration: 0.3,
                }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <RiErrorWarningFill className="size-4 text-destructive" />
              </motion.span>
            )}
          </AnimatePresence>
        </span>
        <Select
          key={modelId}
          name="modelId"
          defaultValue={modelId ?? modelRecordsList[0].model_id}
        >
          <SelectTrigger
            className="rounded-r-none"
            style={{ viewTransitionName: "model-slot" }}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {modelRecordsList.map((modelRecord) => (
                <SelectItem
                  key={modelRecord.model_id}
                  value={modelRecord.model_id}
                >
                  {modelRecord.model_id}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Button type="submit" size="icon" className="rounded-l-none border-l-0">
          <RiArrowRightLine />
        </Button>
      </form>
    )
  }

  return (
    <form className="mx-auto max-w-sm space-y-2" action={onSubmit}>
      <FieldSet>
        <FieldLegend>Choose your model</FieldLegend>
        <RadioGroup
          name="modelId"
          value={selectedModelId}
          onValueChange={setSelectedModelId}
        >
          {modelRecordsList.map((modelRecord) => {
            return (
              <FieldLabel
                key={modelRecord.model_id}
                htmlFor={modelRecord.model_id}
                style={{
                  viewTransitionName:
                    modelRecord.model_id === selectedModelId
                      ? "model-slot"
                      : undefined,
                }}
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
  )
}
