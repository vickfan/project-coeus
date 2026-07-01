import moment from 'moment-timezone'
import path from 'path'
import { CryptoUtil } from '../cryptoUtil.mjs'
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
    const now = moment().tz('Asia/Hong_Kong')
    const dateStr = now.format('YYYY-MM-DD')
    const timeStr = now.format('HH:mm:ss')
    const filePath = path.join(__dirname, '../../notes/conversation', `${dateStr}.md`)

    const aiReply = await Gemini.chat(chatId, text)

    const userLog = { role: 'user', text: text, time: timeStr }
    const modelLog = { role: 'model', text: aiReply, time: timeStr }

    try {
      await fs.mkdir(path.dirname(filePath), { recursive: true })

      let currentHistory = []
      try {
        const fileContent = await fs.readFile(filePath, 'utf8')
        currentHistory = JSON.parse(fileContent)
      } catch (e) {}

      currentHistory.push(userLog, modelLog)

      await fs.writeFile(
        filePath,
        JSON.stringify(currentHistory, null, 2),
        'utf8',
      )

      ctx.reply(aiReply)

      await GitHubHelper.syncToGitHub(`Capture conversation: ${dateStr}`)
      return true
    } catch (err) {
      console.error('handleText error', err)
      return false
    }
  }
}