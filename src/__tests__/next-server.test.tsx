import { describe, expect, mock, test } from 'bun:test'
import {
  cacheLife,
  cacheTag,
  io,
  refresh,
  revalidatePath,
  revalidateTag,
  unstable_cache,
  unstable_cacheLife,
  unstable_cacheTag,
  unstable_noStore,
  updateTag,
} from '../next/cache.ts'
import { stringifyCookie } from '../next/cookies.ts'
import { cookies, draftMode, headers } from '../next/headers.ts'
import {
  resetNext,
  setCookies,
  setDraftMode,
  setHeaders,
} from '../next/index.ts'
import {
  after,
  connection,
  ImageResponse,
  NextRequest,
  NextResponse,
  URLPattern,
  userAgent,
  userAgentFromString,
} from '../next/server.ts'

describe('next/headers', () => {
  test('headers() are the ones a test sets, read-only', async () => {
    setHeaders({ 'x-a': '1' })
    const list = await headers()
    expect(list.get('x-a')).toBe('1')
    expect(() => list.set('x-a', '2')).toThrow('Headers cannot be modified')
    expect(() => list.append('x-b', '2')).toThrow('Headers cannot be modified')
    expect(() => list.delete('x-a')).toThrow('Headers cannot be modified')
  })

  test('cookies() are the ones a test sets, and keep what is written', async () => {
    setCookies({ theme: 'dark', lang: 'ko' })
    const jar = await cookies()
    expect(jar.get('theme')).toEqual({ name: 'theme', value: 'dark' })
    expect(jar.get({ name: 'lang', value: '' })?.value).toBe('ko')
    expect(jar.getAll()).toHaveLength(2)
    expect(jar.size).toBe(2)

    jar.set('a', '1').set({ name: 'b', value: '2' })
    expect(jar.delete('lang')).toBe(true)
    expect(jar.delete(['a', 'missing'])).toEqual([true, false])
    const next = await cookies()
    expect(next.has('b')).toBe(true)
    expect(next.has('lang')).toBe(false)
    expect([...next]).toEqual([
      ['theme', { name: 'theme', value: 'dark' }],
      ['b', { name: 'b', value: '2' }],
    ])
    expect(next.toString()).toBe('theme=dark; b=2')
    next.clear()
    expect((await cookies()).size).toBe(0)
  })

  test('draftMode() is off until enabled', async () => {
    const mode = await draftMode()
    expect(mode.isEnabled).toBe(false)
    mode.enable()
    expect((await draftMode()).isEnabled).toBe(true)
    mode.disable()
    expect(mode.isEnabled).toBe(false)
    setDraftMode(true)
    expect(mode.isEnabled).toBe(true)
  })
})

describe('next/cache', () => {
  test('records what is revalidated', async () => {
    revalidatePath('/posts', 'page')
    revalidateTag('posts', 'max')
    updateTag('posts')
    refresh()
    unstable_noStore()
    cacheLife('hours')
    cacheTag('a', 'b')
    await io()
    expect(revalidatePath).toHaveBeenCalledWith('/posts', 'page')
    expect(revalidateTag).toHaveBeenCalledWith('posts', 'max')
    expect(unstable_cacheLife).toBe(cacheLife)
    expect(unstable_cacheTag).toBe(cacheTag)
    for (const fn of [updateTag, refresh, unstable_noStore, cacheTag, io]) {
      expect(fn).toHaveBeenCalledTimes(1)
    }

    resetNext()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  test('unstable_cache caches nothing', async () => {
    const load = mock(async (id: number) => id * 2)
    const cached = unstable_cache(load, ['key'], { tags: ['t'] })
    expect(await cached(1)).toBe(2)
    expect(await cached(1)).toBe(2)
    expect(load).toHaveBeenCalledTimes(2)
  })
})

describe('NextRequest', () => {
  test('parses its URL and cookies, and writes cookies back', () => {
    const request = new NextRequest('http://localhost/a?b=1', {
      headers: { cookie: 'x=1; y=a%20b; broken' },
    })
    expect(request.nextUrl.pathname).toBe('/a')
    expect(request.nextUrl.searchParams.get('b')).toBe('1')
    const copy = request.nextUrl.clone()
    copy.pathname = '/c'
    expect(request.nextUrl.pathname).toBe('/a')

    expect(request.cookies.get('y')?.value).toBe('a b')
    request.cookies.set('z', 'c d')
    expect(request.headers.get('cookie')).toBe('x=1; y=a%20b; z=c%20d')
    expect(new NextRequest(request).cookies.get('z')?.value).toBe('c d')
    request.cookies.clear()
    expect(request.headers.get('cookie')).toBe('')
  })

  test('without a cookie header has no cookies', () => {
    expect(new NextRequest('http://localhost/').cookies.size).toBe(0)
    expect(new NextRequest(new Request('http://localhost/')).cookies.size).toBe(
      0,
    )
  })
})

describe('NextResponse', () => {
  test('json', async () => {
    const response = NextResponse.json({ a: 1 }, { status: 201 })
    expect(response).toBeInstanceOf(NextResponse)
    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ a: 1 })
  })

  test('redirect to an absolute URL with a redirect status', () => {
    const temporary = NextResponse.redirect('http://localhost/b')
    expect(temporary.status).toBe(307)
    expect(temporary.headers.get('location')).toBe('http://localhost/b')
    expect(
      NextResponse.redirect(new URL('http://localhost/c'), 308).status,
    ).toBe(308)
    const withInit = NextResponse.redirect('http://localhost/d', {
      status: 301,
      headers: { 'x-a': '1' },
    })
    expect(withInit.status).toBe(301)
    expect(withInit.headers.get('x-a')).toBe('1')

    expect(() => NextResponse.redirect('http://localhost/', 200)).toThrow(
      'Failed to execute "redirect" on "response": Invalid status code',
    )
    expect(() => NextResponse.redirect('/relative')).toThrow(
      'URL is malformed "/relative"',
    )
  })

  test('rewrite and next hand request headers on', () => {
    const rewrite = NextResponse.rewrite('http://localhost/r', {
      request: { headers: new Headers({ 'x-user': 'a' }) },
    })
    expect(rewrite.headers.get('x-middleware-rewrite')).toBe(
      'http://localhost/r',
    )
    expect(rewrite.headers.get('x-middleware-request-x-user')).toBe('a')
    expect(rewrite.headers.get('x-middleware-override-headers')).toBe('x-user')
    const next = NextResponse.next({ headers: { 'x-b': '1' } })
    expect(next.headers.get('x-middleware-next')).toBe('1')
    expect(next.headers.get('x-b')).toBe('1')
    expect(next.headers.has('x-middleware-override-headers')).toBe(false)
  })

  test('keeps the set-cookie headers it is given', () => {
    const response = new NextResponse(null, {
      headers: { 'set-cookie': 'a=1' },
    })
    expect(response.headers.get('set-cookie')).toBe('a=1')
  })

  test('cookies are written to set-cookie', () => {
    const response = new NextResponse()
    response.cookies
      .set('a', '1', { httpOnly: true, maxAge: 60 })
      .set({ name: 'b', value: '2', path: '/p' })
    expect(response.cookies.get('a')?.expires).toBeInstanceOf(Date)
    expect(
      new NextResponse().cookies
        .set({ name: 'c', value: '3', expires: 0 })
        .get('c')?.expires,
    ).toEqual(new Date(0))
    expect(response.cookies.get('a')?.path).toBe('/')
    expect(response.cookies.get({ name: 'b', value: '' })?.path).toBe('/p')
    expect(response.cookies.has('a')).toBe(true)
    expect(response.cookies.getAll()).toHaveLength(2)
    expect(response.headers.getSetCookie()).toEqual([
      expect.stringMatching(/^a=1; Path=\/; Expires=.+; Max-Age=60; HttpOnly$/),
      'b=2; Path=/p',
    ])

    response.cookies.delete('a').delete({ name: 'b', path: '/p' })
    expect(response.cookies.toString()).toBe(
      'a=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; b=; Path=/p; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    )
  })

  test('stringifyCookie writes every attribute', () => {
    expect(
      stringifyCookie({
        name: 'n',
        value: 'v w',
        path: '/',
        expires: 0,
        maxAge: 1,
        domain: 'example.com',
        secure: true,
        httpOnly: true,
        sameSite: 'lax',
        partitioned: true,
        priority: 'high',
      }),
    ).toBe(
      'n=v%20w; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=1; Domain=example.com; Secure; HttpOnly; SameSite=lax; Partitioned; Priority=high',
    )
  })
})

describe('next/server helpers', () => {
  test('userAgent tells bots apart', () => {
    expect(
      userAgentFromString('Mozilla/5.0 (compatible; Googlebot/2.1)').isBot,
    ).toBe(true)
    expect(userAgentFromString('Mozilla/5.0').isBot).toBe(false)
    expect(userAgentFromString(undefined)).toEqual({
      ua: '',
      isBot: false,
      browser: {},
      engine: {},
      os: {},
      device: {},
      cpu: {},
    })
    expect(userAgent({ headers: new Headers({ 'user-agent': 'x' }) }).ua).toBe(
      'x',
    )
    expect(userAgent({ headers: new Headers() }).ua).toBe('')
  })

  test('after runs its task after the current work', async () => {
    const task = mock(() => {})
    after(task)
    after(Promise.resolve())
    expect(task).not.toHaveBeenCalled()
    await Promise.resolve()
    expect(task).toHaveBeenCalledTimes(1)
  })

  test('connection resolves, and URLPattern is the global one', async () => {
    expect(await connection()).toBeUndefined()
    expect(URLPattern).toBe(
      (globalThis as unknown as { URLPattern: unknown }).URLPattern,
    )
  })

  test('ImageResponse is an empty PNG response with the headers of Next.js', () => {
    const response = new ImageResponse(<div />, {
      status: 201,
      headers: { 'x-a': '1', 'cache-control': 'no-store' },
    })
    expect(response.status).toBe(201)
    expect(response.headers.get('content-type')).toBe('image/png')
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(response.headers.get('x-a')).toBe('1')
    expect(new ImageResponse(<div />).headers.get('cache-control')).toBe(
      'public, immutable, no-transform, max-age=31536000',
    )

    const env = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'
    expect(new ImageResponse(<div />).headers.get('cache-control')).toBe(
      'no-cache, no-store',
    )
    process.env.NODE_ENV = env
  })
})
