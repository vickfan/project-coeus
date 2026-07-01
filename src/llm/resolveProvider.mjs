export function resolveLlmProvider() {
  const explicit = process.env.LLM_PROVIDER?.trim().toLowerCase()
  if (explicit === 'gemini' || explicit === 'github') {
    return explicit
  }
  if (process.env.GITHUB_ACTIONS === 'true') {
    return 'github'
  }
  return 'gemini'
}
