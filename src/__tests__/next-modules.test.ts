import { expect, test } from 'bun:test'
import { GOOGLE_FONTS } from '../next/google-fonts.ts'

// `Object.keys(await import(specifier))` against next@16.3.6, without the
// `default` that CJS interop adds to modules that have none. A named import
// links only when its name is listed, so the lists have to be complete.
const EXPORTS: Record<string, string[]> = {
  'next/navigation': [
    'ReadonlyURLSearchParams',
    'RedirectType',
    'ServerInsertedHTMLContext',
    'forbidden',
    'notFound',
    'permanentRedirect',
    'redirect',
    'unauthorized',
    'unstable_isUnrecognizedActionError',
    'unstable_rethrow',
    'useParams',
    'usePathname',
    'useRouter',
    'useSearchParams',
    'useSelectedLayoutSegment',
    'useSelectedLayoutSegments',
    'useServerInsertedHTML',
  ],
  'next/link': ['default', 'useLinkStatus'],
  'next/image': ['default', 'getImageProps'],
  'next/legacy/image': ['default'],
  'next/script': ['default', 'handleClientScriptLoad', 'initScriptLoader'],
  'next/head': ['default', 'defaultHead'],
  'next/dynamic': ['default', 'noSSR'],
  'next/form': ['default'],
  'next/headers': ['cookies', 'draftMode', 'headers'],
  'next/cache': [
    'cacheLife',
    'cacheTag',
    'io',
    'refresh',
    'revalidatePath',
    'revalidateTag',
    'unstable_cache',
    'unstable_cacheLife',
    'unstable_cacheTag',
    'unstable_noStore',
    'updateTag',
  ],
  'next/server': [
    'ImageResponse',
    'NextRequest',
    'NextResponse',
    'URLPattern',
    'after',
    'connection',
    'userAgent',
    'userAgentFromString',
  ],
  'next/og': ['ImageResponse'],
  'next/font/local': ['default'],
  'next/router': [
    'Router',
    'back',
    'beforePopState',
    'createRouter',
    'default',
    'makePublicRouterInstance',
    'prefetch',
    'push',
    'ready',
    'readyCallbacks',
    'reload',
    'replace',
    'router',
    'useRouter',
    'withRouter',
  ],
  'next/compat/router': ['useRouter'],
  'next/document': ['Head', 'Html', 'Main', 'NextScript', 'default'],
  'next/app': ['default', 'getInitialProps', 'origGetInitialProps'],
  'next/error': [
    'catchError',
    'default',
    'displayName',
    'getInitialProps',
    'origGetInitialProps',
  ],
  'next/offline': ['OfflineProvider', 'dispatchOfflineChange', 'useOffline'],
  'next/web-vitals': ['useReportWebVitals'],
}

test.each(
  Object.entries(EXPORTS),
)('%s has the exports of Next.js', async (specifier, names) => {
  const module = await import(specifier)
  expect(Object.keys(module).sort()).toEqual(names)
})

test('next/font/google has a function for every Google font', async () => {
  const google = await import('next/font/google')
  expect(Object.keys(google).sort()).toEqual([...GOOGLE_FONTS].sort())
  expect(google.Inter().className).toBe('__className_inter')
})
