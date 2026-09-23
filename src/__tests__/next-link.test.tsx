import { describe, expect, mock, test } from 'bun:test'
import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react'
import { fireEvent, render } from '../index.ts'
import { router, setUrl } from '../next/index.ts'
import Link, { formatUrl, useLinkStatus } from '../next/link.tsx'

/**
 * Clicks `element` and reports whether the click was handled in the page
 * (`defaultPrevented`). The browser's own navigation is cancelled afterwards,
 * so happy-dom never leaves the page.
 */
function click(element: Element, init?: MouseEventInit) {
  let prevented: boolean | undefined
  const listener = (event: Event) => {
    prevented = event.defaultPrevented
    event.preventDefault()
  }
  document.addEventListener('click', listener)
  fireEvent.click(element, init)
  document.removeEventListener('click', listener)
  return prevented
}

describe('markup', () => {
  test('matches next/link: props, then href', () => {
    const { container } = render(
      <Link
        className="nav"
        href="/about"
        prefetch={false}
        replace
        scroll={false}
        shallow
        locale="en"
        transitionTypes={['slide']}
        unstable_dynamicOnHover
      >
        About
      </Link>,
    )
    expect(container.innerHTML).toBe('<a class="nav" href="/about">About</a>')
  })

  test('formats a url object, and prefers `as`', () => {
    const view = render(
      <>
        <Link
          href={{
            pathname: '/search',
            query: { q: 'a b', tag: ['x', 'y'] },
            hash: 'top',
          }}
        >
          search
        </Link>
        <Link href="/posts/[id]" as="/posts/1">
          post
        </Link>
      </>,
    )
    expect(view.getByText('search').getAttribute('href')).toBe(
      '/search?q=a+b&tag=x&tag=y#top',
    )
    expect(view.getByText('post').getAttribute('href')).toBe('/posts/1')
  })

  test('useLinkStatus is never pending', () => {
    expect(useLinkStatus()).toEqual({ pending: false })
  })
})

describe('a click', () => {
  test('navigates through router.push', () => {
    const view = render(<Link href="/about">About</Link>)
    expect(click(view.getByText('About'))).toBe(true)
    expect(router.push).toHaveBeenCalledWith('/about', { scroll: true })
  })

  test('replaces, and keeps the scroll position, when asked', () => {
    const view = render(
      <Link href="/about" replace scroll={false}>
        About
      </Link>,
    )
    click(view.getByText('About'))
    expect(router.replace).toHaveBeenCalledWith('/about', { scroll: false })
    expect(router.push).not.toHaveBeenCalled()
  })

  test('calls onClick, which can cancel the navigation', () => {
    const onClick = mock((event: { preventDefault(): void }) => {
      event.preventDefault()
    })
    const view = render(
      <Link href="/about" onClick={onClick}>
        About
      </Link>,
    )
    click(view.getByText('About'))
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(router.push).not.toHaveBeenCalled()
  })

  test('onNavigate can cancel the navigation, but not the default', () => {
    const view = render(
      <Link href="/about" onNavigate={(event) => event.preventDefault()}>
        About
      </Link>,
    )
    expect(click(view.getByText('About'))).toBe(true)
    expect(router.push).not.toHaveBeenCalled()
  })

  test.each([
    ['ctrl', { ctrlKey: true }],
    ['meta', { metaKey: true }],
    ['shift', { shiftKey: true }],
    ['alt', { altKey: true }],
    ['middle button', { button: 1 }],
  ])('with %s is left to the browser', (_, init) => {
    const view = render(<Link href="/about">About</Link>)
    expect(click(view.getByText('About'), init)).toBe(false)
    expect(router.push).not.toHaveBeenCalled()
  })

  test.each([
    ['another window', { target: '_blank' }],
    ['a download', { download: 'file' }],
  ])('on a link to %s is left to the browser', (_, props) => {
    const view = render(
      <Link href="/file" {...props}>
        link
      </Link>,
    )
    expect(click(view.getByText('link'))).toBe(false)
    expect(router.push).not.toHaveBeenCalled()
  })

  test('on a link to this window navigates', () => {
    const view = render(
      <Link href="/about" target="_self">
        About
      </Link>,
    )
    click(view.getByText('About'))
    expect(router.push).toHaveBeenCalledWith('/about', { scroll: true })
  })

  test('on a URL of this origin navigates; any other is the browser', () => {
    setUrl('/current')
    const view = render(
      <>
        <Link href="http://localhost/same">same</Link>
        <Link href="https://example.com/other">other</Link>
        <Link href="http://[">broken</Link>
      </>,
    )
    click(view.getByText('same'))
    expect(router.push).toHaveBeenCalledWith('http://localhost/same', {
      scroll: true,
    })
    expect(click(view.getByText('other'))).toBe(false)
    expect(click(view.getByText('broken'))).toBe(false)
    expect(router.push).toHaveBeenCalledTimes(1)
  })
})

describe('legacyBehavior', () => {
  function Button(props: ButtonHTMLAttributes<HTMLButtonElement>) {
    return <button type="button" {...props} />
  }

  function Anchor(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
    return <a {...props}>anchor</a>
  }

  test('wraps text in an anchor that takes the href', () => {
    const { container } = render(
      <Link href="/about" legacyBehavior>
        About
      </Link>,
    )
    expect(container.innerHTML).toBe('<a href="/about">About</a>')
  })

  test('gives the child the click handler, and calls its own', () => {
    const onClick = mock(() => {})
    const view = render(
      <Link href="/about" legacyBehavior>
        <Button onClick={onClick}>go</Button>
      </Link>,
    )
    const button = view.getByText('go')
    expect(button.hasAttribute('href')).toBe(false)
    click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(router.push).toHaveBeenCalledWith('/about', { scroll: true })
  })

  test('passes the href on with passHref, or for an absolute URL', () => {
    const view = render(
      <>
        <Link href="/about" legacyBehavior passHref>
          <Anchor />
        </Link>
        <Link href="https://example.com/" legacyBehavior>
          <Button>external</Button>
        </Link>
      </>,
    )
    expect(view.getByText('anchor').getAttribute('href')).toBe('/about')
    expect(view.getByText('external').getAttribute('href')).toBe(
      'https://example.com/',
    )
  })
})

describe('formatUrl, as Next.js writes url objects', () => {
  test.each([
    ['/plain', '/plain'],
    [{}, ''],
    [{ pathname: '/a', query: {} }, '/a'],
    [{ pathname: '/a', search: '?s=1', query: { q: '2' } }, '/a?s=1'],
    [{ pathname: '/a', search: 's=1' }, '/a?s=1'],
    [{ pathname: '/a', query: 'q=1' }, '/a?q=1'],
    [
      {
        pathname: '/a',
        query: { s: 's', n: 1, nan: Number.NaN, b: false, u: undefined },
      },
      '/a?s=s&n=1&nan=&b=false&u=',
    ],
    [{ pathname: '/a', hash: 'h' }, '/a#h'],
    [{ pathname: '/a?b#c', search: '?d#e' }, '/a%3Fb%23c?d%23e'],
    [
      { protocol: 'https', hostname: 'example.com', port: 8080, pathname: 'p' },
      'https://example.com:8080/p',
    ],
    [
      { protocol: 'http:', host: 'h:1', auth: 'user:pass' },
      'http://user:pass@h:1',
    ],
    [{ protocol: 'http', hostname: '::1' }, 'http://[::1]'],
    [{ protocol: 'mailto', pathname: 'a@b.c' }, 'mailto:a@b.c'],
    // A quirk Next.js has too: `slashes` with no host.
    [{ slashes: true, pathname: 'p' }, '///p'],
  ])('%p', (url, href) => {
    expect(formatUrl(url)).toBe(href)
  })
})
