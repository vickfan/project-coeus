import { describe, it, beforeEach, afterEach } from 'mocha'
import assert from 'assert'
import { resolveLlmProvider } from '../src/llm/resolveProvider.mjs'

describe('resolveLlmProvider', () => {
  const saved = {}

  beforeEach(() => {
    saved.LLM_PROVIDER = process.env.LLM_PROVIDER
    delete process.env.LLM_PROVIDER
  })

  afterEach(() => {
    if (saved.LLM_PROVIDER === undefined) delete process.env.LLM_PROVIDER
    else process.env.LLM_PROVIDER = saved.LLM_PROVIDER
  })

  it('defaults to cloudflare', () => {
    assert.strictEqual(resolveLlmProvider(), 'cloudflare')
  })

  it('accepts explicit LLM_PROVIDER=cloudflare', () => {
    process.env.LLM_PROVIDER = 'cloudflare'
    assert.strictEqual(resolveLlmProvider(), 'cloudflare')
  })

  it('rejects unsupported providers', () => {
    process.env.LLM_PROVIDER = 'gemini'
    assert.throws(() => resolveLlmProvider(), /Unsupported LLM_PROVIDER=gemini/)
  })
})
