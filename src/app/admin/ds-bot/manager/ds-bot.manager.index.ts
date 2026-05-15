import { DsBotTokenCryptoService } from './crypto/ds-bot-token-crypto.service'
import { DsBotManagerService } from './ds-bot.manager.service'

export const dsBotManagerProviders = [
  DsBotManagerService,
  DsBotTokenCryptoService,
]
