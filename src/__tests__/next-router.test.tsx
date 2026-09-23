import { describe, expect, mock, test } from 'bun:test'
import { render } from '../index.ts'
import {
  resetNext,
  setDraftMode,
  setParams,
  setRoute,
  setUrl,
} from '../next/index.ts'
import {
  createRouter,
  makePublicRouterInstance,
  pagesRouter,
  Router,
  useCompatRouter,
  useRouter,
  withRouter,
} from '../next/router.tsx'

describe('the Pages Router', () => {
  test('starts at the root, ready', () => {
    const router = useRouter()
    expect(router).toBe(pagesRouter)
    expect(router.pathname).toBe('/')
    expect(router.route).toBe('/')
    expect(router.asPath).toBe('/')
    expect(router.query).toEqual({})
    expect(router.isReady).toBe(true)
    expect(router.isPreview).toBe(false)
  })

  test('reads the route, URL and params a test sets', () => {
    setUrl('/posts/1?tab=a&tab=b&x=1#c')
    setRoute('/posts/[id]')
    setParams({ id: '1' })
    const router = useRouter()
    expect(router.pathname).toBe('/posts/[id]')
    expect(router.route).toBe('/posts/[id]')
    expect(router.asPath).toBe('/posts/1?tab=a&tab=b&x=1#c')
    expect(router.query).toEqual({ tab: ['a', 'b'], x: '1', id: '1' })
    setDraftMode(true)
    expect(router.isPreview).toBe(true)
  })

  test('keeps the same query object until the URL or params change', () => {
    setUrl('/?a=1')
    const query = useRouter().query
    expect(useRouter().query).toBe(query)
    setParams({ id: '2' })
    expect(useRouter().query).not.toBe(query)
    expect(useRouter().query).toEqual({ a: '1', id: '2' })
  })

  test('records navigation, which resolves like Next.js', async () => {
    const router = useRouter()
    expect(await router.push('/a', undefined, { shallow: true })).toBe(true)
    expect(await router.replace({ pathname: '/b' })).toBe(true)
    await router.prefetch('/c')
    router.reload()
    router.back()
    router.forward()
    router.beforePopState(() => true)
    expect(router.push).toHaveBeenCalledWith('/a', undefined, { shallow: true })
    for (const method of [
      router.replace,
      router.prefetch,
      router.reload,
      router.back,
      router.forward,
      router.beforePopState,
    ]) {
      expect(method).toHaveBeenCalledTimes(1)
    }
  })

  test('the singleton is the router, ready at once', () => {
    const ready = mock(() => {})
    pagesRouter.ready(ready)
    expect(ready).toHaveBeenCalledTimes(1)
    expect(pagesRouter.router).toBe(pagesRouter)
    expect(pagesRouter.readyCallbacks).toEqual([])
    expect(createRouter('/', {}, '/', {})).toBe(pagesRouter)
  })

  test('events are an emitter that is emptied between tests', () => {
    const handler = mock((_url: unknown) => {})
    expect(Router.events).toBe(pagesRouter.events)
    Router.events.on('routeChangeStart', handler)
    Router.events.emit('routeChangeStart', '/a')
    Router.events.off('routeChangeStart', handler)
    Router.events.off('routeChangeComplete', handler)
    Router.events.emit('routeChangeStart', '/b')
    expect(handler.mock.calls).toEqual([['/a']])

    const leftOver = mock(() => {})
    Router.events.on('routeChangeStart', leftOver)
    resetNext()
    Router.events.emit('routeChangeStart', '/c')
    expect(leftOver).not.toHaveBeenCalled()
  })

  test('makePublicRouterInstance copies the state, and calls the router', () => {
    setUrl('/?a=1')
    const instance = makePublicRouterInstance(pagesRouter)
    expect(instance.query).toEqual({ a: '1' })
    expect(instance.query).not.toBe(pagesRouter.query)
    expect(instance.pathname).toBe('/')
    expect(instance.events).toBe(Router.events)
    ;(instance.push as (url: string) => unknown)('/x')
    expect(pagesRouter.push).toHaveBeenCalledWith('/x')
    expect(makePublicRouterInstance({ locales: ['en'] }).locales).toEqual([
      'en',
    ])
  })

  test('withRouter hands the router to a component', () => {
    function Page({ router }: { router?: typeof pagesRouter }) {
      return <p>{router?.pathname}</p>
    }
    Page.getInitialProps = () => ({})
    const Wrapped = withRouter(Page)
    expect(Wrapped.displayName).toBe('withRouter(Page)')
    expect(Wrapped.getInitialProps).toBe(Page.getInitialProps)
    setUrl('/wrapped')
    expect(render(<Wrapped />).getByText('/wrapped')).toBeTruthy()
    expect(withRouter(() => null).displayName).toBe('withRouter(Unknown)')
  })
})

test('next/compat/router is null in the App Router, until setRoute', () => {
  expect(useCompatRouter()).toBeNull()
  setRoute('/posts/[id]')
  expect(useCompatRouter()).toBe(pagesRouter)
})
