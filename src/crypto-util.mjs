import crypto from 'crypto'
import dotenv from 'dotenv'

dotenv.config()

export class CryptoUtil {
  static encrypt(text) {
    const key = Buffer.from(process.env.ENCRYPTION_KEY, 'utf-8')
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    return iv.toString('hex') + ':' + encrypted
  }

  static decrypt(text) {

  }
}
