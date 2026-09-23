/**
 * Emits `dist/index.mjs` and `dist/next.mjs` as re-exports of their CJS
 * builds.
 *
 * The ESM entry cannot be bundled from `src/index.ts` on its own. bun evaluates
 * the CJS dependencies of a module graph while it is being linked, before any
 * ESM module body runs, so an ESM entry that statically imports
 * `@testing-library/react` always evaluates `react-dom` before happy-dom is
 * registered - no matter where the bundler places the registration, and no
 * matter how the entry is split across files.
 *
 * Re-exporting the CJS build keeps a real ESM entry point while leaving the
 * ordering to `require`, which is an ordinary runtime call and therefore
 * happens in source order. It also means a preload and a test that import
 * the same entry share one copy of it.
 */
await Bun.write('dist/index.mjs', "export * from './index.cjs'\n")
await Bun.write('dist/next.mjs', "export * from './next.cjs'\n")
