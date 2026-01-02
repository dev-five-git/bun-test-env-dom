import * as test from 'bun:test'
import { afterEach, expect } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers'
import * as matchers from '@testing-library/jest-dom/matchers'
import { cleanup, render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { formatHTMLElement } from './formatHTMLElement.ts'
import { isReactElement } from './isReactElement.ts'

if (!GlobalRegistrator.isRegistered) {
  GlobalRegistrator.register()
  expect.extend(matchers)

  const methods = ['toMatchSnapshot', 'toMatchInlineSnapshot', 'toContain']

  const originalExpect = expect
  test.mock.module('bun:test', () => {
    const expect = (value: unknown) => {
      if (value instanceof HTMLElement || isReactElement(value)) {
        const element =
          value instanceof HTMLElement
            ? value
            : (render(value as ReactElement).container
                .children[0] as HTMLElement)
        const stringRet = originalExpect(formatHTMLElement(element))
        const jsonRet = originalExpect(element)
        for (const method of methods) {
          ;(jsonRet as unknown as Record<string, unknown>)[method] = (
            ...args: unknown[]
          ) => {
            return (
              stringRet as unknown as Record<
                string,
                (...args: unknown[]) => unknown
              >
            )[method]?.(...(args as [object, string]))
          }
        }

        return jsonRet
      }
      return originalExpect(value)
    }
    Object.assign(expect, originalExpect)
    return {
      ...test,
      expect,
    }
  })

  // Optional: cleans up `render` after each test
  afterEach(() => {
    cleanup()
  })
}

declare module 'bun:test' {
  interface Matchers<T>
    extends TestingLibraryMatchers<typeof expect.stringContaining, T> {}
  interface AsymmetricMatchers
    extends TestingLibraryMatchers<unknown, unknown> {}
}

export * from '@testing-library/react'
export * from '@testing-library/user-event'
export * from '@testing-library/user-event'
