import { RequestCookies } from './cookies.ts'
import { state } from './state.ts'

function readOnly(): never {
  throw new Error(
    'Headers cannot be modified. Read more: https://nextjs.org/docs/app/api-reference/functions/headers',
  )
}

/** The request headers a test set with `setHeaders`, read-only as in Next.js. */
export async function headers(): Promise<Headers> {
  return Object.assign(new Headers(state.headers), {
    append: readOnly,
    delete: readOnly,
    set: readOnly,
  })
}

/**
 * The request cookies a test set with `setCookies`. Writes stick for the rest
 * of the test, as a Server Action's would.
 */
export async function cookies() {
  return new RequestCookies(state.cookies)
}

export async function draftMode() {
  return {
    get isEnabled() {
      return state.draftMode
    },
    enable() {
      state.draftMode = true
    },
    disable() {
      state.draftMode = false
    },
  }
}
