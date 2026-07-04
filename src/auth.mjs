// v2: extend with TELEGRAM_ALLOWED_IDS comma-separated allowlist

export function isAuthorized(telegramUserId) {
  const ownerId = process.env.TELEGRAM_USER_ID
  if (!ownerId) {
    throw new Error('TELEGRAM_USER_ID is required')
  }
  return String(telegramUserId) === String(ownerId)
}
