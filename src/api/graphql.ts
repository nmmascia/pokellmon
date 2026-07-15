import { initGraphQLTada } from "gql.tada"
import type { introspection } from "./graphql-env.d.ts"

// The typed `graphql()` document builder for the PokéAPI (v1beta) schema.
//
// Types are inferred entirely at the type level from `./schema.graphql` — there
// is no per-query codegen. The `@0no-co/graphqlsp` tsconfig plugin keeps the
// generated `graphql-env.d.ts` introspection file in sync with the schema.
//
// Regenerate after the schema changes:
//   pnpm exec gql.tada generate-schema https://beta.pokeapi.co/graphql/v1beta --output src/api/schema.graphql
//   pnpm exec gql.tada generate output
export const graphql = initGraphQLTada<{
  introspection: introspection
  scalars: {
    // Hasura's only custom scalar in this schema; sprite blobs etc. arrive as
    // arbitrary JSON, so we type them as `unknown` and narrow at the call site.
    jsonb: unknown
  }
}>()

export type { FragmentOf, ResultOf, VariablesOf } from "gql.tada"
export { readFragment } from "gql.tada"
