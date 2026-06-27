import { Telegraf } from 'telegraf'
import { TextHandler } from './handlers/textHandler.mjs'
import { FileHandler } from './handlers/fileHandler.mjs'
import dotenv from 'dotenv'

dotenv.config()

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN)

bot.on('text', async (ctx) => {
  const text = ctx.message.text

  await TextHandler.handleText(ctx, text)
})

// 2. 處理檔案輸入 (.md 深度筆記)
bot.on('document', async (ctx) => {
  const doc = ctx.message.document

  await FileHandler.handleFile(ctx, doc)
})

// 啟動 Bot
bot.launch()
console.log('Coeus catcher bot is flying... 🚀')

// 優雅停機
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
