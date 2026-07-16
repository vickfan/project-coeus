import path from 'path'

const TIMESTAMP_CAPTURE_REGEX = /^\d{4}-\d{2}-\d{2}-\d{6}\.md$/
const HASHTAG_REGEX = /(?:^|[\s([{])#([\p{L}\p{N}_/-]+)/gu
const DEFAULT_TAG_CAP = 5

export function isTimestampCapture(basename) {
  return TIMESTAMP_CAPTURE_REGEX.test(basename)
}

export function stripTelegramFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)
  if (!match) return content

  const frontmatter = match[1]
  const body = match[2]
  if (!frontmatter.includes('source: telegram-text')) return content

  return body.trimStart()
}

export function titleFromFilename(basename) {
  const baseName = path.basename(basename, path.extname(basename))
  return baseName.replace(/[\/\\?%*:|"<>]/g, '-')
}

function stripQuotes(value) {
  const trimmed = value.trim()
  return trimmed.replace(/^["']|["']$/g, '').trim()
}

function dedupePreserveOrder(tags) {
  const seen = new Set()
  const result = []
  for (const raw of tags) {
    const tag = typeof raw === 'string' ? raw.trim() : ''
    if (!tag) continue
    const key = tag.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(tag)
  }
  return result
}

function splitFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) return { frontmatter: null, body: content }
  return { frontmatter: match[1], body: match[2] }
}

function parseFrontmatterTags(frontmatter) {
  if (!frontmatter) return []

  const listMatch = frontmatter.match(/^tags:\s*\n((?:[ \t]*-[ \t]*.+\n?)+)/m)
  if (listMatch) {
    return listMatch[1]
      .split('\n')
      .map((line) => {
        const item = line.match(/^[ \t]*-[ \t]*(.+?)\s*$/)
        return item ? stripQuotes(item[1]) : ''
      })
      .filter(Boolean)
  }

  const inlineMatch = frontmatter.match(/^tags:\s*\[([^\]]*)\]/m)
  if (inlineMatch) {
    return inlineMatch[1]
      .split(',')
      .map((part) => stripQuotes(part))
      .filter(Boolean)
  }

  return []
}

function extractHashtags(body) {
  const tags = []
  for (const match of body.matchAll(HASHTAG_REGEX)) {
    tags.push(match[1])
  }
  return tags
}

export function extractExistingTags(content) {
  const { frontmatter, body } = splitFrontmatter(content)
  return dedupePreserveOrder([
    ...parseFrontmatterTags(frontmatter),
    ...extractHashtags(body),
  ])
}

export function mergeTags(existingTags, llmTags, maxTotal = DEFAULT_TAG_CAP) {
  const merged = dedupePreserveOrder(existingTags || [])
  const seen = new Set(merged.map((tag) => tag.toLowerCase()))

  for (const raw of llmTags || []) {
    if (merged.length >= maxTotal) break
    const tag = typeof raw === 'string' ? raw.trim() : ''
    if (!tag) continue
    const key = tag.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(tag)
  }

  return merged
}
