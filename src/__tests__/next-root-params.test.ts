import { expect, test } from 'bun:test'
import { resetNext, setRootParams } from '../next/index.ts'

// A module's exports are fixed once it has loaded, so the names have to be
// set first. This is the only test file that loads `next/root-params`.
test('next/root-params exports a getter for each param set before it loads', async () => {
  setRootParams({ lang: 'ko', region: 'kr' })
  const params = await import('next/root-params')
  expect(Object.keys(params).sort()).toEqual(['lang', 'region'])
  expect(await params.lang()).toBe('ko')
  expect(await params.region()).toBe('kr')

  resetNext()
  expect(await params.lang()).toBeUndefined()
  setRootParams({ lang: 'en' })
  expect(await params.lang()).toBe('en')
})
