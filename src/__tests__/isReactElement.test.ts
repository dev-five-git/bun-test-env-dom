import { describe, expect, test } from 'bun:test'
import { createElement } from 'react'
import { isReactElement } from '../isReactElement.ts'

describe('isReactElement', () => {
  test('should return true for React element', () => {
    const element = createElement('div', null, 'Hello')
    expect(isReactElement(element)).toBe(true)
  })

  test('should return true for React element with children', () => {
    const element = createElement(
      'div',
      null,
      createElement('span', null, 'Child'),
    )
    expect(isReactElement(element)).toBe(true)
  })

  test('should return false for null', () => {
    expect(isReactElement(null)).toBe(false)
  })

  test('should return false for undefined', () => {
    expect(isReactElement(undefined)).toBe(false)
  })

  test('should return false for plain object', () => {
    expect(isReactElement({ foo: 'bar' })).toBe(false)
  })

  test('should return false for string', () => {
    expect(isReactElement('hello')).toBe(false)
  })

  test('should return false for number', () => {
    expect(isReactElement(123)).toBe(false)
  })

  test('should return false for array', () => {
    expect(isReactElement([1, 2, 3])).toBe(false)
  })

  test('should return false for object with wrong $$typeof', () => {
    expect(isReactElement({ $$typeof: Symbol('wrong') })).toBe(false)
  })

  test('should return false for DOM element', () => {
    const div = document.createElement('div')
    expect(isReactElement(div)).toBe(false)
  })
})
