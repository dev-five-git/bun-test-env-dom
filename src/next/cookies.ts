export interface RequestCookie {
  name: string
  value: string
}

export interface ResponseCookie extends RequestCookie {
  domain?: string
  expires?: Date | number
  httpOnly?: boolean
  maxAge?: number
  partitioned?: boolean
  path?: string
  priority?: 'low' | 'medium' | 'high'
  sameSite?: boolean | 'lax' | 'strict' | 'none'
  secure?: boolean
}

type NameOrCookie = [name: string] | [cookie: RequestCookie]

const nameOf = (args: NameOrCookie | []) =>
  typeof args[0] === 'string' ? args[0] : args[0]?.name

export function parseCookieHeader(header: string | null) {
  const jar = new Map<string, string>()
  for (const pair of header?.split(/;\s*/) ?? []) {
    const index = pair.indexOf('=')
    if (index > 0) {
      jar.set(pair.slice(0, index), decodeURIComponent(pair.slice(index + 1)))
    }
  }
  return jar
}

export const serializeCookies = (jar: Map<string, string>) =>
  [...jar]
    .map(([name, value]) => `${name}=${encodeURIComponent(value)}`)
    .join('; ')

/**
 * The `RequestCookies` API of `@edge-runtime/cookies`, over a name-value map.
 * `onChange` lets a request keep its `cookie` header in step.
 */
export class RequestCookies {
  constructor(
    private readonly jar: Map<string, string>,
    private readonly onChange: () => void = () => {},
  ) {}

  get size() {
    return this.jar.size
  }

  get(...args: NameOrCookie): RequestCookie | undefined {
    return this.getAll(...args)[0]
  }

  getAll(...args: NameOrCookie | []): RequestCookie[] {
    const name = nameOf(args)
    return [...this.jar]
      .filter(([key]) => name === undefined || key === name)
      .map(([key, value]) => ({ name: key, value }))
  }

  has(name: string) {
    return this.jar.has(name)
  }

  set(...args: [name: string, value: string] | [cookie: RequestCookie]) {
    const [name, value] =
      typeof args[0] === 'string'
        ? [args[0], args[1] as string]
        : [args[0].name, args[0].value]
    this.jar.set(name, value)
    this.onChange()
    return this
  }

  delete(names: string | string[]) {
    const deleted = [names].flat().map((name) => this.jar.delete(name))
    this.onChange()
    return Array.isArray(names) ? deleted : (deleted[0] as boolean)
  }

  clear() {
    this.jar.clear()
    this.onChange()
    return this
  }

  *[Symbol.iterator](): IterableIterator<[string, RequestCookie]> {
    for (const cookie of this.getAll()) yield [cookie.name, cookie]
  }

  toString() {
    return serializeCookies(this.jar)
  }
}

export function stringifyCookie(cookie: ResponseCookie) {
  const attributes = [
    cookie.path && `Path=${cookie.path}`,
    cookie.expires !== undefined &&
      `Expires=${new Date(cookie.expires).toUTCString()}`,
    cookie.maxAge !== undefined && `Max-Age=${cookie.maxAge}`,
    cookie.domain && `Domain=${cookie.domain}`,
    cookie.secure && 'Secure',
    cookie.httpOnly && 'HttpOnly',
    cookie.sameSite && `SameSite=${cookie.sameSite}`,
    cookie.partitioned && 'Partitioned',
    cookie.priority && `Priority=${cookie.priority}`,
  ].filter(Boolean)
  return [
    `${cookie.name}=${encodeURIComponent(cookie.value)}`,
    ...attributes,
  ].join('; ')
}

/**
 * The `ResponseCookies` API of `@edge-runtime/cookies`: every change is
 * written back to the response's `set-cookie` headers.
 *
 * ponytail: `set-cookie` headers given to the response up front are not read
 * into it, and the first write replaces them; parse them in the constructor
 * if a test mixes the two.
 */
export class ResponseCookies {
  private readonly jar = new Map<string, ResponseCookie>()

  constructor(private readonly headers: Headers) {}

  get(...args: NameOrCookie): ResponseCookie | undefined {
    return this.getAll(...args)[0]
  }

  getAll(...args: NameOrCookie | []): ResponseCookie[] {
    const name = nameOf(args)
    return [...this.jar.values()].filter(
      (cookie) => name === undefined || cookie.name === name,
    )
  }

  has(name: string) {
    return this.jar.has(name)
  }

  set(
    ...args:
      | [name: string, value: string, options?: Partial<ResponseCookie>]
      | [cookie: ResponseCookie]
  ) {
    const cookie =
      typeof args[0] === 'string'
        ? { ...args[2], name: args[0], value: args[1] as string }
        : args[0]
    // Normalised like `@edge-runtime/cookies`: the expiry is a date, a max
    // age sets it, and the path defaults to the root.
    this.jar.set(cookie.name, {
      ...cookie,
      ...(typeof cookie.expires === 'number'
        ? { expires: new Date(cookie.expires) }
        : {}),
      ...(cookie.maxAge
        ? { expires: new Date(Date.now() + cookie.maxAge * 1000) }
        : {}),
      path: cookie.path ?? '/',
    })
    this.write()
    return this
  }

  delete(...args: [name: string] | [cookie: Omit<ResponseCookie, 'value'>]) {
    const cookie = typeof args[0] === 'string' ? { name: args[0] } : args[0]
    return this.set({ ...cookie, value: '', expires: new Date(0) })
  }

  toString() {
    return this.getAll().map(stringifyCookie).join('; ')
  }

  private write() {
    this.headers.delete('set-cookie')
    for (const cookie of this.jar.values()) {
      this.headers.append('set-cookie', stringifyCookie(cookie))
    }
  }
}
