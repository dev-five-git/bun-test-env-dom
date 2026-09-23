import { describe, expect, test } from 'bun:test'
import { useContext } from 'react'
import { renderHook } from '../index.ts'
import {
  resetNext,
  router,
  setParams,
  setSegments,
  setUrl,
} from '../next/index.ts'
import {
  forbidden,
  notFound,
  permanentRedirect,
  ReadonlyURLSearchParams,
  RedirectType,
  redirect,
  ServerInsertedHTMLContext,
  unauthorized,
  unstable_isUnrecognizedActionError,
  unstable_rethrow,
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
  useSelectedLayoutSegment,
  useSelectedLayoutSegments,
  useServerInsertedHTML,
} from '../next/navigation.ts'

const thrown = (fn: () => unknown) => {
  try {
    fn()
  } catch (error) {
    return error
  }
}

describe('hooks', () => {
  test('read the URL, params and segments a test sets', () => {
    setUrl('/posts/1?tab=a&tab=b')
    setParams({ id: '1' })
    expect(usePathname()).toBe('/posts/1')
    expect(useSearchParams().getAll('tab')).toEqual(['a', 'b'])
    expect(useParams()).toEqual({ id: '1' })
    expect(useSelectedLayoutSegments()).toEqual(['posts', '1'])
    expect(useSelectedLayoutSegment()).toBe('posts')

    setSegments(['(shop)', 'cart'])
    expect(useSelectedLayoutSegments('modal')).toEqual(['(shop)', 'cart'])
  })

  test('resolve a relative URL against the current one', () => {
    setUrl('/posts/1')
    setUrl('2?page=3')
    expect(usePathname()).toBe('/posts/2')
    expect(useSearchParams().get('page')).toBe('3')
  })

  test('start every test at the root', () => {
    expect(usePathname()).toBe('/')
    expect(useSearchParams().size).toBe(0)
    expect(useParams()).toEqual({})
    expect(useSelectedLayoutSegment()).toBeNull()
  })

  test('useRouter returns the router a test asserts on', () => {
    useRouter().push('/a', { scroll: false })
    expect(router.push).toHaveBeenCalledWith('/a', { scroll: false })
  })

  test('useServerInsertedHTML does nothing in the browser', () => {
    const { result } = renderHook(() => {
      useServerInsertedHTML(() => <style />)
      return useContext(ServerInsertedHTMLContext)
    })
    expect(result.current).toBeNull()
  })
})

test('resetNext restores the URL and every mock', () => {
  setUrl('/a')
  router.push.mockImplementation(() => {
    throw new Error('stubbed')
  })
  expect(() => router.push('/b')).toThrow('stubbed')

  resetNext()
  expect(usePathname()).toBe('/')
  expect(router.push).not.toHaveBeenCalled()
  expect(() => router.push('/c')).not.toThrow()
})

test('search params are read-only', () => {
  const params = new ReadonlyURLSearchParams('a=1')
  for (const method of ['append', 'delete', 'set', 'sort'] as const) {
    expect(() => (params[method] as () => void)()).toThrow(
      'Method unavailable on `ReadonlyURLSearchParams`',
    )
  }
  expect(params.get('a')).toBe('1')
})

describe('errors carry the digest of Next.js', () => {
  test.each([
    [() => redirect('/a'), 'NEXT_REDIRECT', 'NEXT_REDIRECT;replace;/a;307;'],
    [
      () => redirect('/a', RedirectType.push),
      'NEXT_REDIRECT',
      'NEXT_REDIRECT;push;/a;307;',
    ],
    [
      () => permanentRedirect('/b'),
      'NEXT_REDIRECT',
      'NEXT_REDIRECT;replace;/b;308;',
    ],
    [
      () => notFound(),
      'NEXT_HTTP_ERROR_FALLBACK;404',
      'NEXT_HTTP_ERROR_FALLBACK;404',
    ],
    [
      () => forbidden(),
      'NEXT_HTTP_ERROR_FALLBACK;403',
      'NEXT_HTTP_ERROR_FALLBACK;403',
    ],
    [
      () => unauthorized(),
      'NEXT_HTTP_ERROR_FALLBACK;401',
      'NEXT_HTTP_ERROR_FALLBACK;401',
    ],
  ])('%#', (fn, message, digest) => {
    expect(thrown(fn)).toMatchObject({ message, digest })
  })

  test('unstable_rethrow passes on control flow, even wrapped', () => {
    const redirectError = thrown(() => redirect('/a'))
    const bailout = Object.assign(new Error('bailout'), {
      digest: 'BAILOUT_TO_CLIENT_SIDE_RENDERING',
    })
    expect(thrown(() => unstable_rethrow(redirectError))).toBe(redirectError)
    expect(thrown(() => unstable_rethrow(bailout))).toBe(bailout)
    expect(
      thrown(() =>
        unstable_rethrow(new Error('wrapped', { cause: redirectError })),
      ),
    ).toBe(redirectError)
    expect(thrown(() => unstable_rethrow(new Error('own')))).toBeUndefined()
    expect(thrown(() => unstable_rethrow('text'))).toBeUndefined()
  })

  test('unstable_isUnrecognizedActionError checks the name', () => {
    const error = new Error('gone')
    error.name = 'UnrecognizedActionError'
    expect(unstable_isUnrecognizedActionError(error)).toBe(true)
    expect(unstable_isUnrecognizedActionError(new Error('other'))).toBe(false)
  })
})
