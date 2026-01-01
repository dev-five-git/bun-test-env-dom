export function isReactElement(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    '$$typeof' in value &&
    typeof (value as { $$typeof: unknown }).$$typeof === 'symbol' &&
    (value as { $$typeof: symbol }).$$typeof
      .toString()
      .startsWith('Symbol(react.') &&
    (value as { $$typeof: symbol }).$$typeof.toString().endsWith('element)')
  )
}
