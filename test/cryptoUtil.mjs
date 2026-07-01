import { describe, it, before, after } from 'mocha'
import assert from 'assert'
import { CryptoUtil } from '../src/cryptoUtil.mjs'

describe('CryptoUtil', () => {
  const originalEnv = {}

  before(() => {
    originalEnv.ENCRYPTION_ENABLED = process.env.ENCRYPTION_ENABLED
    originalEnv.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY
    process.env.ENCRYPTION_ENABLED = 'true'
    process.env.ENCRYPTION_KEY = 'a'.repeat(32)
  })

  after(() => {
    process.env.ENCRYPTION_ENABLED = originalEnv.ENCRYPTION_ENABLED
    process.env.ENCRYPTION_KEY = originalEnv.ENCRYPTION_KEY
  })

  it('round-trips encrypt/decrypt', () => {
    const plaintext = '# Test note\n\nHello Coeus.'
    const encrypted = CryptoUtil.encrypt(plaintext)
    assert.strictEqual(CryptoUtil.decrypt(encrypted), plaintext)
  })

  it('passthrough decrypt when encryption disabled', () => {
    process.env.ENCRYPTION_ENABLED = 'false'
    const plaintext = 'plain text note'
    assert.strictEqual(CryptoUtil.decrypt(plaintext), plaintext)
    process.env.ENCRYPTION_ENABLED = 'true'
  })
})
