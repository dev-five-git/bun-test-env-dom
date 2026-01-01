const selfClosingTags = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
])

export function prettyHTML(html: string, indent = 2): string {
  let result = ''
  let level = 0
  let i = 0

  function getIndent(n: number) {
    return ' '.repeat(n * indent)
  }

  while (i < html.length) {
    // closing tag
    if (html.slice(i).startsWith('</')) {
      const endIdx = html.indexOf('>', i)
      const tag = html.slice(i, endIdx + 1)
      level--
      result += `${getIndent(level) + tag}\n`
      i = endIdx + 1
    }
    // opening tag
    else if (html[i] === '<') {
      const endIdx = html.indexOf('>', i)
      const tag = html.slice(i, endIdx + 1)
      const tagName = tag.match(/<\/?(\w+)/)?.[1]?.toLowerCase() || ''
      const isSelfClosing = selfClosingTags.has(tagName) || tag.endsWith('/>')

      result += `${getIndent(level) + tag}\n`

      if (!isSelfClosing) {
        level++
      }
      i = endIdx + 1
    }
    // text content
    else {
      const nextTagIdx = html.indexOf('<', i)
      const text = html
        .slice(i, nextTagIdx === -1 ? undefined : nextTagIdx)
        .trim()

      if (text) {
        result += `${getIndent(level) + text}\n`
      }
      i = nextTagIdx === -1 ? html.length : nextTagIdx
    }
  }

  return result.trimEnd()
}
