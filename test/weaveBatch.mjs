import { describe, it } from 'mocha'
import assert from 'assert'
import {
  isTimestampCapture,
  stripTelegramFrontmatter,
  titleFromFilename,
} from '../src/weaveBatchUtils.mjs'

describe('weaveBatchUtils', () => {
  describe('isTimestampCapture', () => {
    it('matches bot text capture filenames', () => {
      assert.strictEqual(isTimestampCapture('2026-07-02-143052.md'), true)
    })

    it('rejects upload filenames', () => {
      assert.strictEqual(isTimestampCapture('My Note Title.md'), false)
      assert.strictEqual(isTimestampCapture('2026-07-02.md'), false)
    })
  })

  describe('stripTelegramFrontmatter', () => {
    it('strips telegram-text frontmatter', () => {
      const input = `---
captured_at: 2026-07-02T14:30:52+08:00
source: telegram-text
---

Hello from Telegram`

      assert.strictEqual(stripTelegramFrontmatter(input), 'Hello from Telegram')
    })

    it('returns content unchanged when not telegram-text', () => {
      const input = `---
title: My upload
---

Body`

      assert.strictEqual(stripTelegramFrontmatter(input), input)
    })
  })

  describe('titleFromFilename', () => {
    it('strips extension and sanitizes illegal chars', () => {
      assert.strictEqual(titleFromFilename('My Note: Draft.md'), 'My Note- Draft')
    })
  })
})
