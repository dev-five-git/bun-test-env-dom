import { type ComponentType, lazy, type ReactNode, Suspense } from 'react'

// biome-ignore lint/suspicious/noExplicitAny: components of any props
type AnyComponent = ComponentType<any>
type Loaded = AnyComponent | { default: AnyComponent }
type Loader = (() => Promise<Loaded>) | Promise<Loaded>

interface DynamicOptions {
  loader: Loader
  loading?: (props: {
    isLoading: boolean
    pastDelay: boolean
    error: Error | null
  }) => ReactNode
  ssr?: boolean
}

/**
 * `next/dynamic` as React.lazy: the component appears once its module
 * resolves, with `loading` shown until then. Use `findBy*` queries to wait.
 * Accepts the same forms as Next.js: a loader, a promise, or options.
 */
export default function dynamic(
  loaderOrOptions: Loader | DynamicOptions,
  options: Partial<DynamicOptions> = {},
) {
  const { loader, loading: Loading } =
    typeof loaderOrOptions === 'function' || loaderOrOptions instanceof Promise
      ? { ...options, loader: loaderOrOptions }
      : { ...options, ...loaderOrOptions }

  const Lazy = lazy(async () => {
    const loaded = await (typeof loader === 'function' ? loader() : loader)
    return { default: 'default' in loaded ? loaded.default : loaded }
  })

  return function DynamicComponent(props: object) {
    return (
      <Suspense
        fallback={Loading ? <Loading error={null} isLoading pastDelay /> : null}
      >
        <Lazy {...props} />
      </Suspense>
    )
  }
}

export const noSSR = dynamic
