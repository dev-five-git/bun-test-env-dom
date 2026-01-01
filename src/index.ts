import * as test from 'bun:test'
import { afterEach, expect } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers'
import * as matchers from '@testing-library/jest-dom/matchers'
import { cleanup, render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { formatHTMLElement } from './formatHTMLElement.ts'
import { isReactElement } from './isReactElement.ts'

GlobalRegistrator.register()
expect.extend(matchers)

const originalExpect = expect
test.mock.module('bun:test', () => {
  return {
    ...test,
    expect: (value: unknown) => {
      if (isReactElement(value)) {
        const { container } = render(value as ReactElement)
        return originalExpect(formatHTMLElement(container))
      }
      if (value instanceof HTMLElement) {
        return originalExpect(formatHTMLElement(value))
      }
      return originalExpect(value)
    },
  }
})

// Optional: cleans up `render` after each test
afterEach(() => {
  cleanup()
})

declare module 'bun:test' {
  interface Matchers<T>
    extends TestingLibraryMatchers<typeof expect.stringContaining, T> {}
  interface AsymmetricMatchers
    extends TestingLibraryMatchers<unknown, unknown> {}
}
