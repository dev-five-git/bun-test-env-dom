import { Component, createElement, type HTMLAttributes } from 'react'

// `next/document` builds the HTML shell on the server. Its components render
// the same elements here, without the tags Next.js injects into them.

export function Html(props: HTMLAttributes<HTMLHtmlElement>) {
  return <html {...props} />
}

export function Head(props: HTMLAttributes<HTMLHeadElement>) {
  return <head {...props} />
}

/** Where Next.js renders the page. */
export function Main() {
  return createElement('next-js-internal-body-render-target')
}

/** The page's scripts, which a test never loads. */
export function NextScript(_props: { nonce?: string }) {
  return null
}

interface DocumentContext {
  defaultGetInitialProps(context: DocumentContext): unknown
}

export default class Document extends Component<{ nonce?: string }> {
  static getInitialProps(context: DocumentContext) {
    return context.defaultGetInitialProps(context)
  }

  override render() {
    return (
      <Html>
        <Head nonce={this.props.nonce} />
        <body>
          <Main />
          <NextScript nonce={this.props.nonce} />
        </body>
      </Html>
    )
  }
}
