import { beforeEach, mock } from 'bun:test'

import App from './app.tsx'
import * as cache from './cache.ts'
import Document, {
  Head as DocumentHead,
  Html,
  Main,
  NextScript,
} from './document.tsx'
import dynamic, { noSSR } from './dynamic.tsx'
import ErrorPage, { catchError } from './error.tsx'
import localFont, { googleFonts } from './font.ts'
import Form from './form.tsx'
import Head, { defaultHead } from './head.tsx'
import { cookies, draftMode, headers } from './headers.ts'
import Image, { getImageProps, LegacyImage } from './image.tsx'
import Link, { useLinkStatus } from './link.tsx'
import * as navigation from './navigation.ts'
import {
  dispatchOfflineChange,
  OfflineProvider,
  useOffline,
} from './offline.ts'
import {
  createRouter,
  makePublicRouterInstance,
  pagesRouter,
  Router,
  useCompatRouter,
  useRouter,
  withRouter,
} from './router.tsx'
import Script, { handleClientScriptLoad, initScriptLoader } from './script.ts'
import * as server from './server.ts'
import { appRouter, type Params, resetState, setUrl, state } from './state.ts'
import { useReportWebVitals } from './web-vitals.ts'

// Every public `next/*` module, with the exports it has at runtime. A named
// import links only when the name is listed, so none of these is a Proxy.
const { isNextRouterError: _, ...nextNavigation } = navigation

const modules: Record<string, () => object> = {
  'next/navigation': () => nextNavigation,
  'next/link': () => ({ default: Link, useLinkStatus }),
  'next/image': () => ({ default: Image, getImageProps }),
  'next/legacy/image': () => ({ default: LegacyImage }),
  'next/script': () => ({
    default: Script,
    handleClientScriptLoad,
    initScriptLoader,
  }),
  'next/head': () => ({ default: Head, defaultHead }),
  'next/dynamic': () => ({ default: dynamic, noSSR }),
  'next/form': () => ({ default: Form }),
  'next/headers': () => ({ cookies, draftMode, headers }),
  'next/cache': () => ({ ...cache }),
  'next/server': () => ({ ...server }),
  'next/og': () => ({ ImageResponse: server.ImageResponse }),
  'next/font/google': () => googleFonts,
  'next/font/local': () => ({ default: localFont }),
  'next/router': () => ({
    default: pagesRouter,
    Router,
    createRouter,
    makePublicRouterInstance,
    useRouter,
    withRouter,
    router: pagesRouter,
    readyCallbacks: pagesRouter.readyCallbacks,
    ready: pagesRouter.ready,
    push: pagesRouter.push,
    replace: pagesRouter.replace,
    reload: pagesRouter.reload,
    back: pagesRouter.back,
    prefetch: pagesRouter.prefetch,
    beforePopState: pagesRouter.beforePopState,
  }),
  'next/compat/router': () => ({ useRouter: useCompatRouter }),
  'next/document': () => ({
    default: Document,
    Html,
    Head: DocumentHead,
    Main,
    NextScript,
  }),
  'next/app': () => ({
    default: App,
    getInitialProps: App.getInitialProps,
    origGetInitialProps: App.origGetInitialProps,
  }),
  'next/error': () => ({
    default: ErrorPage,
    catchError,
    displayName: ErrorPage.displayName,
    getInitialProps: ErrorPage.getInitialProps,
    origGetInitialProps: ErrorPage.origGetInitialProps,
  }),
  'next/offline': () => ({
    OfflineProvider,
    useOffline,
    dispatchOfflineChange,
  }),
  'next/web-vitals': () => ({ useReportWebVitals }),
}

for (const [specifier, factory] of Object.entries(modules)) {
  mock.module(specifier, factory)
}

// `next/root-params` exports one getter per root layout param, generated for
// each app, so its exports are the names tests have set.
const rootParamNames = new Set<string>()

function registerRootParams() {
  mock.module('next/root-params', () =>
    Object.fromEntries(
      [...rootParamNames].map((name) => [
        name,
        async () => state.rootParams[name],
      ]),
    ),
  )
}

registerRootParams()

beforeEach(resetState)

/**
 * The router `useRouter()` from `next/navigation` returns, and the one
 * `next/link` and `next/form` navigate through. Its methods are mocks.
 */
export const router = appRouter

/** The URL `usePathname`, `useSearchParams` and the Pages Router read. */
export { setUrl }

/** The dynamic route params: `useParams()` and the Pages Router's `query`. */
export function setParams(params: Params) {
  state.params = params
}

/** The Pages Router route, like `/posts/[id]`: `pathname` and `route`. */
export function setRoute(route: string) {
  state.route = route
}

/** What `useSelectedLayoutSegments()` returns, in place of the path's. */
export function setSegments(segments: string[]) {
  state.segments = segments
}

/** The request headers `headers()` returns. */
export function setHeaders(init: HeadersInit) {
  state.headers = new Headers(init)
}

/** The request cookies `cookies()` returns. */
export function setCookies(cookies: Record<string, string>) {
  state.cookies = new Map(Object.entries(cookies))
}

/** Whether `draftMode()` is enabled. */
export function setDraftMode(enabled: boolean) {
  state.draftMode = enabled
}

/** What `useOffline()` returns. */
export function setOffline(offline: boolean) {
  state.offline = offline
}

/**
 * The params `next/root-params` reads. A module that imports one links only
 * once it is set, so load that module afterwards, with `await import()`.
 */
export function setRootParams(params: Record<string, string>) {
  state.rootParams = params
  for (const name of Object.keys(params)) rootParamNames.add(name)
  registerRootParams()
}

/** Restores all of the above, and clears every mock. Runs before each test. */
export const resetNext = resetState
