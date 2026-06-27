import path from 'path'
import { CryptoUtil } from '../crypto-util.mjs'
import fs from 'fs/promises'
import { GitHubHelper } from '../githubHelper.mjs'
import crypto from 'crypto'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

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
    try {
      await ctx.reply('📥 正在下載並加密筆記...')
    
      const fileLink = await ctx.telegram.getFileLink(file.file_id)
      const response = await fetch(fileLink.href)
      const rawContent = await response.text()
      console.log('rawContent', rawContent)

      const encryptedContent = CryptoUtil.encrypt(rawContent)
      console.log('encryptedContent', encryptedContent)
      const fileUuid = crypto.randomUUID()
      const filePath = path.join(__dirname, '../../notes/raw-notes', `${fileUuid}.md`)

      await fs.writeFile(filePath, encryptedContent, 'utf8')

      GitHubHelper.syncToGitHub(`Capture note: ${fileUuid}`)
      return true
    } catch (err) {
      console.error('handleMarkdown error', err)
      await ctx.reply('❌ 處理筆記檔案時發生錯誤')
      return false
    }
  }
}