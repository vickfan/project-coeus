export function resolveLlmProvider() {
  const explicit = process.env.LLM_PROVIDER?.trim().toLowerCase()
  if (explicit && explicit !== 'cloudflare') {
    throw new Error(
      `Unsupported LLM_PROVIDER=${explicit}; only cloudflare is supported`,
    )
  }
  return 'cloudflare'
}
