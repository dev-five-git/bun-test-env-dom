import { resettableMock } from './state.ts'

// Caching and revalidation have no effect in a test. Each function is a mock,
// so a test can assert what was revalidated:
//   expect(revalidatePath).toHaveBeenCalledWith('/posts')

export const revalidatePath =
  resettableMock<(path: string, type?: 'layout' | 'page') => void>()
export const revalidateTag =
  resettableMock<
    (tag: string, profile?: string | { expire?: number }) => void
  >()
export const updateTag = resettableMock<(tag: string) => void>()
export const refresh = resettableMock<() => void>()
export const unstable_noStore = resettableMock<() => void>()
export const cacheLife = resettableMock<(profile: string | object) => void>()
export const cacheTag = resettableMock<(...tags: string[]) => void>()
export const unstable_cacheLife = cacheLife
export const unstable_cacheTag = cacheTag
export const io = resettableMock(async () => {})

/** Returns the function itself: nothing is cached between calls. */
export const unstable_cache = resettableMock(
  <T extends (...args: never[]) => unknown>(
    fn: T,
    _keyParts?: string[],
    _options?: { revalidate?: number | false; tags?: string[] },
  ) => fn,
)
