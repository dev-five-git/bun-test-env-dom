import { type CSSProperties, forwardRef, type ImgHTMLAttributes } from 'react'

export interface StaticImageData {
  src: string
  width: number
  height: number
  blurDataURL?: string
}

type ImageSource = string | StaticImageData | { default: StaticImageData }

type Size = number | `${number}`

type ImageProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  'src' | 'width' | 'height' | 'loading'
> & {
  src: ImageSource
  alt: string
  width?: Size
  height?: Size
  fill?: boolean
  loader?: unknown
  quality?: Size
  priority?: boolean
  preload?: boolean
  loading?: 'eager' | 'lazy'
  placeholder?: string
  blurDataURL?: string
  unoptimized?: boolean
  overrideSrc?: string
  onLoadingComplete?: (image: HTMLImageElement) => void
}

const FILL_STYLE: CSSProperties = {
  position: 'absolute',
  height: '100%',
  width: '100%',
  left: 0,
  top: 0,
  right: 0,
  bottom: 0,
}

const BLUR_STYLE: CSSProperties = {
  backgroundSize: 'cover',
  backgroundPosition: '50% 50%',
  backgroundRepeat: 'no-repeat',
}

const staticData = (src: ImageSource) =>
  typeof src === 'string' ? undefined : 'default' in src ? src.default : src

const toNumber = (value: Size | undefined) =>
  value === undefined ? undefined : Number(value)

/**
 * The props Next.js gives an unoptimized image: the source as written, lazy
 * unless preloaded, and the same inline style. There is no image optimizer in
 * a test, so `srcSet` and `/_next/image` URLs are never produced.
 */
export function getImageProps({
  src,
  width,
  height,
  fill,
  loader: _loader,
  quality: _quality,
  priority,
  preload,
  loading,
  placeholder,
  blurDataURL: _blurDataURL,
  unoptimized: _unoptimized,
  overrideSrc,
  onLoadingComplete: _onLoadingComplete,
  sizes: _sizes,
  className,
  style,
  ...rest
}: ImageProps) {
  const data = staticData(src)
  return {
    props: {
      ...rest,
      loading: priority || preload ? undefined : (loading ?? 'lazy'),
      width: fill ? undefined : toNumber(width ?? data?.width),
      height: fill ? undefined : toNumber(height ?? data?.height),
      decoding: 'async' as const,
      className,
      style: {
        ...(fill ? FILL_STYLE : {}),
        color: 'transparent',
        ...style,
        ...(placeholder === 'blur' ? BLUR_STYLE : {}),
      },
      src: overrideSrc ?? data?.src ?? (src as string),
    },
  }
}

const Image = forwardRef<HTMLImageElement, ImageProps>(
  function Image(props, ref) {
    const { loading, width, height, decoding, className, style, src, ...rest } =
      getImageProps(props).props
    // Attribute order follows Next.js, so the markup - and snapshots - match.
    return (
      // biome-ignore lint/a11y/useAltText: the required alt is in rest, in its place
      <img
        {...rest}
        ref={ref}
        loading={loading}
        width={width}
        height={height}
        decoding={decoding}
        data-nimg={props.fill ? 'fill' : '1'}
        className={className}
        style={style}
        src={src}
      />
    )
  },
)

export default Image

type LegacyImageProps = ImageProps & {
  layout?: 'fixed' | 'intrinsic' | 'responsive' | 'fill'
  objectFit?: CSSProperties['objectFit']
  objectPosition?: CSSProperties['objectPosition']
  lazyBoundary?: string
  lazyRoot?: unknown
}

/** `next/legacy/image`: the same image without the old wrapper spans. */
export const LegacyImage = forwardRef<HTMLImageElement, LegacyImageProps>(
  function LegacyImage(
    {
      layout = 'intrinsic',
      objectFit,
      objectPosition,
      lazyBoundary: _lazyBoundary,
      lazyRoot: _lazyRoot,
      style,
      ...props
    },
    ref,
  ) {
    const imageProps = getImageProps({
      ...props,
      style: { objectFit, objectPosition, ...style },
    }).props
    return (
      // biome-ignore lint/a11y/useAltText: the required alt is in imageProps
      <img {...imageProps} ref={ref} data-nimg={layout} />
    )
  },
)
