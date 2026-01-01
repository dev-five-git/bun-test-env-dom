import { prettyHTML } from './prettyHTML.ts'

export function formatHTMLElement(value: HTMLElement) {
  return prettyHTML(value.outerHTML)
}
