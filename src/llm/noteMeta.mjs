import { Type } from '@google/genai'
import { createGeminiClient } from './geminiClient.mjs'
import { resolveLlmProvider } from './resolveProvider.mjs'

const META_SYSTEM_INSTRUCTION =
  '你是一個嚴格的個人知識庫(PKM)管理員。你的唯一任務是分析用戶輸入的筆記內容，並為其提取一個適合當作 Obsidian 檔名的標題，以及 2-3 個分類標籤。絕對不要包含任何筆記原文。'

const META_JSON_SCHEMA = {
  type: 'object',
  properties: {
    title: {
      type: 'string',
      description: '一個適合當作 Obsidian Markdown 檔案名稱的簡短標準標題，移除非法字元。',
    },
    tags: {
      type: 'array',
      items: { type: 'string' },
      description: '2-3 個最相關的領域標籤。',
    },
  },
  required: ['title', 'tags'],
}

function normalizeNoteText(rawNoteText) {
  return typeof rawNoteText === 'string' ? rawNoteText : JSON.stringify(rawNoteText)
}

function parseMetaJson(text) {
  const parsed = JSON.parse(text)
  if (!parsed.title || !Array.isArray(parsed.tags)) {
    throw new Error('Invalid metadata JSON from LLM')
  }
  return parsed
}

async function extractMetaViaGemini(rawNoteText) {
  const ai = createGeminiClient()
  const response = await ai.models.generateContent({
    model: process.env.GEMINI_META_MODEL || 'gemini-2.5-flash',
    contents: normalizeNoteText(rawNoteText),
    config: {
      systemInstruction: META_SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: {
            type: Type.STRING,
            description:
              '一個適合當作 Obsidian Markdown 檔案名稱的簡短標準標題，移除非法字元。',
          },
          tags: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: '2-3 個最相關的領域標籤。',
          },
        },
        required: ['title', 'tags'],
      },
    },
  })

  return parseMetaJson(response.text)
}

async function extractMetaViaGithub(rawNoteText) {
  const token = process.env.GITHUB_TOKEN
  if (!token) {
    throw new Error('GITHUB_TOKEN is required when LLM_PROVIDER=github')
  }

  const endpoint =
    process.env.GITHUB_MODELS_ENDPOINT ||
    'https://models.github.ai/inference/chat/completions'
  const model = process.env.GITHUB_MODEL || 'openai/gpt-4o-mini'

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github+json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: META_SYSTEM_INSTRUCTION },
        {
          role: 'user',
          content: `${normalizeNoteText(rawNoteText)}\n\nRespond with JSON only: {"title":"...","tags":["..."]}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`GitHub Models API error (${response.status}): ${errorBody}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('GitHub Models API returned empty content')
  }

  return parseMetaJson(content)
}

export async function extractNoteMeta(rawNoteText) {
  const provider = resolveLlmProvider()
  console.log(`[LLM] extractNoteMeta via ${provider}`)

  if (provider === 'github') {
    return extractMetaViaGithub(rawNoteText)
  }
  return extractMetaViaGemini(rawNoteText)
}

export { META_SYSTEM_INSTRUCTION, META_JSON_SCHEMA }
