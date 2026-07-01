import { pipeline, env } from '@xenova/transformers'

const DEFAULT_MODEL = 'Xenova/all-MiniLM-L6-v2'
const EMBEDDING_DIM = 384

env.allowLocalModels = true
env.useBrowserCache = false

let embedder = null
let embedderPromise = null

async function getEmbedder() {
  if (embedder) return embedder
  if (!embedderPromise) {
    const model = process.env.EMBEDDING_MODEL || DEFAULT_MODEL
    console.log(`[Embeddings] Loading Transformers.js model: ${model}`)
    embedderPromise = pipeline('feature-extraction', model)
  }
  embedder = await embedderPromise
  return embedder
}

export async function embedText(text) {
  if (!text?.trim()) {
    throw new Error('embedText requires non-empty text')
  }

  const extractor = await getEmbedder()
  const output = await extractor(text, { pooling: 'mean', normalize: true })
  const vector = Array.from(output.data)

  if (vector.length !== EMBEDDING_DIM) {
    throw new Error(`Expected ${EMBEDDING_DIM}-dim embedding, got ${vector.length}`)
  }

  return vector
}

export { EMBEDDING_DIM, DEFAULT_MODEL }
