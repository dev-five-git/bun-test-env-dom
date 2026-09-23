import { Component, type ComponentType } from 'react'

type PageProps = Record<string, unknown>

interface AppContext {
  Component: { getInitialProps?: (context: unknown) => unknown }
  ctx: unknown
}

async function getInitialProps({ Component: Page, ctx }: AppContext) {
  return {
    pageProps: Page.getInitialProps ? await Page.getInitialProps(ctx) : {},
  }
}

/** `next/app`: renders the page with its props, as the default `App` does. */
export default class App extends Component<{
  Component: ComponentType<PageProps>
  pageProps: PageProps
}> {
  static getInitialProps = getInitialProps
  static origGetInitialProps = getInitialProps

  override render() {
    const { Component: Page, pageProps } = this.props
    return <Page {...pageProps} />
  }
}
