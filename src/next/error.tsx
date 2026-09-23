import { Component, type ReactNode, startTransition } from 'react'

import Head from './head.tsx'
import { isNextRouterError } from './navigation.ts'
import { appRouter, state } from './state.ts'

const statusCodes: Record<number, string> = {
  400: 'Bad Request',
  404: 'This page could not be found',
  405: 'Method Not Allowed',
  500: 'Internal Server Error',
}

const styles = {
  error: {
    fontFamily:
      'system-ui,"Segoe UI",Roboto,Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji"',
    height: '100vh',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  desc: { lineHeight: '48px' },
  h1: {
    display: 'inline-block',
    margin: '0 20px 0 0',
    paddingRight: 23,
    fontSize: 24,
    fontWeight: 500,
    verticalAlign: 'top',
  },
  h2: { fontSize: 14, fontWeight: 400, lineHeight: '28px' },
  wrap: { display: 'inline-block' },
} as const

interface ErrorContext {
  res?: { statusCode?: number } | null
  err?: { statusCode?: number } | null
}

function getInitialProps({ res, err }: ErrorContext) {
  const statusCode = res?.statusCode
    ? res.statusCode
    : err
      ? err.statusCode
      : 404
  return { statusCode, hostname: state.url.hostname }
}

interface ErrorProps {
  statusCode: number
  title?: string
  hostname?: string
  withDarkMode?: boolean
}

/** The default error page of `next/error`, with the markup Next.js renders. */
export default class ErrorPage extends Component<ErrorProps> {
  static displayName = 'ErrorPage'
  static getInitialProps = getInitialProps
  static origGetInitialProps = getInitialProps

  override render() {
    const { statusCode, withDarkMode = true, hostname } = this.props
    const title =
      this.props.title ||
      statusCodes[statusCode] ||
      'An unexpected error has occurred'
    return (
      <div style={styles.error}>
        <Head>
          <title>
            {statusCode
              ? `${statusCode}: ${title}`
              : 'Application error: a client-side exception has occurred'}
          </title>
        </Head>
        <div style={styles.desc}>
          <style>
            {`body{color:#000;background:#fff;margin:0}.next-error-h1{border-right:1px solid rgba(0,0,0,.3)}${withDarkMode ? '@media (prefers-color-scheme:dark){body{color:#fff;background:#000}.next-error-h1{border-right:1px solid rgba(255,255,255,.3)}}' : ''}`}
          </style>
          {statusCode ? (
            <h1 className="next-error-h1" style={styles.h1}>
              {statusCode}
            </h1>
          ) : null}
          <div style={styles.wrap}>
            <h2 style={styles.h2}>
              {this.props.title || statusCode ? (
                title
              ) : (
                <>
                  Application error: a client-side exception has occurred{' '}
                  {Boolean(hostname) && <>while loading {hostname}</>} (see the
                  browser console for more information)
                </>
              )}
              .
            </h2>
          </div>
        </div>
      </div>
    )
  }
}

export interface ErrorInfo {
  error: unknown
  reset: () => void
  retry: () => void
}

interface CatchErrorProps {
  pathname: string
  renderFallback: (errorInfo: ErrorInfo) => ReactNode
  children?: ReactNode
}

interface CatchErrorState {
  error: { thrownValue: unknown } | null
  previousPathname: string
}

// The error boundary `catchError` renders, as the App Router's: redirects and
// `notFound` pass through, and navigating to another path clears the error.
class CatchError extends Component<CatchErrorProps, CatchErrorState> {
  static displayName = 'catchError(Next.CatchError)'

  override state: CatchErrorState = {
    error: null,
    previousPathname: this.props.pathname,
  }

  static getDerivedStateFromError(thrownValue: unknown) {
    if (isNextRouterError(thrownValue)) throw thrownValue
    return { error: { thrownValue } }
  }

  static getDerivedStateFromProps(
    props: CatchErrorProps,
    { error, previousPathname }: CatchErrorState,
  ) {
    return {
      error: props.pathname === previousPathname ? error : null,
      previousPathname: props.pathname,
    }
  }

  reset = () => {
    this.setState({ error: null })
  }

  retry = () => {
    startTransition(() => {
      appRouter.refresh()
      this.reset()
    })
  }

  override render() {
    const { error } = this.state
    if (!error) return this.props.children
    return this.props.renderFallback({
      error: error.thrownValue,
      reset: this.reset,
      retry: this.retry,
    })
  }
}

type Props = Record<string, unknown>

export function catchError(
  fallback: (props: Props, errorInfo: ErrorInfo) => ReactNode,
) {
  // A component of its own, so the fallback can use hooks.
  function Fallback({
    props,
    errorInfo,
  }: {
    props: Props
    errorInfo: ErrorInfo
  }) {
    return fallback(props, errorInfo)
  }
  Fallback.displayName = fallback.name || 'CatchErrorFallback'

  return function CatchErrorBoundary({
    children,
    ...props
  }: Props & { children?: ReactNode }) {
    return (
      <CatchError
        pathname={state.url.pathname}
        renderFallback={(errorInfo) => (
          <Fallback props={props} errorInfo={errorInfo} />
        )}
      >
        {children}
      </CatchError>
    )
  }
}
