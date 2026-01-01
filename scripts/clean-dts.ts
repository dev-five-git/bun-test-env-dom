import { readdir, unlink } from 'node:fs/promises'
import { join } from 'node:path'

const distDir = join(import.meta.dirname, '..', 'dist')
const files = await readdir(distDir)

for (const file of files) {
  if (file.endsWith('.d.ts') && file !== 'index.d.ts') {
    await unlink(join(distDir, file))
  }
}
