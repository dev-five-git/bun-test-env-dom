import type { ReactNode } from 'react'

/**
 * `next/head`: React 19 already hoists `<title>`, `<meta>` and `<link>` into
 * `document.head` from anywhere in the tree, which is what Next.js does with
 * these children in the browser.
 */
export default function Head({ children }: { children?: ReactNode }) {
  return <>{children}</>
}

export function defaultHead(): ReactNode[] {
  return [
    <meta key="charset" charSet="utf-8" />,
    <meta key="viewport" content="width=device-width" name="viewport" />,
  ]
}
