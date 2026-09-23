function unavailable(): never {
  throw new Error(
    'Method unavailable on `ReadonlyURLSearchParams`. Read more: https://nextjs.org/docs/app/api-reference/functions/use-search-params#updating-searchparams',
  )
}

/** Same contract as Next's: readable like `URLSearchParams`, never writable. */
export class ReadonlyURLSearchParams extends URLSearchParams {
  // biome-ignore lint/complexity/noUselessConstructor: bun's coverage never counts the implicit constructor of a built-in's subclass as run
  constructor(init?: ConstructorParameters<typeof URLSearchParams>[0]) {
    super(init)
  }

  override append(): never {
    return unavailable()
  }

  override delete(): never {
    return unavailable()
  }

  override set(): never {
    return unavailable()
  }

  override sort(): never {
    return unavailable()
  }
}
