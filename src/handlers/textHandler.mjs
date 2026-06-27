import moment from 'moment'
import path from 'path'
import { CryptoUtil } from '../crypto-util.mjs'
import fs from 'fs/promises'
import { GitHubHelper } from '../githubHelper.mjs'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import { Gemini } from '../gemini.mjs'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export class TextHandler {
  static async handleText(ctx, text) {
    const chatId = ctx.chat.id
    const dateStr = moment().format('YYYY-MM-DD')
    const timeStr = moment().format('HH:mm:ss')
    const filePath = path.join(__dirname, '../../notes/conversation', `${dateStr}.md`)

    const aiReply = await Gemini.chat(chatId, text)

    const formattedText = `[${timeStr}] ${text}\n`
    const encryptedData = CryptoUtil.encrypt(formattedText)

    try {
      await fs.mkdir(path.dirname(filePath), { recursive: true })
      await fs.appendFile(filePath, encryptedData + '\n', 'utf8')

      ctx.reply(aiReply)

      GitHubHelper.syncToGitHub(`Capture text: ${dateStr}`)
      await ctx.reply('🔒 諗法已即時加密暫存')
      return true
    } catch (err) {
      await ctx.reply('❌ 寫入暫存失敗 \n' + err.message)
      return false
    }
  }
}