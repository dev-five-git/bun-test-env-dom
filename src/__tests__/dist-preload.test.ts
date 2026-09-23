import { expect, test } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dir, '../..')
const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes)
const spec = (path: string) => JSON.stringify(path.replaceAll('\\', '/'))

/**
 * The ordering this guards cannot be observed from inside this process.
 *
 * `react-dom` decides whether a DOM exists while it is being evaluated
 * (`canUseDOM`) and gates its entire DOM event-plugin setup on that answer, so
 * a DOM registered afterwards leaves a page React never dispatches into:
 * `fireEvent.change` runs, but no `onChange` handler ever fires. Only a fresh
 * process that preloads the artifact and then tries can see it.
 *
 * It also has to run against the *built* entry points rather than
 * `src/index.ts`, because the bundler decides where the registration lands
 * relative to the imports it emits. Source order proves nothing about what
 * consumers install.
 *
 * The same holds for the `userEvent` re-export: the CJS bundle resolves it
 * through the bundler's interop helper, and `export { default as userEvent }`
 * came out as user-event's whole module namespace (1.0.4), where
 * `userEvent.type` is undefined. So the fixture also types through the
 * `userEvent` it imports from the built entry.
 */

function buildArtifacts() {
  const bundle = Bun.spawnSync(
    [
      'bun',
      'build',
      '--target',
      'node',
      'src/index.ts',
      '--production',
      '--outfile',
      'dist/index.cjs',
      '--format',
      'cjs',
      '--packages',
      'external',
    ],
    { cwd: root, stdout: 'pipe', stderr: 'pipe' },
  )
  expect(bundle.exitCode).toBe(0)

  const esmEntry = Bun.spawnSync(['bun', 'scripts/write-esm-entry.ts'], {
    cwd: root,
    stdout: 'pipe',
    stderr: 'pipe',
  })
  expect(esmEntry.exitCode).toBe(0)
}

function preloadAndType(entry: string) {
  const dir = mkdtempSync(join(tmpdir(), 'bun-test-env-dom-'))
  try {
    // The fixture lives outside the package so this suite never collects it,
    // which rules out bare specifiers and JSX - both resolve from the file's
    // own directory. Absolute specifiers and `createElement` keep it portable.
    const reactPath = Bun.resolveSync('react', root)
    const rtlPath = Bun.resolveSync('@testing-library/react', root)
    const entryPath = resolve(root, entry)

    writeFileSync(
      join(dir, 'bunfig.toml'),
      `[test]\npreload = [${spec(entryPath)}]\ncoverage = false\n`,
    )
    writeFileSync(
      join(dir, 'order.test.ts'),
      `import { expect, mock, test } from 'bun:test'
import { fireEvent, render } from ${spec(rtlPath)}
import { createElement, useState } from ${spec(reactPath)}
import { userEvent } from ${spec(entryPath)}

function Field({ onSubmit }: { onSubmit: (value: string) => void }) {
  const [value, setValue] = useState('')
  return createElement(
    'form',
    {
      onSubmit: (event: { preventDefault: () => void }) => {
        event.preventDefault()
        onSubmit(value)
      },
    },
    createElement('label', { htmlFor: 'field' }, 'field'),
    createElement('input', {
      id: 'field',
      value,
      onChange: (event: { target: { value: string } }) =>
        setValue(event.target.value),
    }),
    createElement('button', { type: 'submit' }, 'submit'),
  )
}

test('fireEvent.change reaches the React onChange handler', () => {
  const onSubmit = mock((_value: string) => {})
  const view = render(createElement(Field, { onSubmit }))
  fireEvent.change(view.getByLabelText('field'), { target: { value: 'typed' } })
  fireEvent.click(view.getByRole('button', { name: 'submit' }))
  expect(onSubmit).toHaveBeenCalledWith('typed')
})

test('the re-exported userEvent types into the React field', async () => {
  const onSubmit = mock((_value: string) => {})
  const view = render(createElement(Field, { onSubmit }))
  await userEvent.type(view.getByLabelText('field'), 'typed')
  await userEvent.click(view.getByRole('button', { name: 'submit' }))
  expect(onSubmit).toHaveBeenCalledWith('typed')
})
`,
    )

    const run = Bun.spawnSync(
      [
        'bun',
        `--config=${join(dir, 'bunfig.toml')}`,
        'test',
        join(dir, 'order.test.ts'),
      ],
      { cwd: root, stdout: 'pipe', stderr: 'pipe' },
    )
    return {
      output: decode(run.stderr) + decode(run.stdout),
      exitCode: run.exitCode,
    }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

test.each([
  'dist/index.cjs',
  'dist/index.mjs',
])('%s registers a DOM first and re-exports a usable userEvent', (entry) => {
  buildArtifacts()
  const { output, exitCode } = preloadAndType(entry)
  expect(output).toContain('2 pass')
  expect(output).toContain('0 fail')
  expect(exitCode).toBe(0)
})
