// src\app\admin\ds-bot\manager\crypto\ds-bot-token-crypto.service.ts

import { Injectable } from '@nestjs/common'
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'crypto'
import dotenv from 'dotenv'
import dotenvExpand from 'dotenv-expand'

dotenvExpand.expand(dotenv.config())

@Injectable()
export class DsBotTokenCryptoService {
  private readonly algorithm = 'aes-256-gcm'

  private getKey() {
    const secret = process.env.DS_BOT_SERVICE_TOKEN_SECRET

    if (!secret) {
      throw new Error('DS_BOT_SERVICE_TOKEN_SECRET is not defined')
    }

    return scryptSync(secret, 'ds-bot-token-salt', 32)
  }

  encrypt(token: string) {
    const iv = randomBytes(12)
    const cipher = createCipheriv(this.algorithm, this.getKey(), iv)

    const encrypted = Buffer.concat([
      cipher.update(token, 'utf8'),
      cipher.final(),
    ])

    const authTag = cipher.getAuthTag()

    return [
      iv.toString('hex'),
      authTag.toString('hex'),
      encrypted.toString('hex'),
    ].join(':')
  }

  decrypt(encryptedToken: string) {
    const [ivHex, authTagHex, encryptedHex] = encryptedToken.split(':')

    if (!ivHex || !authTagHex || !encryptedHex) {
      throw new Error('Invalid encrypted token format')
    }

    const decipher = createDecipheriv(
      this.algorithm,
      this.getKey(),
      Buffer.from(ivHex, 'hex'),
    )

    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'))

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedHex, 'hex')),
      decipher.final(),
    ])

    return decrypted.toString('utf8')
  }
}
