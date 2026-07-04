import { Telegraf } from 'telegraf'
import { TextHandler } from './handlers/textHandler.mjs'
import { FileHandler } from './handlers/fileHandler.mjs'
import { isAuthorized } from './auth.mjs'
import dotenv from 'dotenv'

dotenv.config()

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN)

bot.use(async (ctx, next) => {
  const userId = ctx.from?.id
  if (!userId || !isAuthorized(userId)) {
    return
  }
  return next()
})

bot.on('text', async (ctx) => {
  const text = ctx.message.text

  await TextHandler.handleText(ctx, text)
})

bot.on('document', async (ctx) => {
  const doc = ctx.message.document

  await FileHandler.handleFile(ctx, doc)
})

bot.launch()
console.log('Coeus catcher bot is flying... 🚀')

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
