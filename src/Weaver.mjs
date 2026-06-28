import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import { GoogleGenAI, Type } from '@google/genai'
import { fileURLToPath } from 'url'
import { GitHubHelper } from './githubHelper.mjs'
import crypto from 'crypto'
import { CryptoUtil } from './cryptoUtil.mjs'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
})

const rawNoteText = process.env.RAW_NOTE_TEXT || ''

function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i]
    normA += vecA[i] * vecA[i]
    normB += vecB[i] * vecB[i]
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

async function startWeaving(rawNoteText) {
  if (!rawNoteText.trim()) {
    return
  }

  try {
    const embResponse = await ai.models.embedContent({
      model: 'gemini-embedding-2',
      contents: {
        parts: [{ text: rawNoteText }],
      },
    })
    const newVector = embResponse.embeddings[0].values

    const meta = await askGeminiForMeta(rawNoteText)

    const indexPath = path.join(__dirname, '../notes', 'index.json')
    const notesDir = path.join(__dirname, '../notes', 'persistent')
    let top5Links = []

    if (fs.existsSync(indexPath)) {
      const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf-8'))

      const scored = indexData.map((oldNote) => {
        const score = cosineSimilarity(newVector, oldNote.embedding)

        // 1. 🔍 檢查呢篇舊筆記同新筆記有無共同 Tag
        const shared = hasSharedTags(meta.tags, oldNote.tags)

        // 2. 🔀 實施動態門檻規則
        let passThreshold = false
        if (shared) {
          // 有共同 Tag，證明大方向一致，Vector 相似度有 0.45 就可以織網
          passThreshold = score > 0.45
        } else {
          // 零共同 Tag，兩者係風馬牛不相及嘅領域，Vector 相似度必須極高（例如 0.75）先准過關
          passThreshold = score > 0.75
        }

        return {
          title: oldNote.title,
          score: score,
          pass: passThreshold,
        }
      })

      // 3. 🎯 篩選出真正 pass 嘅最頂尖 5 條線
      top5Links = scored
        .filter((item) => item.pass)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map((item) => item.title)

      console.log('經過 Tag 交叉過濾後的精準網眼：', top5Links)
    }

    const coeusPayload = {
      uuid: crypto.randomUUID(),
      title: meta.title.replace(/[\/\\?%*:|"<>]/g, '-'),
      tags: meta.tags,
      raw_content: rawNoteText,
      vector: newVector,
      suggested_wiki_links: top5Links,
    }

    buildAndSaveMarkdown(coeusPayload)

    if (
      coeusPayload.suggested_wiki_links &&
      coeusPayload.suggested_wiki_links.length > 0
    ) {
      coeusPayload.suggested_wiki_links.forEach((oldTitle) => {
        // 尋找舊卡片的路徑 (支持明文或加密後綴)
        const oldFilePath = path.join(notesDir, `${oldTitle}.md`)

        let actualOldPath = fs.existsSync(oldFilePath)
          ? oldFilePath
          : null

        if (actualOldPath) {
          // 讀取舊卡片原有內容
          let oldContent = fs.readFileSync(actualOldPath, 'utf-8')

          // 檢查舊卡片是不是已經有「Coeus 回溯連結」這個 Section
          const sectionHeader = `\n\n---\n### 🧠 Coeus 織網連結 (回程)`

          if (!oldContent.includes(sectionHeader)) {
            // 如果沒有，直接在最底追加 Section 標頭連同新卡片的 Wiki-link
            oldContent += `${sectionHeader}\n- [[${coeusPayload.title}]]`
          } else {
            // 如果有了，檢查是不是已經連過（防止重複跑 Actions 重複插入）
            if (!oldContent.includes(`- [[${coeusPayload.title}]]`)) {
              // 在該 Section 下方追加新連結
              oldContent = oldContent.replace(
                sectionHeader,
                `${sectionHeader}\n- [[${coeusPayload.title}]]`,
              )
            }
          }

          // 覆寫回舊檔案
          fs.writeFileSync(actualOldPath, oldContent, 'utf-8')
          console.log(
            `[🕸️ 雙向成功] 已回溯更新舊卡片: ${oldTitle} ➔ 連回 [[${coeusPayload.title}]]`,
          )
        }
      })
    }

    GitHubHelper.syncToGitHub(`Capture note: ${coeusPayload.uuid} - ${coeusPayload.title}`)
  } catch (err) {
    console.error('Coeus Core Error:', err)
    process.exit(1)
  }
}

function buildAndSaveMarkdown(payload) {
  const notesDir = path.join(__dirname, '../notes', 'persistent')
  const indexDir = path.join(__dirname, '../notes')

  let wikiLinksSection = ''
  if (payload.suggested_wiki_links && payload.suggested_wiki_links.length > 0) {
    wikiLinksSection = `\n\n---\n### 🧠 Coeus 織網連結\n${payload.suggested_wiki_links.map((t) => `- [[${t}]]`).join('\n')}`
  }

  const markdownTemplate = `---
uuid: ${payload.uuid}
tags: [${payload.tags.map((t) => `"${t}"`).join(', ')}]
created_at: ${new Date().toISOString()}
---

${payload.raw_content}
${wikiLinksSection}`
  
  const fileContent = CryptoUtil.encrypt(markdownTemplate)

  const fileName = `${payload.title}.md`
  const targetFilePath = path.join(notesDir, fileName)
  if (!fs.existsSync(notesDir)) {
    fs.mkdirSync(notesDir, { recursive: true })
  }
  fs.writeFileSync(targetFilePath, fileContent, 'utf-8')
  console.log(`[💾 儲存成功] 檔案已寫入: ${fileName}`)

  const indexPath = path.join(indexDir, 'index.json')
  let indexData = []

  if (fs.existsSync(indexPath)) {
    try {
      indexData = JSON.parse(fs.readFileSync(indexPath, 'utf-8'))
    } catch (e) {
      console.error('[⚠️ 警告] index.json 格式損壞，將重新初始化', e)
    }
  }

  indexData = indexData.filter(
    (item) => item.uuid !== payload.uuid && item.title !== payload.title,
  )

  indexData.push({
    uuid: payload.uuid,
    title: payload.title, // 記低明文 Title，下次第 2 步比對完可以直接用嚟砌 [[Wiki-link]]
    embedding: payload.vector,
  })

  if (!fs.existsSync(indexDir)) {
    fs.mkdirSync(indexDir, { recursive: true })
  }
  fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2), 'utf-8')
}

async function askGeminiForMeta(rawNoteText) {
  try {
    const catResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: typeof rawNoteText === 'string' ? rawNoteText : JSON.stringify(rawNoteText),
      config: {
        systemInstruction:
          '你是一個嚴格的個人知識庫(PKM)管理員。你的唯一任務是分析用戶輸入的筆記內容，並為其提取一個適合當作 Obsidian 檔名的標題，以及 2-3 個分類標籤。絕對不要包含任何筆記原文。',
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

    return JSON.parse(catResponse.text)
  } catch (err) {
    console.error('Gemini Schema Generation Failed:', err)
    throw err
  }
}

function hasSharedTags(tagsA, tagsB) {
  if (!tagsA || !tagsB) return false
  // 全部轉小階，防止 #Sports 同 #sports 對接唔到
  const setA = new Set(tagsA.map((t) => t.toLowerCase().trim()))
  return tagsB.some((t) => setA.has(t.toLowerCase().trim()))
}

// startWeaving()

export { startWeaving }