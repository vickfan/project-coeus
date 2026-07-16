import moment from 'moment-timezone'
import path from 'path'
import { CryptoUtil } from '../cryptoUtil.mjs'
import fs from 'fs/promises'
import { GitHubHelper } from '../githubHelper.mjs'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const MIN_TEXT_LENGTH = 10

export class TextHandler {
  static async handleText(ctx, text) {
    if (text.length < MIN_TEXT_LENGTH) {
      await ctx.reply('訊息太短，未能儲存（最少 10 個字元）')
      return false
    }

    const now = moment().tz('Asia/Hong_Kong')
    const timestamp = now.format('YYYY-MM-DD-HHmmss')
    const capturedAt = now.toISOString()
    const fileName = `${timestamp}.md`

    const content = `---
captured_at: ${capturedAt}
source: telegram-text
---

${text}`

    try {
      const filePath = path.join(__dirname, '../../notes/raw-notes', fileName)
      await fs.mkdir(path.dirname(filePath), { recursive: true })
      await fs.writeFile(filePath, CryptoUtil.encrypt(content), 'utf8')

      const syncResult = await GitHubHelper.syncToGitHub(`Capture text note: ${timestamp}`, {
        filePath,
        onError: async () => {
          await ctx.reply('❌ GitHub 同步失敗，筆記已本地儲存但未能上傳')
        },
      })

      if (syncResult.skipped) {
        await ctx.reply(`✅ 筆記已本地儲存 (${fileName})`)
      } else if (syncResult.success) {
        await ctx.reply(`✅ 筆記已儲存並同步到 GitHub (${fileName})`)
      }

      return syncResult.success
    } catch (err) {
      console.error('handleText error', err)
      await ctx.reply('❌ 處理文字筆記時發生錯誤')
      return false
    }
  }
}
