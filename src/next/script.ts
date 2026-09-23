/**
 * `next/script` loads third-party code as a side effect; it adds nothing to
 * the component's own markup, and a test never loads the script. So it renders
 * nothing and never calls `onLoad` / `onReady`.
 */
export default function Script(_props: object): null {
  return null
}

export function handleClientScriptLoad(_props: object): void {}

export function initScriptLoader(_scripts: object[]): void {}
