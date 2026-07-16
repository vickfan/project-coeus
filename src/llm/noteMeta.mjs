import { resolveLlmProvider } from './resolveProvider.mjs'

const META_SYSTEM_INSTRUCTION =
  '你是一個嚴格的個人知識庫(PKM)管理員。你的唯一任務是分析用戶輸入的筆記內容，並為其提取一個適合當作 Obsidian 檔名的標題，以及 2-3 個分類標籤。絕對不要包含任何筆記原文。'

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

async function extractMetaViaCloudflare(rawNoteText) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const token = process.env.CLOUDFLARE_API_TOKEN
  if (!accountId || !token) {
    throw new Error('CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are required')
  }

  const model = process.env.CLOUDFLARE_AI_MODEL || '@cf/meta/llama-3.2-3b-instruct'
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1/chat/completions`

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
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
      max_tokens: 256,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Cloudflare Workers AI error (${response.status}): ${errorBody}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('Cloudflare Workers AI returned empty content')
  }

  return parseMetaJson(content)
}

export async function extractNoteMeta(rawNoteText) {
  resolveLlmProvider()
  console.log('[LLM] extractNoteMeta via cloudflare')
  return extractMetaViaCloudflare(rawNoteText)
}
