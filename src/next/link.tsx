import {
  type AnchorHTMLAttributes,
  Children,
  cloneElement,
  createElement,
  forwardRef,
  type MouseEvent,
  type ReactElement,
} from 'react'

import { appRouter, state } from './state.ts'

type QueryValue = string | number | boolean | null | undefined

export interface UrlObject {
  auth?: string | null
  hash?: string | null
  host?: string | null
  hostname?: string | null
  pathname?: string | null
  port?: string | number | null
  protocol?: string | null
  query?: string | null | Record<string, QueryValue | readonly QueryValue[]>
  search?: string | null
  slashes?: boolean | null
}

export type Url = string | UrlObject

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: Url
  as?: Url
  replace?: boolean
  scroll?: boolean
  shallow?: boolean
  passHref?: boolean
  prefetch?: boolean | 'auto' | null
  locale?: string | false
  legacyBehavior?: boolean
  onNavigate?: (event: { preventDefault(): void }) => void
  transitionTypes?: string[]
  unstable_dynamicOnHover?: boolean
}

const SLASHED_PROTOCOLS = /https?|ftp|gopher|file/
const ABSOLUTE_URL = /^[a-zA-Z][a-zA-Z\d+\-.]*?:/

const stringifyQueryValue = (value: QueryValue) =>
  typeof value === 'string'
    ? value
    : (typeof value === 'number' && !Number.isNaN(value)) ||
        typeof value === 'boolean'
      ? String(value)
      : ''

/** Next's `formatUrl`: how a url object `href` is written into the markup. */
export function formatUrl(url: Url): string {
  if (typeof url === 'string') return url
  let protocol = url.protocol || ''
  let pathname = url.pathname || ''
  let hash = url.hash || ''
  let query = url.query || ''
  const auth = url.auth
    ? `${encodeURIComponent(url.auth).replace(/%3A/i, ':')}@`
    : ''
  let host: string | false = false
  if (url.host) {
    host = auth + url.host
  } else if (url.hostname) {
    host =
      auth + (url.hostname.includes(':') ? `[${url.hostname}]` : url.hostname)
    if (url.port) host += `:${url.port}`
  }
  if (typeof query === 'object') {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(query)) {
      if (Array.isArray(value)) {
        for (const item of value) params.append(key, stringifyQueryValue(item))
      } else {
        params.set(key, stringifyQueryValue(value as QueryValue))
      }
    }
    query = String(params)
  }
  let search = url.search || (query && `?${query}`) || ''
  if (protocol && !protocol.endsWith(':')) protocol += ':'
  if (
    url.slashes ||
    ((!protocol || SLASHED_PROTOCOLS.test(protocol)) && host !== false)
  ) {
    host = `//${host || ''}`
    if (pathname && pathname[0] !== '/') pathname = `/${pathname}`
  } else if (!host) {
    host = ''
  }
  if (hash && hash[0] !== '#') hash = `#${hash}`
  if (search && search[0] !== '?') search = `?${search}`
  pathname = pathname.replace(/[?#]/g, encodeURIComponent)
  search = search.replace('#', '%23')
  return `${protocol}${host}${pathname}${search}${hash}`
}

/** A relative URL, or an absolute one on the page's own origin. */
function isLocalURL(url: string) {
  if (!ABSOLUTE_URL.test(url)) return true
  try {
    return new URL(url).origin === state.url.origin
  } catch {
    return false
  }
}

/**
 * `next/link`. A click Next.js would handle client-side calls `router.push`
 * (or `replace`) with the `href`; the browser keeps modified clicks, other
 * targets, downloads and URLs of another origin.
 */
const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  {
    href,
    as,
    children,
    replace,
    scroll,
    shallow: _shallow,
    passHref,
    prefetch: _prefetch,
    locale: _locale,
    legacyBehavior,
    onNavigate,
    transitionTypes: _transitionTypes,
    unstable_dynamicOnHover: _dynamicOnHover,
    onClick,
    ...props
  },
  ref,
) {
  const url = formatUrl(as ?? href)
  // Text gets an `<a>` of its own, which then takes the href.
  const child = legacyBehavior
    ? (Children.only(
        typeof children === 'string' || typeof children === 'number'
          ? createElement('a', null, children)
          : children,
      ) as ReactElement<AnchorHTMLAttributes<HTMLAnchorElement>>)
    : undefined

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    const clickHandler = child ? child.props.onClick : onClick
    clickHandler?.(event)
    if (event.defaultPrevented) return
    const element = event.currentTarget
    const target = element.getAttribute('target')
    const modified =
      (target && target !== '_self') ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button === 1
    if (
      (element.nodeName.toUpperCase() === 'A' && modified) ||
      element.hasAttribute('download') ||
      !isLocalURL(url)
    ) {
      return
    }
    event.preventDefault()
    let prevented = false
    onNavigate?.({
      preventDefault: () => {
        prevented = true
      },
    })
    if (prevented) return
    const navigate = replace ? appRouter.replace : appRouter.push
    navigate(url, { scroll: scroll ?? true })
  }

  if (child) {
    // The child gets the click handler, and the href where Next.js hands it
    // on: absolute URLs, `passHref`, or an `<a>` without an href of its own.
    const withHref =
      ABSOLUTE_URL.test(url) ||
      passHref ||
      (child.type === 'a' && !('href' in child.props))
    return cloneElement(child, {
      onClick: handleClick,
      ...(withHref ? { href: url } : {}),
    })
  }

  // Props before href, like Next.js, so the markup - and snapshots - match.
  return (
    <a {...props} ref={ref} href={url} onClick={handleClick}>
      {children}
    </a>
  )
})

export default Link

export const useLinkStatus = () => ({ pending: false })
