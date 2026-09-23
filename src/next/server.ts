import type { ReactElement } from 'react'

import {
  parseCookieHeader,
  RequestCookies,
  ResponseCookies,
  serializeCookies,
} from './cookies.ts'

// In a DOM test `Request` and `Response` are happy-dom's, which drop what a
// browser keeps from pages: `cookie` and `set-cookie`. These are a server's
// requests and responses, so their headers keep them.
function serverHeaders(target: Request | Response, init?: HeadersInit) {
  const headers = new Headers(init)
  Object.defineProperty(target, 'headers', { value: headers })
  return headers
}

export class NextRequest extends Request {
  readonly nextUrl: URL & { clone(): URL }
  readonly cookies: RequestCookies

  constructor(input: URL | RequestInfo, init: RequestInit = {}) {
    super(input, init)
    const headers = serverHeaders(
      this,
      init.headers ?? (input instanceof Request ? input.headers : undefined),
    )
    const url = new URL(this.url)
    this.nextUrl = Object.assign(url, { clone: () => new URL(url) })
    const jar = parseCookieHeader(headers.get('cookie'))
    this.cookies = new RequestCookies(jar, () =>
      headers.set('cookie', serializeCookies(jar)),
    )
  }
}

interface MiddlewareResponseInit extends ResponseInit {
  request?: { headers?: Headers }
}

const REDIRECTS = new Set([301, 302, 303, 307, 308])

// Next.js requires an absolute URL for redirects and rewrites.
function validateURL(url: string | URL) {
  try {
    return String(new URL(String(url)))
  } catch (error) {
    throw new Error(
      `URL is malformed "${String(url)}". Please use only absolute URLs - https://nextjs.org/docs/messages/middleware-relative-urls`,
      { cause: error },
    )
  }
}

// How `NextResponse.next` and `rewrite` hand modified request headers on.
function middlewareHeaders(init: MiddlewareResponseInit | undefined) {
  const headers = new Headers(init?.headers)
  const request = init?.request?.headers
  if (request) {
    const keys: string[] = []
    for (const [key, value] of request) {
      headers.set(`x-middleware-request-${key}`, value)
      keys.push(key)
    }
    headers.set('x-middleware-override-headers', keys.join(','))
  }
  return headers
}

export class NextResponse extends Response {
  readonly cookies: ResponseCookies

  constructor(body?: BodyInit | null, init?: ResponseInit) {
    super(body, init)
    this.cookies = new ResponseCookies(serverHeaders(this, init?.headers))
  }

  static override json(body: unknown, init?: ResponseInit): NextResponse {
    const response = Response.json(body, init)
    return new NextResponse(response.body, response)
  }

  static override redirect(
    url: string | URL,
    init?: number | ResponseInit,
  ): NextResponse {
    const status = typeof init === 'number' ? init : (init?.status ?? 307)
    if (!REDIRECTS.has(status)) {
      throw new RangeError(
        'Failed to execute "redirect" on "response": Invalid status code',
      )
    }
    const options = typeof init === 'object' ? init : {}
    const headers = new Headers(options.headers)
    headers.set('Location', validateURL(url))
    return new NextResponse(null, { ...options, headers, status })
  }

  static rewrite(
    destination: string | URL,
    init?: MiddlewareResponseInit,
  ): NextResponse {
    const headers = middlewareHeaders(init)
    headers.set('x-middleware-rewrite', validateURL(destination))
    return new NextResponse(null, { ...init, headers })
  }

  static next(init?: MiddlewareResponseInit): NextResponse {
    const headers = middlewareHeaders(init)
    headers.set('x-middleware-next', '1')
    return new NextResponse(null, { ...init, headers })
  }
}

const BOT =
  /Googlebot|Mediapartners-Google|AdsBot-Google|googleweblight|Storebot-Google|Google-PageRenderer|Google-InspectionTool|Bingbot|BingPreview|Slurp|DuckDuckBot|baiduspider|yandex|sogou|LinkedInBot|bitlybot|tumblr|vkShare|quora link preview|facebookexternalhit|facebookcatalog|Twitterbot|applebot|redditbot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|ia_archiver|GPTBot/i

/**
 * `isBot` is Next's own check. Browser, engine, OS, device and CPU come from
 * ua-parser-js in Next.js and are left empty here.
 */
export function userAgentFromString(ua: string | undefined) {
  return {
    ua: ua ?? '',
    isBot: ua === undefined ? false : BOT.test(ua),
    browser: {},
    engine: {},
    os: {},
    device: {},
    cpu: {},
  }
}

export function userAgent({ headers }: { headers: Headers }) {
  return userAgentFromString(headers.get('user-agent') || undefined)
}

/** Runs the task after the current work, as Next.js does after a response. */
export function after(task: Promise<unknown> | (() => unknown)): void {
  queueMicrotask(() => {
    if (typeof task === 'function') task()
  })
}

export async function connection(): Promise<void> {}

export const URLPattern = (globalThis as unknown as { URLPattern?: unknown })
  .URLPattern

/**
 * An empty PNG response with Next's headers. Rendering the image needs the
 * satori and resvg pipeline, which a test does not run.
 */
export class ImageResponse extends Response {
  constructor(
    _element: ReactElement,
    options: ResponseInit & Record<string, unknown> = {},
  ) {
    const headers = new Headers({
      'content-type': 'image/png',
      'cache-control':
        process.env.NODE_ENV === 'development'
          ? 'no-cache, no-store'
          : 'public, immutable, no-transform, max-age=31536000',
    })
    for (const [key, value] of new Headers(options.headers)) {
      headers.set(key, value)
    }
    super(null, {
      status: options.status,
      statusText: options.statusText,
      headers,
    })
  }
}
