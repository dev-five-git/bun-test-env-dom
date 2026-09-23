import './register-dom.ts'
import * as test from 'bun:test'
import { afterEach, expect } from 'bun:test'
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers'
import * as matchers from '@testing-library/jest-dom/matchers'
import { cleanup, render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { formatHTMLElement } from './formatHTMLElement.ts'
import { isReactElement } from './isReactElement.ts'

// The CJS and ESM builds can both end up loaded in one process - a preload
// pulls in one, a test file imports the other. Guard on a process-wide symbol
// so the second copy does not extend `expect` or install `afterEach` twice.
//
// This used to read `GlobalRegistrator.isRegistered`, which conflated "a DOM
// exists" with "this module has initialised". Anything that registered a DOM
// first silently disabled every line below it: the jest-dom matchers, the
// `bun:test` expect wrapper, and the `cleanup` hook.
const INITIALIZED = Symbol.for('bun-test-env-dom.initialized')
const globalFlags = globalThis as unknown as Record<symbol, boolean | undefined>

if (!globalFlags[INITIALIZED]) {
  globalFlags[INITIALIZED] = true

  // `import * as matchers` does not have the same shape in both builds: the
  // CJS interop helper adds a `default` key, and `expect.extend` rejects any
  // entry that is not a function ("`default` is not a valid matcher").
  expect.extend(
    Object.fromEntries(
      Object.entries(matchers as Record<string, unknown>).filter(
        ([, value]) => typeof value === 'function',
      ),
    ) as Parameters<typeof expect.extend>[0],
  )

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
// Re-export the named binding, not `default`: the CJS build resolves `default`
// with Node-style interop, which yields user-event's whole module namespace.
export { userEvent } from '@testing-library/user-event'
