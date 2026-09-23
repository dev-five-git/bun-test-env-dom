import { createContext } from 'react'

import { ReadonlyURLSearchParams } from './readonly-url-search-params.ts'
import { appRouter, state } from './state.ts'

// Errors carry the same `digest` Next.js gives them, so code and tests that
// branch on it (`isRedirectError`, error boundaries, `unstable_rethrow`)
// behave as they do in the app.
const REDIRECT = 'NEXT_REDIRECT'
const HTTP_ERROR_FALLBACK = 'NEXT_HTTP_ERROR_FALLBACK'
const BAILOUT_TO_CSR = 'BAILOUT_TO_CLIENT_SIDE_RENDERING'

export const RedirectType = { push: 'push', replace: 'replace' } as const
type RedirectKind = (typeof RedirectType)[keyof typeof RedirectType]

function digestError(message: string, digest: string): never {
  throw Object.assign(new Error(message), { digest })
}

export function redirect(url: string, type: RedirectKind = 'replace'): never {
  return digestError(REDIRECT, `${REDIRECT};${type};${url};307;`)
}

export function permanentRedirect(
  url: string,
  type: RedirectKind = 'replace',
): never {
  return digestError(REDIRECT, `${REDIRECT};${type};${url};308;`)
}

export function notFound(): never {
  return digestError(`${HTTP_ERROR_FALLBACK};404`, `${HTTP_ERROR_FALLBACK};404`)
}

export function forbidden(): never {
  return digestError(`${HTTP_ERROR_FALLBACK};403`, `${HTTP_ERROR_FALLBACK};403`)
}

export function unauthorized(): never {
  return digestError(`${HTTP_ERROR_FALLBACK};401`, `${HTTP_ERROR_FALLBACK};401`)
}

const digestOf = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'digest' in error &&
  typeof error.digest === 'string'
    ? error.digest
    : ''

/** Redirects and `notFound` / `forbidden` / `unauthorized`. */
export function isNextRouterError(error: unknown) {
  const digest = digestOf(error)
  return (
    digest.startsWith(`${REDIRECT};`) ||
    digest.startsWith(`${HTTP_ERROR_FALLBACK};`)
  )
}

/** Re-throws errors Next.js uses for control flow, including wrapped ones. */
export function unstable_rethrow(error: unknown): void {
  if (isNextRouterError(error) || digestOf(error) === BAILOUT_TO_CSR) {
    throw error
  }
  if (error instanceof Error && 'cause' in error) unstable_rethrow(error.cause)
}

export function unstable_isUnrecognizedActionError(error: unknown) {
  return error instanceof Error && error.name === 'UnrecognizedActionError'
}

export const ServerInsertedHTMLContext = createContext<
  ((callback: () => unknown) => void) | null
>(null)

export function useServerInsertedHTML(_callback: () => unknown): void {}

export const useRouter = () => appRouter

export const usePathname = () => state.url.pathname

export const useSearchParams = () => state.searchParams

export const useParams = () => state.params

export function useSelectedLayoutSegments(
  _parallelRoutesKey?: string,
): string[] {
  return state.segments ?? state.url.pathname.split('/').filter(Boolean)
}

export function useSelectedLayoutSegment(
  parallelRoutesKey?: string,
): string | null {
  return useSelectedLayoutSegments(parallelRoutesKey)[0] ?? null
}

export { ReadonlyURLSearchParams }
