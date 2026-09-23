import { GOOGLE_FONTS } from './google-fonts.ts'

interface FontOptions {
  weight?: string | string[]
  style?: string | string[]
  variable?: string
}

interface LocalFontOptions extends FontOptions {
  src: string | { path: string }[]
}

// Next.js sets a weight or style on the font only when exactly one is loaded.
const single = (value: string | string[] | undefined) => {
  const values = [value ?? []].flat()
  return values.length === 1 ? values[0] : undefined
}

/**
 * The object `next/font` gives a component, with stable class names in place
 * of the hashed ones the compiler generates.
 */
function font(family: string, options: FontOptions = {}) {
  const id = family.toLowerCase().replace(/\W+/g, '_')
  const weight = single(options.weight)
  const fontStyle = single(options.style)
  return {
    className: `__className_${id}`,
    style: {
      fontFamily: `'${family}', '${family} Fallback'`,
      ...(weight && weight !== 'variable'
        ? { fontWeight: Number(weight) }
        : {}),
      ...(fontStyle ? { fontStyle } : {}),
    },
    ...(options.variable ? { variable: `__variable_${id}` } : {}),
  }
}

/** `next/font/google`: one function per font, named as Next.js exports them. */
export const googleFonts = Object.fromEntries(
  GOOGLE_FONTS.map((name) => [
    name,
    (options?: FontOptions) => font(name.replaceAll('_', ' '), options),
  ]),
)

/** `next/font/local`: the family is named after the first font file. */
export default function localFont(options: LocalFontOptions) {
  const [first] = typeof options.src === 'string' ? [options.src] : options.src
  const path = typeof first === 'string' ? first : (first?.path ?? '')
  const file = path.split('/').pop() ?? ''
  return font(file.replace(/\.\w+$/, '') || 'local', options)
}
