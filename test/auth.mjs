import { describe, it, beforeEach, afterEach } from 'mocha'
import assert from 'assert'
import { isAuthorized } from '../src/auth.mjs'

describe('isAuthorized', () => {
  const saved = {}

  beforeEach(() => {
    saved.TELEGRAM_USER_ID = process.env.TELEGRAM_USER_ID
  })

  afterEach(() => {
    if (saved.TELEGRAM_USER_ID === undefined) delete process.env.TELEGRAM_USER_ID
    else process.env.TELEGRAM_USER_ID = saved.TELEGRAM_USER_ID
  })

  it('returns true for matching user id', () => {
    process.env.TELEGRAM_USER_ID = '12345'
    assert.strictEqual(isAuthorized(12345), true)
    assert.strictEqual(isAuthorized('12345'), true)
  })

  it('returns false for non-matching user id', () => {
    process.env.TELEGRAM_USER_ID = '12345'
    assert.strictEqual(isAuthorized(99999), false)
  })

  it('throws when TELEGRAM_USER_ID is missing', () => {
    delete process.env.TELEGRAM_USER_ID
    assert.throws(() => isAuthorized(12345), /TELEGRAM_USER_ID is required/)
  })
})
