import { execSync } from 'child_process'

export class GitHubHelper {

  static syncToGitHub(commitMessage) {
    // try {
    //   execSync('git add .')
    //   execSync(`git commit -m "${commitMessage}"`)
    //   execSync('git push origin main')
    //   console.log(`Successfully synced: ${commitMessage}`)
    // } catch (error) {
    //   console.error('Git sync failed:', error.message)
    // }
  }
}