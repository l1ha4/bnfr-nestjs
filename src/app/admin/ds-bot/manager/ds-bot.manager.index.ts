import { DsBotTokenCryptoService } from './crypto/ds-bot-token-crypto.service'
import { DsBotGuildManagerService } from './guild/ds-bot-guild.manager.service'
import { DsBotManagerService } from './ds-bot.manager.service'
import { DsBotVoiceActivityManager } from './voice-activity/ds-bot-voice-activity.manager.service'
import { DsBotMessageManager } from './send-message/ds-bot-message.manager.service'

export const dsBotManagerProviders = [
  DsBotManagerService,
  DsBotTokenCryptoService,
  DsBotGuildManagerService,
  DsBotVoiceActivityManager,
  DsBotMessageManager,
]
