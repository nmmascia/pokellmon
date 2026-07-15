import { queryOptions } from "@tanstack/react-query"
import { execute } from "./client"
import { graphql } from "./graphql"
import type { ResultOf, VariablesOf } from "./graphql"

// A typed Pokédex list query. Field selection, arguments, and the `$limit` /
// `$offset` variables are all validated against the schema by gql.tada.
export const PokemonListQuery = graphql(`
  query PokemonList($limit: Int!, $offset: Int!) {
    pokemon(limit: $limit, offset: $offset, order_by: { id: asc }) {
      id
      name
      height
      weight
      base_experience
    }
  }
`)

export const PokemonByIdQuery = graphql(`
  query PokemonById($id: Int!) {
    pokemon(where: { id: { _eq: $id } }, limit: 1) {
      id
      name
      height
      weight
      base_experience
    }
  }
`)

// Convenience result types derived from the documents above — components can
// consume these without re-declaring the response shape.
export type PokemonList = ResultOf<typeof PokemonListQuery>["pokemon"]
export type Pokemon = PokemonList[number]

// Namespaced query keys keep cache invalidation predictable.
const pokemonKeys = {
  all: ["pokemon"] as const,
  list: (variables: VariablesOf<typeof PokemonListQuery>) =>
    [...pokemonKeys.all, "list", variables] as const,
  detail: (id: number) => [...pokemonKeys.all, "detail", id] as const,
}

/**
 * `queryOptions` builders for the Pokédex, ready to hand to `useQuery`,
 * `useSuspenseQuery`, or a route loader's `ensureQueryData`. Each is typed end
 * to end from its underlying `graphql()` document — the `queryFn` return type is
 * the query's response and the arguments are its inferred variables.
 */
export const pokemonQueries = {
  list: (variables: VariablesOf<typeof PokemonListQuery>) =>
    queryOptions({
      queryKey: pokemonKeys.list(variables),
      queryFn: () => execute(PokemonListQuery, variables),
    }),

  detail: (id: number) =>
    queryOptions({
      queryKey: pokemonKeys.detail(id),
      queryFn: () => execute(PokemonByIdQuery, { id }),
    }),
}
