import { describe, expect, test } from 'bun:test'
import { prettyHTML } from '../prettyHTML.ts'

describe('prettyHTML', () => {
  test('should format simple HTML', () => {
    const html = '<div><p>Hello</p></div>'
    const result = prettyHTML(html)
    expect(result).toBe(`<div>
  <p>
    Hello
  </p>
</div>`)
  })

  test('should handle self-closing tags', () => {
    const html = '<div><img src="test.png"><br></div>'
    const result = prettyHTML(html)
    expect(result).toBe(`<div>
  <img src="test.png">
  <br>
</div>`)
  })

  test('should handle nested elements', () => {
    const html = '<div><ul><li>Item 1</li><li>Item 2</li></ul></div>'
    const result = prettyHTML(html)
    expect(result).toBe(`<div>
  <ul>
    <li>
      Item 1
    </li>
    <li>
      Item 2
    </li>
  </ul>
</div>`)
  })

  test('should handle custom indent', () => {
    const html = '<div><p>Hello</p></div>'
    const result = prettyHTML(html, 4)
    expect(result).toBe(`<div>
    <p>
        Hello
    </p>
</div>`)
  })

  test('should handle empty elements', () => {
    const html = '<div></div>'
    const result = prettyHTML(html)
    expect(result).toBe(`<div>
</div>`)
  })

  test('should handle attributes', () => {
    const html = '<div class="container" id="main"><span>Text</span></div>'
    const result = prettyHTML(html)
    expect(result).toBe(`<div class="container" id="main">
  <span>
    Text
  </span>
</div>`)
  })
})
