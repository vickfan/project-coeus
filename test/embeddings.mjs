import { describe, it } from 'mocha'
import assert from 'assert'
import { embedText, EMBEDDING_DIM } from '../src/llm/embeddings.mjs'

describe('embeddings', () => {
  it('returns a 384-dim vector of finite numbers', async () => {
    const vec = await embedText('Hash ring distributes keys across nodes.')

    assert.strictEqual(vec.length, EMBEDDING_DIM)
    assert.ok(vec.every((n) => typeof n === 'number' && Number.isFinite(n)))
  })
})
