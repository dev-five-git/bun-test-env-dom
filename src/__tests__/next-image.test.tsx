import { describe, expect, test } from 'bun:test'
import { render } from '../index.ts'
import Image, { getImageProps, LegacyImage } from '../next/image.tsx'

const html = (element: Parameters<typeof render>[0]) =>
  render(element).container.innerHTML

// The markup next/image renders for an image it does not optimize, checked
// against next@16.3.6 in happy-dom.
describe('Image renders the markup of next/image', () => {
  test('sized', () => {
    expect(html(<Image src="/a.png" alt="A" width={10} height={20} />)).toBe(
      '<img alt="A" loading="lazy" width="10" height="20" decoding="async" data-nimg="1" style="color: transparent;" src="/a.png">',
    )
  })

  test('with a class, and eager when preloaded', () => {
    expect(
      html(
        <Image
          src="/a.png"
          alt="A"
          width="10"
          height="20"
          className="c"
          priority
        />,
      ),
    ).toBe(
      '<img alt="A" width="10" height="20" decoding="async" data-nimg="1" class="c" style="color: transparent;" src="/a.png">',
    )
    expect(html(<Image src="/a.png" alt="A" preload />)).not.toContain(
      'loading',
    )
  })

  test('fill', () => {
    expect(html(<Image src="/a.png" alt="A" fill />)).toBe(
      '<img alt="A" loading="lazy" decoding="async" data-nimg="fill" style="position: absolute; height: 100%; width: 100%; left: 0px; top: 0px; right: 0px; bottom: 0px; color: transparent;" src="/a.png">',
    )
  })

  test('with a blur placeholder', () => {
    expect(
      html(
        <Image src="/a.png" alt="A" placeholder="blur" blurDataURL="data:," />,
      ),
    ).toContain(
      'style="color: transparent; background-size: cover; background-position: 50% 50%; background-repeat: no-repeat;"',
    )
  })

  test('from a static import, or with overrideSrc', () => {
    const data = { src: '/static/a.png', width: 30, height: 40 }
    expect(html(<Image src={data} alt="A" />)).toBe(
      '<img alt="A" loading="lazy" width="30" height="40" decoding="async" data-nimg="1" style="color: transparent;" src="/static/a.png">',
    )
    expect(html(<Image src={{ default: data }} alt="A" width={5} />)).toContain(
      'width="5" height="40"',
    )
    expect(html(<Image src="/a.png" alt="A" overrideSrc="/b.png" />)).toContain(
      'src="/b.png"',
    )
  })
})

test('getImageProps gives the props without data-nimg', () => {
  const { props } = getImageProps({
    src: '/a.png',
    alt: 'A',
    width: 10,
    height: 20,
    quality: 75,
    sizes: '100vw',
    unoptimized: true,
  })
  expect(props).toEqual({
    alt: 'A',
    loading: 'lazy',
    width: 10,
    height: 20,
    decoding: 'async',
    className: undefined,
    style: { color: 'transparent' },
    src: '/a.png',
  })
})

// Without the wrapper spans next/legacy/image renders around it.
test('LegacyImage names its layout in data-nimg', () => {
  const markup = html(
    <LegacyImage
      src="/a.png"
      alt="A"
      width={10}
      height={20}
      objectFit="cover"
      lazyBoundary="200px"
    />,
  )
  expect(markup).toStartWith('<img alt="A" loading="lazy" width="10"')
  expect(markup).toContain('object-fit: cover;')
  expect(markup).toContain('data-nimg="intrinsic"')
  expect(html(<LegacyImage src="/a.png" alt="A" layout="fill" />)).toContain(
    'data-nimg="fill"',
  )
})
