import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { GitHubHelper } from './githubHelper.mjs'
import crypto from 'crypto'
import { CryptoUtil } from './cryptoUtil.mjs'
import { extractNoteMeta, embedText } from './llmProvider.mjs'
import { resolveLlmProvider } from './llm/resolveProvider.mjs'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log(`[Coeus Weaver] LLM_PROVIDER=${resolveLlmProvider()}`)

function sanitizeTitle(title) {
  return title.replace(/[\/\\?%*:|"<>]/g, '-')
}

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

async function startWeaving(rawNoteText, options = {}) {
  const {
    titleOverride,
    skipGitSync = process.env.GITHUB_ACTIONS === 'true',
  } = options

  if (!rawNoteText.trim()) {
    return
  }

  const newVector = await embedText(rawNoteText)
  const meta = await extractNoteMeta(rawNoteText)
  const title = sanitizeTitle(titleOverride ?? meta.title)
  const tags = meta.tags

  const indexPath = path.join(__dirname, '../notes', 'index.json')
  const notesDir = path.join(__dirname, '../notes', 'persistent')
  let top5Links = []

  if (fs.existsSync(indexPath)) {
    const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf-8'))

    const scored = indexData.map((oldNote) => {
      const score = cosineSimilarity(newVector, oldNote.embedding)
      const shared = hasSharedTags(tags, oldNote.tags)

      let passThreshold = false
      if (shared) {
        passThreshold = score > 0.45
      } else {
        passThreshold = score > 0.75
      }

      return {
        title: oldNote.title,
        score: score,
        pass: passThreshold,
      }
    })

    top5Links = scored
      .filter((item) => item.pass)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((item) => item.title)

    console.log('經過 Tag 交叉過濾後的精準網眼：', top5Links)
  }

  const coeusPayload = {
    uuid: crypto.randomUUID(),
    title: title,
    tags: tags,
    raw_content: rawNoteText,
    vector: newVector,
    suggested_wiki_links: top5Links,
  }

  buildAndSaveMarkdown(coeusPayload)

  const newCardPath = path.join(notesDir, `${coeusPayload.title}.md`)
  const syncedPaths = [newCardPath, indexPath]

  if (
    coeusPayload.suggested_wiki_links &&
    coeusPayload.suggested_wiki_links.length > 0
  ) {
    coeusPayload.suggested_wiki_links.forEach((oldTitle) => {
      const oldFilePath = path.join(notesDir, `${oldTitle}.md`)

      const actualOldPath = fs.existsSync(oldFilePath) ? oldFilePath : null

      if (actualOldPath) {
        let oldContent = fs.readFileSync(actualOldPath, 'utf-8')
        const sectionHeader = `\n\n---\n### 🧠 Coeus 織網連結 (回程)`

        if (!oldContent.includes(sectionHeader)) {
          oldContent += `${sectionHeader}\n- [[${coeusPayload.title}]]`
        } else if (!oldContent.includes(`- [[${coeusPayload.title}]]`)) {
          oldContent = oldContent.replace(
            sectionHeader,
            `${sectionHeader}\n- [[${coeusPayload.title}]]`,
          )
        }

        fs.writeFileSync(actualOldPath, oldContent, 'utf-8')
        syncedPaths.push(actualOldPath)
        console.log(
          `[🕸️ 雙向成功] 已回溯更新舊卡片: ${oldTitle} ➔ 連回 [[${coeusPayload.title}]]`,
        )
      }
    })
  }

  if (!skipGitSync) {
    await GitHubHelper.syncToGitHub(
      `Weave note: ${coeusPayload.uuid} - ${coeusPayload.title}`,
      { filePaths: syncedPaths },
    )
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
    title: payload.title,
    tags: payload.tags,
    embedding: payload.vector,
  })

  if (!fs.existsSync(indexDir)) {
    fs.mkdirSync(indexDir, { recursive: true })
  }
  fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2), 'utf-8')
}

function hasSharedTags(tagsA, tagsB) {
  if (!tagsA || !tagsB) return false
  const setA = new Set(tagsA.map((t) => t.toLowerCase().trim()))
  return tagsB.some((t) => setA.has(t.toLowerCase().trim()))
}

export { startWeaving }
