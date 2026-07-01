import { execSync } from 'child_process'

const RETRY_DELAYS_MS = [1000, 2000, 4000]

export class GitHubHelper {
  static async syncToGitHub(commitMessage, options = {}) {
    const { onError } = options
    const maxRetries = RETRY_DELAYS_MS.length

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        execSync('git add .', { stdio: 'pipe' })
        const status = execSync('git status --porcelain', { encoding: 'utf8' })
        if (!status.trim()) {
          console.log('No changes to sync')
          return { success: true, noChanges: true }
        }
        execSync(`git commit -m ${JSON.stringify(commitMessage)}`, { stdio: 'pipe' })
        execSync('git push origin main', { stdio: 'pipe' })
        console.log(`Successfully synced: ${commitMessage}`)
        return { success: true }
      } catch (error) {
        console.error(`Git sync failed (attempt ${attempt + 1}/${maxRetries}):`, error.message)
        if (attempt < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]))
        } else {
          if (onError) await onError(error)
          return { success: false, error }
        }
      }
    }
  }
}
