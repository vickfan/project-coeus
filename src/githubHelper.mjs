import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { Octokit } from '@octokit/rest'
import dotenv from 'dotenv'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const REPO_ROOT = path.join(__dirname, '..')
const NOTES_DIR = path.join(REPO_ROOT, 'notes')

const RETRY_DELAYS_MS = [1000, 2000, 4000]

function createOctokit() {
  const token = process.env.COEUS_NOTES_TOKEN
  if (!token) {
    throw new Error('COEUS_NOTES_TOKEN is required')
  }
  return new Octokit({ auth: token })
}

function getRepoConfig() {
  const owner = process.env.COEUS_USERNAME
  const repo = process.env.COEUS_NOTES_REPO
  if (!owner || !repo) {
    throw new Error('COEUS_USERNAME and COEUS_NOTES_REPO are required')
  }
  return { owner, repo }
}

export function toRepoPath(localPath) {
  const resolved = path.resolve(localPath)
  const notesResolved = path.resolve(NOTES_DIR)

  if (resolved.startsWith(notesResolved + path.sep) || resolved === notesResolved) {
    return path.relative(notesResolved, resolved).split(path.sep).join('/')
  }

  return localPath.replace(/^\//, '')
}

async function getFileSha(octokit, owner, repo, repoPath) {
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path: repoPath })
    if (Array.isArray(data)) {
      throw new Error(`Expected file, got directory: ${repoPath}`)
    }
    return data.sha
  } catch (err) {
    if (err.status === 404) return undefined
    throw err
  }
}

async function upsertFile(octokit, owner, repo, repoPath, content, commitMessage) {
  const sha = await getFileSha(octokit, owner, repo, repoPath)

  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: repoPath,
    message: commitMessage,
    content: Buffer.from(content, 'utf8').toString('base64'),
    ...(sha ? { sha } : {}),
  })
}

async function syncFileWithRetry(localPath, commitMessage) {
  const octokit = createOctokit()
  const { owner, repo } = getRepoConfig()
  const repoPath = toRepoPath(localPath)
  const content = await fs.readFile(localPath, 'utf8')

  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
    try {
      await upsertFile(octokit, owner, repo, repoPath, content, commitMessage)
      console.log(`Successfully synced ${repoPath}`)
      return
    } catch (error) {
      console.error(
        `GitHub sync failed for ${repoPath} (attempt ${attempt + 1}/${RETRY_DELAYS_MS.length}):`,
        error.message,
      )
      if (attempt < RETRY_DELAYS_MS.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]))
      } else {
        throw error
      }
    }
  }
}

export class GitHubHelper {
  static async syncToGitHub(commitMessage, options = {}) {
    const { filePath, filePaths, onError } = options
    const paths = filePaths ?? (filePath ? [filePath] : [])

    if (paths.length === 0) {
      throw new Error('syncToGitHub requires filePath or filePaths')
    }

    try {
      for (const localPath of paths) {
        await syncFileWithRetry(localPath, commitMessage)
      }
      return { success: true }
    } catch (error) {
      if (onError) await onError(error)
      return { success: false, error }
    }
  }
}
