import { prebuiltAppConfig } from "@mlc-ai/web-llm"

export const modelIds = [
  "Llama-3.2-1B-Instruct-q4f16_1-MLC",
  "Llama-3.2-3B-Instruct-q4f16_1-MLC",
  "Qwen2.5-3B-Instruct-q4f16_1-MLC",
]

export const modelRecordsList = prebuiltAppConfig.model_list.filter(
  ({ model_id }) => {
    return modelIds.includes(model_id)
  }
)
