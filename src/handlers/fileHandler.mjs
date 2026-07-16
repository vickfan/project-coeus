import path from 'path'
import { CryptoUtil } from '../cryptoUtil.mjs'
import fs from 'fs/promises'
import { GitHubHelper } from '../githubHelper.mjs'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function sanitizeFileName(fileName) {
  const baseName = path.basename(fileName, path.extname(fileName))
  return baseName.replace(/[\/\\?%*:|"<>]/g, '-')
}

export class FileHandler {
  static async handleFile(ctx, file) {
    const suffix = file.file_name.split('.').pop()

    switch (suffix) {
      case 'md':
        return await this.handleMarkdown(ctx, file)

      default:
        ctx.reply(`❌ 不支援嘅檔案格式: ${suffix}`)
        return false
    }
  }

  static async handleMarkdown(ctx, file) {
    const safeName = sanitizeFileName(file.file_name)

    try {
      await ctx.reply('📥 正在下載筆記...')

      const fileLink = await ctx.telegram.getFileLink(file.file_id)
      const response = await fetch(fileLink.href)
      const rawContent = await response.text()

      const encryptedContent = CryptoUtil.encrypt(rawContent)
      const filePath = path.join(__dirname, '../../notes/raw-notes', `${safeName}.md`)

      await fs.mkdir(path.dirname(filePath), { recursive: true })
      await fs.writeFile(filePath, encryptedContent, 'utf8')

      const syncResult = await GitHubHelper.syncToGitHub(`Capture note: ${safeName}`, {
        filePath,
        onError: async () => {
          await ctx.reply('❌ GitHub 同步失敗，筆記已本地儲存但未能上傳')
        },
      })

      if (syncResult.skipped) {
        await ctx.reply(`✅ 筆記「${safeName}」已本地儲存`)
      } else if (syncResult.success) {
        await ctx.reply(`✅ 筆記「${safeName}」已儲存並同步到 GitHub`)
      }

      return syncResult.success
    } catch (err) {
      console.error('handleMarkdown error', err)
      await ctx.reply('❌ 處理筆記檔案時發生錯誤')
      return false
    }
  }
}
