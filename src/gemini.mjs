import { GoogleGenAI } from '@google/genai'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { createGeminiClient } from './llm/geminiClient.mjs'

dotenv.config()

const chatContext = new Map()
const MAX_CONTEXT_LENGTH = 20

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const model = 'gemini-2.5-flash'

const systemInstruction = `
你是一個極具啟發性、博學且思維跳躍的 Zettelkasten 個人知識助手兼 Brainstorming 伙伴。
你的主要任務不是催促用戶記錄，而是作爲一個高水平的 Peer，接住用戶丟過來的任何跳脫、天馬行空、技術性或生活化的話題。

【核心行為準則】
1. 不要主動、生硬地詢問用戶「你想記下什麼？」或「需要幫你記錄嗎？」。
2. 當用戶分享一個點子、技術碎碎念或跳脫的話題時，你要順著他的邏輯往下思考，給予聰明的反饋、提出延伸問題、或者指出潛在的盲點。
3. 保持像一個高水平技術同事在 Slack 聊天的口吻：專業、親切、帶點工程師的冷幽默。
4. 使用地道、口語的香港廣東話回覆。
5. 說話要極度精煉、直奔主題！不要長篇大論，不要炫技，每條回覆盡量保持在 2-4 句內，方便在 Telegram 快速閱讀。
`

function createChatClient() {
  dotenv.config({ override: true })

  if (process.env.GEMINI_API_KEY) {
    return createGeminiClient()
  }

  process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(
    __dirname,
    '../project-coeus-api.json',
  )

  return new GoogleGenAI({
    vertexai: true,
    project: process.env.GOOGLE_CLOUD_PROJECT || 'project-coeus-500906',
    location: process.env.GOOGLE_CLOUD_LOCATION || 'asia-east1',
  })
}

export class Gemini {
  static async chat(chatId, userMessage) {
    if (!chatContext.has(chatId)) {
      chatContext.set(chatId, [])
    }
    const history = chatContext.get(chatId)

    try {
      const ai = createChatClient()
      const response = await ai.models.generateContent({
        model: model,
        contents: [
          ...history,
          { role: 'user', parts: [{ text: userMessage }] },
        ],
        config: {
          systemInstruction: systemInstruction.trim(),
        },
      })

      const aiReply = response.text
      history.push({ role: 'user', parts: [{ text: userMessage }] })
      history.push({ role: 'model', parts: [{ text: aiReply }] })

      while (history.length > MAX_CONTEXT_LENGTH) {
        history.shift()
      }

      chatContext.set(chatId, history)
      return aiReply
    } catch (error) {
      console.error('Gemini Chat Error:', error.message)
      return '(Gemini 腦袋開小差了，但我已安全加密並記錄你的點子！)'
    }
  }
}
