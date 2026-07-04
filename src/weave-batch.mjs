import fs from 'fs/promises'
import fsSync from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import { CryptoUtil } from './cryptoUtil.mjs'
import { startWeaving } from './Weaver.mjs'
import {
  isTimestampCapture,
  stripTelegramFrontmatter,
  titleFromFilename,
} from './weaveBatchUtils.mjs'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const RETRY_DELAYS_MS = [1000, 2000, 4000]
const RAW_NOTES_DIR = path.join(__dirname, '../notes/raw-notes')

async function listRawNotes() {
  const entries = await fs.readdir(RAW_NOTES_DIR, { withFileTypes: true })
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => entry.name)
}

async function weaveWithRetry(basename) {
  const filePath = path.join(RAW_NOTES_DIR, basename)
  const encrypted = await fs.readFile(filePath, 'utf8')
  const decrypted = CryptoUtil.decrypt(encrypted)

  const isTimestamp = isTimestampCapture(basename)
  const content = isTimestamp ? stripTelegramFrontmatter(decrypted) : decrypted
  const options = {
    skipGitSync: true,
    ...(isTimestamp ? {} : { titleOverride: titleFromFilename(basename) }),
  }

  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
    try {
      await startWeaving(content, options)
      await fs.unlink(filePath)
      console.log(`[weave-batch] Deleted ${basename} after success`)
      return true
    } catch (err) {
      console.error(
        `[weave-batch] Attempt ${attempt + 1}/${RETRY_DELAYS_MS.length} failed for ${basename}:`,
        err.message,
      )
      if (attempt < RETRY_DELAYS_MS.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]))
      }
    }
  }

  return false
}

async function main() {
  if (!fsSync.existsSync(RAW_NOTES_DIR)) {
    console.error('[weave-batch] raw-notes directory missing')
    process.exit(1)
  }

  const files = await listRawNotes()
  if (files.length === 0) {
    console.log('[weave-batch] No files to process')
    process.exit(0)
  }

  console.log(`[weave-batch] Processing ${files.length} file(s)`)

  let failed = 0
  for (const basename of files) {
    const ok = await weaveWithRetry(basename)
    if (!ok) {
      failed++
      console.error(`[weave-batch] Left ${basename} in inbox after retries`)
    }
  }

  console.log(`[weave-batch] Done. ${files.length - failed} succeeded, ${failed} failed`)
  process.exit(0)
}

main().catch((err) => {
  console.error('[weave-batch] Fatal:', err)
  process.exit(1)
})
