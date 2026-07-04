import { describe, it } from 'mocha'
import assert from 'assert'
import path from 'path'
import { fileURLToPath } from 'url'
import { toRepoPath } from '../src/githubHelper.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const notesDir = path.join(__dirname, '../notes')

describe('toRepoPath', () => {
  it('maps local notes paths to repo-relative paths', () => {
    const local = path.join(notesDir, 'raw-notes', '2026-07-02-143052.md')
    assert.strictEqual(toRepoPath(local), 'raw-notes/2026-07-02-143052.md')
  })

  it('passes through already repo-relative paths', () => {
    assert.strictEqual(toRepoPath('raw-notes/my-note.md'), 'raw-notes/my-note.md')
  })
})
