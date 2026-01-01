import { describe, expect, test } from 'bun:test'
import { createElement } from 'react'
import { render } from '../index.ts'

function SnapshotTestInner() {
  return createElement('div', null, 'SnapshotTestInner')
}

function SnapshotTest() {
  return createElement(
    'div',
    null,
    'before',
    createElement(SnapshotTestInner),
    'after',
  )
}

describe('SnapshotTest', () => {
  test('React element snapshot', () => {
    expect(createElement(SnapshotTest)).toMatchSnapshot()
  })

  test('HTML element snapshot with render', () => {
    const { container } = render(createElement(SnapshotTest))
    expect(container).toMatchSnapshot()
  })
})
