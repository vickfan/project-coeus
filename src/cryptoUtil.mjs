import crypto from 'crypto'
import dotenv from 'dotenv'

dotenv.config()

export class CryptoUtil {
  static encrypt(text) {
    if (!process.env.ENCRYPTION_ENABLED) {
      return text
    }
    const key = Buffer.from(process.env.ENCRYPTION_KEY, 'utf-8')
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    return iv.toString('hex') + ':' + encrypted
  }

  static decrypt(text) {
    if (!process.env.ENCRYPTION_ENABLED) {
      return text
    }
    if (!text.includes(':')) {
      return text
    }

    const key = Buffer.from(process.env.ENCRYPTION_KEY, 'utf-8')
    const [ivHex, encryptedHex] = text.split(':')
    const iv = Buffer.from(ivHex, 'hex')
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  }
}
