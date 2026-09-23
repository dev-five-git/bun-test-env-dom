import { mock } from 'bun:test'

import { ReadonlyURLSearchParams } from './readonly-url-search-params.ts'

export type Params = Record<string, string | string[]>

export interface NavigateOptions {
  scroll?: boolean
}

// biome-ignore lint/suspicious/noExplicitAny: mocks of any signature
type AnyFunction = (...args: any[]) => any

/**
 * One value per process. Should the built and the source entry both be
 * loaded, each registers its own stand-ins, and every one of them has to read
 * - and reset - what a test sets through either copy's control functions.
 */
function shared<T>(name: string, create: () => T): T {
  const registry = globalThis as unknown as Record<symbol, T | undefined>
  const key = Symbol.for(`bun-test-env-dom.next.${name}`)
  registry[key] ??= create()
  return registry[key]
}

const resets = shared('resets', (): (() => void)[] => [])

/** Registers work `resetState` does before every test. */
export function onReset(reset: () => void) {
  resets.push(reset)
}

/**
 * A mock that `resetState` restores: its calls are cleared and anything a
 * test set with `mockImplementation` / `mockReturnValue` is dropped, so
 * nothing one test does leaks into the next.
 */
export function resettableMock<T extends AnyFunction>(implementation?: T) {
  const fn = mock(implementation as T)
  onReset(() => {
    fn.mockReset()
    if (implementation) fn.mockImplementation(implementation)
  })
  return fn
}

/** The origin of the page under test. */
export const ORIGIN = 'http://localhost'

/** The instance `useRouter()` from `next/navigation` returns. */
export const appRouter = shared('appRouter', () => ({
  push: resettableMock<(href: string, options?: NavigateOptions) => void>(),
  replace: resettableMock<(href: string, options?: NavigateOptions) => void>(),
  prefetch: resettableMock<(href: string, options?: object) => void>(),
  back: resettableMock<() => void>(),
  forward: resettableMock<() => void>(),
  refresh: resettableMock<() => void>(),
  hmrRefresh: resettableMock<() => void>(),
}))

const initialState = () => ({
  url: new URL('/', ORIGIN),
  searchParams: new ReadonlyURLSearchParams(),
  params: {} as Params,
  route: null as string | null,
  segments: null as string[] | null,
  headers: new Headers(),
  cookies: new Map<string, string>(),
  draftMode: false,
  offline: false,
  rootParams: {} as Record<string, string | undefined>,
})

/** Everything a test can set, read by every stand-in on each call. */
export const state = shared('state', initialState)

/** Resolved against the current URL, like a link on the page. */
export function setUrl(url: string) {
  state.url = new URL(url, state.url)
  state.searchParams = new ReadonlyURLSearchParams(state.url.searchParams)
}

export function resetState() {
  Object.assign(state, initialState())
  for (const reset of resets) reset()
}
