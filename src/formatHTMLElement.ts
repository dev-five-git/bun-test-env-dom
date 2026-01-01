import { prettyHTML } from './prettyHTML.ts'

export function formatHTMLElement(value: HTMLElement) {
  const html = value.outerHTML
  return prettyHTML(html)
}
