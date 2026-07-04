import path from 'path'

const TIMESTAMP_CAPTURE_REGEX = /^\d{4}-\d{2}-\d{2}-\d{6}\.md$/

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
