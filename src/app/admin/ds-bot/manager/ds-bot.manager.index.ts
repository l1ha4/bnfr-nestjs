import { DsBotTokenCryptoService } from './crypto/ds-bot-token-crypto.service'
import { DsBotManagerService } from './ds-bot.manager.service'
import { DsBotVoiceActivityManager } from './voice-activity/ds-bot-voice-activity.manager.service'

export const dsBotManagerProviders = [
  DsBotManagerService,
  DsBotTokenCryptoService,
  DsBotVoiceActivityManager,
]
