import { describe, it, beforeEach, afterEach } from 'mocha'
import assert from 'assert'
import { resolveLlmProvider } from '../src/llm/resolveProvider.mjs'

describe('resolveLlmProvider', () => {
  const saved = {}

  beforeEach(() => {
    saved.LLM_PROVIDER = process.env.LLM_PROVIDER
    saved.GITHUB_ACTIONS = process.env.GITHUB_ACTIONS
    delete process.env.LLM_PROVIDER
    delete process.env.GITHUB_ACTIONS
  })

  afterEach(() => {
    if (saved.LLM_PROVIDER === undefined) delete process.env.LLM_PROVIDER
    else process.env.LLM_PROVIDER = saved.LLM_PROVIDER

    if (saved.GITHUB_ACTIONS === undefined) delete process.env.GITHUB_ACTIONS
    else process.env.GITHUB_ACTIONS = saved.GITHUB_ACTIONS
  })

  it('defaults to gemini', () => {
    assert.strictEqual(resolveLlmProvider(), 'gemini')
  })

  it('auto-selects github when GITHUB_ACTIONS=true', () => {
    process.env.GITHUB_ACTIONS = 'true'
    assert.strictEqual(resolveLlmProvider(), 'github')
  })

  it('lets explicit LLM_PROVIDER=gemini override GITHUB_ACTIONS', () => {
    process.env.GITHUB_ACTIONS = 'true'
    process.env.LLM_PROVIDER = 'gemini'
    assert.strictEqual(resolveLlmProvider(), 'gemini')
  })
})
