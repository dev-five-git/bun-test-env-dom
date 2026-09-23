import type { ComponentType } from 'react'

import { onReset, type Params, resettableMock, state } from './state.ts'

type Handler = (...args: unknown[]) => void

// `mitt`, the emitter behind `Router.events`. Handlers a test leaves behind
// are dropped before the next one.
const handlers = new Map<string, Handler[]>()
onReset(() => handlers.clear())

const events = {
  on(type: string, handler: Handler) {
    handlers.set(type, [...(handlers.get(type) ?? []), handler])
  },
  off(type: string, handler: Handler) {
    const list = handlers.get(type)
    list?.splice(list.indexOf(handler) >>> 0, 1)
  },
  emit(type: string, ...args: unknown[]) {
    for (const handler of handlers.get(type)?.slice() ?? []) handler(...args)
  },
}

// The same object until the URL or params change, as in Next.js, so effects
// that depend on `router.query` do not run on every render.
let cachedQuery = { searchParams: {}, params: {}, query: {} as Params }

function query() {
  const { searchParams, params } = state
  if (
    cachedQuery.searchParams !== searchParams ||
    cachedQuery.params !== params
  ) {
    const fromSearch: Params = {}
    for (const key of new Set(searchParams.keys())) {
      const values = searchParams.getAll(key)
      fromSearch[key] = values.length > 1 ? values : (values[0] ?? '')
    }
    // Dynamic route params win over the query string.
    cachedQuery = { searchParams, params, query: { ...fromSearch, ...params } }
  }
  return cachedQuery.query
}

type Url = string | object
type TransitionOptions = { shallow?: boolean; scroll?: boolean }

/**
 * The Pages Router: `useRouter()` and the `Router` singleton from
 * `next/router`. `pathname` and `route` are the route set with `setRoute`
 * (`/posts/[id]`), or the URL's path without one.
 */
export const pagesRouter = {
  get pathname() {
    return state.route ?? state.url.pathname
  },
  get route() {
    return state.route ?? state.url.pathname
  },
  get query() {
    return query()
  },
  get asPath() {
    return `${state.url.pathname}${state.url.search}${state.url.hash}`
  },
  get isPreview() {
    return state.draftMode
  },
  basePath: '',
  locale: undefined as string | undefined,
  locales: undefined as string[] | undefined,
  defaultLocale: undefined as string | undefined,
  domainLocales: undefined,
  isLocaleDomain: false,
  isReady: true,
  isFallback: false,
  components: {},
  events,
  push: resettableMock(
    async (_url: Url, _as?: Url, _options?: TransitionOptions) => true,
  ),
  replace: resettableMock(
    async (_url: Url, _as?: Url, _options?: TransitionOptions) => true,
  ),
  reload: resettableMock(() => {}),
  back: resettableMock(() => {}),
  forward: resettableMock(() => {}),
  prefetch: resettableMock(
    async (_url: string, _asPath?: string, _options?: object) => {},
  ),
  beforePopState: resettableMock((_callback: (state: object) => boolean) => {}),
  get router() {
    return pagesRouter
  },
  readyCallbacks: [] as (() => void)[],
  ready(callback: () => void) {
    callback()
  },
}

export const useRouter = () => pagesRouter

/** `next/compat/router`: `null` as in the App Router, until `setRoute`. */
export const useCompatRouter = () => (state.route === null ? null : pagesRouter)

// biome-ignore lint/complexity/noStaticOnlyClass: Next.js exports a class
export class Router {
  static events = events
}

export function createRouter(..._args: unknown[]) {
  return pagesRouter
}

const URL_FIELDS = [
  'pathname',
  'route',
  'query',
  'asPath',
  'components',
  'isFallback',
  'basePath',
  'locale',
  'locales',
  'defaultLocale',
  'isReady',
  'isPreview',
  'isLocaleDomain',
  'domainLocales',
] as const
const CORE_METHODS = [
  'push',
  'replace',
  'reload',
  'back',
  'prefetch',
  'beforePopState',
] as const

/** A snapshot of `router` whose methods still call it, as in Next.js. */
export function makePublicRouterInstance(router: Record<string, unknown>) {
  const instance: Record<string, unknown> = { events }
  for (const field of URL_FIELDS) {
    const value = router[field]
    instance[field] =
      typeof value === 'object'
        ? Object.assign(Array.isArray(value) ? [] : {}, value)
        : value
  }
  for (const method of CORE_METHODS) {
    instance[method] = (...args: unknown[]) =>
      (router[method] as (...args: unknown[]) => unknown)(...args)
  }
  return instance
}

type Composed = ComponentType<Record<string, unknown>> & {
  getInitialProps?: unknown
  origGetInitialProps?: unknown
}

export function withRouter(Component: Composed) {
  function WithRouterWrapper(props: Record<string, unknown>) {
    return <Component router={pagesRouter} {...props} />
  }
  WithRouterWrapper.getInitialProps = Component.getInitialProps
  WithRouterWrapper.origGetInitialProps = Component.origGetInitialProps
  WithRouterWrapper.displayName = `withRouter(${Component.displayName || Component.name || 'Unknown'})`
  return WithRouterWrapper
}
