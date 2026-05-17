// src/common/crypto/token-crypto.service.ts
import { Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

@Injectable()
export class TokenCryptoService {
  private readonly algorithm = 'aes-256-gcm';

  private getKey(): Buffer {
    const secret = process.env.BOT_TOKEN_SECRET;

    if (!secret) {
      throw new Error('BOT_TOKEN_SECRET is not defined');
    }

    return createHash('sha256').update(secret).digest();
  }

  encrypt(value: string): string {
    const iv = randomBytes(12);
    const key = this.getKey();

    const cipher = createCipheriv(this.algorithm, key, iv);

    const encrypted = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return [
      iv.toString('hex'),
      authTag.toString('hex'),
      encrypted.toString('hex'),
    ].join(':');
  }

  decrypt(payload: string): string {
    const [ivHex, authTagHex, encryptedHex] = payload.split(':');

    if (!ivHex || !authTagHex || !encryptedHex) {
      throw new Error('Invalid encrypted token format');
    }

    const key = this.getKey();

    const decipher = createDecipheriv(
      this.algorithm,
      key,
      Buffer.from(ivHex, 'hex'),
    );

    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedHex, 'hex')),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  }
}