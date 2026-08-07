import type { paths } from './schema';

/** An endpoint path literally present in the generated OpenAPI schema. */
export type ApiPath = keyof paths & string;

declare const resolvedApiPath: unique symbol;

/**
 * An `ApiPath` whose `{param}` placeholders have been substituted by
 * `apiPath()`. Branded so `apiRequest` accepts it while rejecting arbitrary
 * strings that never appeared in the spec.
 */
export type ResolvedApiPath = string & { readonly [resolvedApiPath]: true };

type PathParamNames<P extends string> = P extends `${string}{${infer Name}}${infer Rest}`
  ? Name | PathParamNames<Rest>
  : never;

/**
 * Substitute `{param}` placeholders in a spec path with URL-encoded values.
 * The path must exist in the generated schema and every placeholder must be
 * supplied — both are checked at compile time.
 */
export function apiPath<P extends ApiPath>(
  path: P,
  ...args: [PathParamNames<P>] extends [never]
    ? []
    : [params: Record<PathParamNames<P>, string | number>]
): ResolvedApiPath {
  const params = args[0] as Record<string, string | number> | undefined;
  const resolved = params
    ? path.replace(/\{([^}]+)\}/g, (_, name: string) => encodeURIComponent(String(params[name])))
    : path;
  return resolved as ResolvedApiPath;
}
