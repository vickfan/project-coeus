import { describe, it } from 'mocha'
import assert from 'assert'
import {
  isTimestampCapture,
  stripTelegramFrontmatter,
  titleFromFilename,
  extractExistingTags,
  mergeTags,
  sanitizeLlmTags,
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

  describe('extractExistingTags', () => {
    it('reads inline frontmatter tags', () => {
      const input = `---
tags: [ai, "pkm"]
---

Body`
      assert.deepStrictEqual(extractExistingTags(input), ['ai', 'pkm'])
    })

    it('reads list frontmatter tags and body hashtags', () => {
      const input = `---
tags:
  - Obsidian
  - export
---

Note about #zettelkasten and #PKM`
      assert.deepStrictEqual(extractExistingTags(input), [
        'Obsidian',
        'export',
        'zettelkasten',
        'PKM',
      ])
    })

    it('dedupes case-insensitively across sources', () => {
      const input = `---
tags: [AI]
---

Talking about #ai`
      assert.deepStrictEqual(extractExistingTags(input), ['AI'])
    })
  })

  describe('mergeTags', () => {
    it('keeps all existing and fills with llm up to 5', () => {
      assert.deepStrictEqual(
        mergeTags(['a', 'b'], ['b', 'c', 'd', 'e', 'f']),
        ['a', 'b', 'c', 'd', 'e'],
      )
    })

    it('never drops existing when over the cap', () => {
      assert.deepStrictEqual(
        mergeTags(['a', 'b', 'c', 'd', 'e', 'f'], ['g', 'h']),
        ['a', 'b', 'c', 'd', 'e', 'f'],
      )
    })

    it('drops junk llm tags before merge', () => {
      assert.deepStrictEqual(mergeTags(['keep'], ['...', 'ok', '…']), ['keep', 'ok'])
    })
  })

  describe('sanitizeLlmTags', () => {
    it('removes ellipsis and punctuation-only tags', () => {
      assert.deepStrictEqual(sanitizeLlmTags(['...', '…', '.', 'AI']), ['AI'])
    })

    it('removes simplified Chinese tags and keeps english or traditional', () => {
      assert.deepStrictEqual(
        sanitizeLlmTags(['学习', '學習', 'learning', '请计的欢张']),
        ['學習', 'learning'],
      )
    })

    it('allows empty tag lists', () => {
      assert.deepStrictEqual(sanitizeLlmTags([]), [])
      assert.deepStrictEqual(sanitizeLlmTags(['...', '']), [])
    })

    it('replaces spaces with hyphens', () => {
      assert.deepStrictEqual(
        sanitizeLlmTags(['Data Collection', 'product  team']),
        ['Data-Collection', 'product-team'],
      )
    })
  })

  describe('extractExistingTags spaces', () => {
    it('hyphenates spaced frontmatter tags', () => {
      const input = `---
tags: ["Data Collection", "product team"]
---

Body`
      assert.deepStrictEqual(extractExistingTags(input), [
        'Data-Collection',
        'product-team',
      ])
    })
  })
})
