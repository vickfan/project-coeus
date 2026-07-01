import { GoogleGenAI } from '@google/genai'
import dotenv from 'dotenv'

export function createGeminiClient() {
  dotenv.config({ override: true })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is required (set in .env or environment)')
  }

  return new GoogleGenAI({ apiKey })
}
