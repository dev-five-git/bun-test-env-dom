import { describe, expect, test } from 'bun:test'
import { formatHTMLElement } from '../formatHTMLElement.ts'

describe('formatHTMLElement', () => {
  test('should format a simple div element', () => {
    const div = document.createElement('div')
    div.textContent = 'Hello'
    const result = formatHTMLElement(div)
    expect(result).toBe(`<div>
  Hello
</div>`)
  })

  test('should format nested elements', () => {
    const div = document.createElement('div')
    const p = document.createElement('p')
    p.textContent = 'Paragraph'
    div.appendChild(p)
    const result = formatHTMLElement(div)
    expect(result).toBe(`<div>
  <p>
    Paragraph
  </p>
</div>`)
  })

  test('should format element with attributes', () => {
    const div = document.createElement('div')
    div.className = 'container'
    div.id = 'main'
    const result = formatHTMLElement(div)
    expect(result).toBe(`<div class="container" id="main">
</div>`)
  })

  test('should format element with multiple children', () => {
    const ul = document.createElement('ul')
    const li1 = document.createElement('li')
    li1.textContent = 'Item 1'
    const li2 = document.createElement('li')
    li2.textContent = 'Item 2'
    ul.appendChild(li1)
    ul.appendChild(li2)
    const result = formatHTMLElement(ul)
    expect(result).toBe(`<ul>
  <li>
    Item 1
  </li>
  <li>
    Item 2
  </li>
</ul>`)
  })
})
