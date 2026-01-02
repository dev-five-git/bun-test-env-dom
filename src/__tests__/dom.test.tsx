import { describe, expect, test } from 'bun:test'
import { createElement } from 'react'
import { render } from '../index.ts'

function DomTestInner() {
  return createElement(
    'div',
    {
      className: 'dom-test-inner',
    },
    'DomTestInner',
  )
}

function DomTest() {
  return createElement(
    'div',
    {
      className: 'dom-test',
    },
    'before',
    createElement(DomTestInner),
    'after',
  )
}

describe('SnapshotTest', () => {
  test('HTML element snapshot with render', () => {
    const { container } = render(createElement(DomTest))
    expect(container.children[0]).toHaveClass('dom-test')
  })

  test('HTML element snapshot with render', () => {
    expect(createElement(DomTest)).toHaveClass('dom-test')
  })
})
