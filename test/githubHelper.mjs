import { describe, it, beforeEach, afterEach } from 'mocha'
import assert from 'assert'
import path from 'path'
import { fileURLToPath } from 'url'
import { toRepoPath, isProdSyncEnabled } from '../src/githubHelper.mjs'

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

describe('isProdSyncEnabled', () => {
  const saved = {}

  beforeEach(() => {
    saved.NODE_ENV = process.env.NODE_ENV
  })

  afterEach(() => {
    if (saved.NODE_ENV === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = saved.NODE_ENV
  })

  it('returns true only when NODE_ENV is PROD', () => {
    process.env.NODE_ENV = 'PROD'
    assert.strictEqual(isProdSyncEnabled(), true)

    process.env.NODE_ENV = 'prod'
    assert.strictEqual(isProdSyncEnabled(), true)
  })

  it('returns false for development or unset', () => {
    process.env.NODE_ENV = 'development'
    assert.strictEqual(isProdSyncEnabled(), false)

    delete process.env.NODE_ENV
    assert.strictEqual(isProdSyncEnabled(), false)
  })
})
