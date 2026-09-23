import { describe, expect, mock, spyOn, test } from 'bun:test'
import { Component, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { fireEvent, render, renderHook, waitFor } from '../index.ts'
import App from '../next/app.tsx'
import Document, { Html } from '../next/document.tsx'
import dynamic, { noSSR } from '../next/dynamic.tsx'
import ErrorPage, { catchError } from '../next/error.tsx'
import localFont, { googleFonts } from '../next/font.ts'
import Form from '../next/form.tsx'
import Head, { defaultHead } from '../next/head.tsx'
import { router, setOffline, setUrl } from '../next/index.ts'
import { notFound } from '../next/navigation.ts'
import {
  dispatchOfflineChange,
  OfflineProvider,
  useOffline,
} from '../next/offline.ts'
import Script, {
  handleClientScriptLoad,
  initScriptLoader,
} from '../next/script.ts'
import { useReportWebVitals } from '../next/web-vitals.ts'

describe('next/script', () => {
  test('renders nothing and never loads', () => {
    const onLoad = mock(() => {})
    const { container } = render(
      <Script src="/a.js" strategy="afterInteractive" onLoad={onLoad} />,
    )
    expect(container.innerHTML).toBe('')
    handleClientScriptLoad({ src: '/a.js' })
    initScriptLoader([{ src: '/a.js' }])
    expect(onLoad).not.toHaveBeenCalled()
  })
})

describe('next/head', () => {
  test('puts its children in the document head', () => {
    const { container } = render(
      <Head>
        <title>Title</title>
        <meta name="description" content="text" />
      </Head>,
    )
    expect(container.innerHTML).toBe('')
    expect(document.title).toBe('Title')
    expect(
      document.head.querySelector('meta[name="description"]'),
    ).not.toBeNull()
  })

  test('defaultHead is the charset and viewport', () => {
    expect(defaultHead().map((element) => element.props)).toEqual([
      { charSet: 'utf-8' },
      { content: 'width=device-width', name: 'viewport' },
    ])
  })
})

describe('next/dynamic', () => {
  function Hello({ name }: { name: string }) {
    return <p>Hello {name}</p>
  }

  test.each([
    ['a loader of a module', () => dynamic(async () => ({ default: Hello }))],
    ['a loader of a component', () => dynamic(async () => Hello)],
    ['a promise', () => dynamic(Promise.resolve({ default: Hello }))],
    ['options', () => noSSR({ loader: async () => Hello, ssr: false })],
  ])('renders the component from %s', async (_, create) => {
    const Lazy = create()
    const view = render(<Lazy name="there" />)
    expect(await view.findByText('Hello there')).toBeTruthy()
  })

  test('shows `loading` until the module resolves', async () => {
    const Lazy = dynamic(async () => Hello, {
      loading: ({ isLoading }) => <p>{isLoading ? 'Loading' : ''}</p>,
    })
    const view = render(<Lazy name="there" />)
    expect(view.getByText('Loading')).toBeTruthy()
    expect(await view.findByText('Hello there')).toBeTruthy()
  })
})

describe('next/form', () => {
  // Submits `form` and reports whether the submit was handled in the page;
  // the browser's own submission is cancelled, so happy-dom stays put.
  function submit(form: HTMLFormElement, submitter?: HTMLElement) {
    let prevented: boolean | undefined
    const listener = (event: Event) => {
      prevented = event.defaultPrevented
      event.preventDefault()
    }
    document.addEventListener('submit', listener)
    fireEvent(
      form,
      new SubmitEvent('submit', { bubbles: true, cancelable: true, submitter }),
    )
    document.removeEventListener('submit', listener)
    return prevented
  }

  function Search(props: Partial<Parameters<typeof Form>[0]>) {
    return (
      <Form action="/search" {...props}>
        <input name="q" defaultValue="a b" />
        <button type="submit">go</button>
        <button type="submit" formAction="/other">
          other
        </button>
        <button type="submit" formMethod="post">
          post
        </button>
        <button type="submit" formAction="javascript:void 0">
          script
        </button>
      </Form>
    )
  }

  test('renders a form without method, encType or target', () => {
    const { container } = render(
      <Form action="/search" method="post" encType="text/plain" target="_blank">
        <input name="q" />
      </Form>,
    )
    expect(container.innerHTML).toBe(
      '<form action="/search"><input name="q"></form>',
    )
  })

  test('navigates to the action with the fields as its query', () => {
    const view = render(<Search />)
    const form = view.container.querySelector('form') as HTMLFormElement
    expect(submit(form)).toBe(true)
    expect(router.push).toHaveBeenCalledWith('/search?q=a+b', { scroll: true })
  })

  test('replaces, keeps the scroll position, and drops the query', () => {
    const view = render(
      <Form action="/search?old=1#hash" replace scroll={false}>
        <input name="q" defaultValue="x" />
      </Form>,
    )
    submit(view.container.querySelector('form') as HTMLFormElement)
    expect(router.replace).toHaveBeenCalledWith('/search?q=x#hash', {
      scroll: false,
    })
  })

  test('follows the formAction of the submit button', () => {
    const view = render(<Search />)
    const form = view.container.querySelector('form') as HTMLFormElement
    submit(form, view.getByText('go'))
    submit(form, view.getByText('other'))
    expect(router.push.mock.calls).toEqual([
      ['/search?q=a+b', { scroll: true }],
      ['/other?q=a+b', { scroll: true }],
    ])
  })

  test('leaves other submit buttons, and onSubmit cancels, to the page', () => {
    const view = render(
      <Search
        onSubmit={(event) =>
          event.currentTarget.dataset.cancel && event.preventDefault()
        }
      />,
    )
    const form = view.container.querySelector('form') as HTMLFormElement
    expect(submit(form, view.getByText('post'))).toBe(false)
    expect(submit(form, view.getByText('script'))).toBe(false)
    form.dataset.cancel = 'yes'
    expect(submit(form)).toBe(true)
    expect(router.push).not.toHaveBeenCalled()
  })

  test('navigates to another origin with the full URL, files by name', () => {
    const view = render(
      <Form action="https://example.com/upload">
        <input type="file" name="file" />
      </Form>,
    )
    const files = new DataTransfer()
    files.items.add(new File(['x'], 'a.txt'))
    const input = view.container.querySelector('input') as HTMLInputElement
    input.files = files.files
    submit(view.container.querySelector('form') as HTMLFormElement)
    expect(router.push).toHaveBeenCalledWith(
      'https://example.com/upload?file=a.txt',
      { scroll: true },
    )
  })

  test('leaves a function action to React', async () => {
    const action = mock(async (_formData: FormData) => {})
    const view = render(
      <Form action={action}>
        <input name="q" defaultValue="x" />
      </Form>,
    )
    submit(view.container.querySelector('form') as HTMLFormElement)
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1))
    expect(action.mock.calls[0]?.[0].get('q')).toBe('x')
    expect(router.push).not.toHaveBeenCalled()
  })
})

describe('next/font', () => {
  test('gives a Google font stable names', () => {
    expect(
      googleFonts.Roboto_Mono?.({
        weight: '700',
        style: 'italic',
        variable: '--font-mono',
      }),
    ).toEqual({
      className: '__className_roboto_mono',
      style: {
        fontFamily: "'Roboto Mono', 'Roboto Mono Fallback'",
        fontWeight: 700,
        fontStyle: 'italic',
      },
      variable: '__variable_roboto_mono',
    })
  })

  test('sets a weight or style only when exactly one is loaded', () => {
    expect(googleFonts.Inter?.({ weight: ['400', '700'] }).style).toEqual({
      fontFamily: "'Inter', 'Inter Fallback'",
    })
    expect(googleFonts.Inter?.({ weight: 'variable' }).style).toEqual({
      fontFamily: "'Inter', 'Inter Fallback'",
    })
    expect(googleFonts.Inter?.({ weight: ['500'] }).style.fontWeight).toBe(500)
  })

  test('names a local font after its first file', () => {
    expect(localFont({ src: './fonts/My-Font.woff2' }).className).toBe(
      '__className_my_font',
    )
    expect(
      localFont({ src: [{ path: '../a/Brand.ttf' }, { path: './b.ttf' }] })
        .style,
    ).toEqual({ fontFamily: "'Brand', 'Brand Fallback'" })
    expect(localFont({ src: [] }).className).toBe('__className_local')
  })
})

describe('next/error', () => {
  test('renders the status page of Next.js', () => {
    const view = render(<ErrorPage statusCode={404} />)
    expect(view.getByRole('heading', { level: 1 }).textContent).toBe('404')
    expect(view.getByRole('heading', { level: 2 }).textContent).toBe(
      'This page could not be found.',
    )
    expect(document.title).toBe('404: This page could not be found')
    expect(view.container.querySelector('style')?.textContent).toContain(
      'prefers-color-scheme:dark',
    )
  })

  test('takes a title, and can leave dark mode out', () => {
    const view = render(
      <ErrorPage statusCode={418} title="Teapot" withDarkMode={false} />,
    )
    expect(view.getByRole('heading', { level: 2 }).textContent).toBe('Teapot.')
    expect(view.container.querySelector('style')?.textContent).not.toContain(
      'prefers-color-scheme',
    )
  })

  test('without a status code, reports a client-side exception', () => {
    const view = render(
      // @ts-expect-error - the client-side error page has no status code
      <ErrorPage hostname="localhost" />,
    )
    expect(view.getByRole('heading', { level: 2 }).textContent).toBe(
      'Application error: a client-side exception has occurred while loading localhost (see the browser console for more information).',
    )
    expect(view.queryByRole('heading', { level: 1 })).toBeNull()
    view.unmount()

    // @ts-expect-error - the client-side error page has no status code
    const other = render(<ErrorPage />)
    expect(other.getByRole('heading', { level: 2 }).textContent).toBe(
      'Application error: a client-side exception has occurred  (see the browser console for more information).',
    )
  })

  test('getInitialProps takes the status of the response or the error', () => {
    expect(ErrorPage.getInitialProps({ res: { statusCode: 500 } })).toEqual({
      statusCode: 500,
      hostname: 'localhost',
    })
    expect(
      ErrorPage.getInitialProps({ err: { statusCode: 403 } }).statusCode,
    ).toBe(403)
    expect(ErrorPage.getInitialProps({}).statusCode).toBe(404)
    expect(ErrorPage.origGetInitialProps).toBe(ErrorPage.getInitialProps)
  })
})

describe('catchError', () => {
  let shouldThrow = true
  function Bomb() {
    if (shouldThrow) throw new Error('boom')
    return <p>fine</p>
  }

  const Boundary = catchError((props, { error, reset, retry }) => (
    <div>
      <p>
        {String(props.label)}: {(error as Error).message}
      </p>
      <button type="button" onClick={reset}>
        reset
      </button>
      <button type="button" onClick={retry}>
        retry
      </button>
    </div>
  ))

  // React reports every error a boundary catches.
  const quiet = () => spyOn(console, 'error').mockImplementation(() => {})

  test('renders the fallback, which reset and retry leave', () => {
    const consoleError = quiet()
    shouldThrow = true
    const view = render(
      <Boundary label="Oops">
        <Bomb />
      </Boundary>,
    )
    expect(view.getByText('Oops: boom')).toBeTruthy()

    shouldThrow = false
    fireEvent.click(view.getByText('reset'))
    expect(view.getByText('fine')).toBeTruthy()
    expect(router.refresh).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })

  test('retry refreshes the router first', () => {
    const consoleError = quiet()
    shouldThrow = true
    const view = render(
      <Boundary label="Oops">
        <Bomb />
      </Boundary>,
    )
    shouldThrow = false
    fireEvent.click(view.getByText('retry'))
    expect(router.refresh).toHaveBeenCalledTimes(1)
    expect(view.getByText('fine')).toBeTruthy()
    consoleError.mockRestore()
  })

  test('clears the error on another path', () => {
    const consoleError = quiet()
    shouldThrow = true
    const view = render(
      <Boundary label="Oops">
        <Bomb />
      </Boundary>,
    )
    shouldThrow = false
    view.rerender(
      <Boundary label="Oops">
        <Bomb />
      </Boundary>,
    )
    expect(view.getByText('Oops: boom')).toBeTruthy()

    setUrl('/elsewhere')
    view.rerender(
      <Boundary label="Oops">
        <Bomb />
      </Boundary>,
    )
    expect(view.getByText('fine')).toBeTruthy()
    consoleError.mockRestore()
  })

  test('passes notFound and redirects on', () => {
    const consoleError = quiet()
    class Outer extends Component<
      { children: ReactNode },
      { digest?: string }
    > {
      override state: { digest?: string } = {}
      static getDerivedStateFromError(error: { digest: string }) {
        return { digest: error.digest }
      }
      override render() {
        return this.state.digest ?? this.props.children
      }
    }
    function Missing(): ReactNode {
      return notFound()
    }
    const view = render(
      <Outer>
        <Boundary>
          <Missing />
        </Boundary>
      </Outer>,
    )
    expect(view.container.textContent).toBe('NEXT_HTTP_ERROR_FALLBACK;404')
    consoleError.mockRestore()
  })
})

describe('next/app and next/document', () => {
  test('App renders the page with its props', async () => {
    function Page({ title }: { title?: unknown }) {
      return <h1>{String(title)}</h1>
    }
    const view = render(<App Component={Page} pageProps={{ title: 'Hi' }} />)
    expect(view.getByText('Hi')).toBeTruthy()

    expect(
      await App.getInitialProps({
        Component: { getInitialProps: async () => ({ title: 'Hi' }) },
        ctx: {},
      }),
    ).toEqual({ pageProps: { title: 'Hi' } })
    expect(await App.origGetInitialProps({ Component: {}, ctx: {} })).toEqual({
      pageProps: {},
    })
  })

  test('Document renders the HTML shell', () => {
    expect(renderToStaticMarkup(<Document nonce="n" />)).toBe(
      '<html><head nonce="n"></head><body><next-js-internal-body-render-target></next-js-internal-body-render-target></body></html>',
    )
    // React adds the missing head.
    expect(renderToStaticMarkup(<Html lang="ko" />)).toBe(
      '<html lang="ko"><head></head></html>',
    )
    expect(
      Document.getInitialProps({
        defaultGetInitialProps: () => ({ html: '' }),
      }),
    ).toEqual({ html: '' })
  })
})

describe('next/offline and next/web-vitals', () => {
  test('useOffline reads what a test sets', () => {
    expect(renderHook(() => useOffline()).result.current).toBe(false)
    setOffline(true)
    expect(renderHook(() => useOffline()).result.current).toBe(true)
    dispatchOfflineChange(false)
    expect(useOffline()).toBe(false)
    const view = render(
      <OfflineProvider>
        <p>online</p>
      </OfflineProvider>,
    )
    expect(view.getByText('online')).toBeTruthy()
  })

  test('useReportWebVitals never reports', () => {
    const report = mock(() => {})
    renderHook(() => useReportWebVitals(report))
    expect(report).not.toHaveBeenCalled()
  })
})
