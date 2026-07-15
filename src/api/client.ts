import { print } from "graphql"
import type { TadaDocumentNode } from "gql.tada"

// PokéAPI GraphQL endpoint (v1beta2). Read-only, no auth; rate-limited to
// ~100 requests/hour per IP, so lean on TanStack Query's cache (see ./pokemon.ts).
export const POKEAPI_GRAPHQL_ENDPOINT = "https://graphql.pokeapi.co/v1beta2"

interface GraphQLResponse<TData> {
  data?: TData
  errors?: Array<{ message: string }>
}

/**
 * Execute a typed GraphQL document against the PokéAPI.
 *
 * Both the `variables` argument and the resolved result are inferred from the
 * `TadaDocumentNode` produced by `graphql()` — pass the wrong variables and it
 * won't compile; the returned promise resolves to exactly the query's shape.
 * Documents with no required variables may be called without a second argument.
 */
export async function execute<TResult, TVariables>(
  document: TadaDocumentNode<TResult, TVariables>,
  ...[variables]: TVariables extends Record<PropertyKey, never>
    ? [variables?: undefined]
    : [variables: TVariables]
): Promise<TResult> {
  const response = await fetch(POKEAPI_GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({ query: print(document), variables }),
  })

  if (!response.ok) {
    throw new Error(
      `PokéAPI GraphQL request failed: ${response.status} ${response.statusText}`
    )
  }

  const body = (await response.json()) as GraphQLResponse<TResult>

  if (body.errors?.length) {
    throw new Error(
      `PokéAPI GraphQL error: ${body.errors.map((e) => e.message).join("; ")}`
    )
  }

  if (!body.data) {
    throw new Error("PokéAPI GraphQL response contained no data")
  }

  return body.data
}
