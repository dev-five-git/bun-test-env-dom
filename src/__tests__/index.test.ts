import { describe, expect, test } from 'bun:test'
import { createElement } from 'react'

describe('expect with ReactElement', () => {
  test('should render ReactElement and format container', () => {
    const element = createElement('div', null, 'Hello World')
    // @ts-expect-error - mock transforms ReactElement to string at runtime
    expect(element).toContain('Hello World')
  })
})

describe('expect with HTMLElement', () => {
  test('should format HTMLElement', () => {
    const div = document.createElement('div')
    div.textContent = 'Hello DOM'
    // @ts-expect-error - mock transforms HTMLElement to string at runtime
    expect(div).toContain('Hello DOM')
  })
})

describe('expect with primitive value', () => {
  test('should pass through primitive values', () => {
    expect('hello').toBe('hello')
    expect(123).toBe(123)
    expect(123).toEqual(expect.any(Number))
  })
})
