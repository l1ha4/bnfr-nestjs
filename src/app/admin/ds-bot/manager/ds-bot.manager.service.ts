import { Injectable, Logger } from '@nestjs/common'
import { Client, Events, GatewayIntentBits } from 'discord.js'
import { DsBotProfileSyncService } from '../sync/ds-bot/ds-bot-profile.sync.service'
import { DsBotTokenCryptoService } from './crypto/ds-bot-token-crypto.service'
import { DsBotSyncService } from '../sync/ds-bot.sync.service'
import { DsBotEventsService } from '../events/ds-bot-event.service'

@Injectable()
export class DsBotManagerService {
  private readonly logger = new Logger(DsBotManagerService.name)

  private readonly clients = new Map<string, Client>()

  constructor(
    private readonly profileSync: DsBotProfileSyncService,
    private readonly tokenCrypto: DsBotTokenCryptoService,
    private readonly dsBotSync: DsBotSyncService,
    private readonly events: DsBotEventsService,
  ) {}

  isTokenInvalidError(error: unknown): error is { code: 'TokenInvalid' } {
    if (typeof error !== 'object' || error === null) {
      return false
    }

    const { code } = error as { code?: unknown }

    return code === 'TokenInvalid'
  }

  async startBot(botId: string, secretTokenBot: string) {
    if (this.clients.has(botId)) {
      this.logger.log(`Bot already started: ${botId}`)
      return
    }

    const token = this.tokenCrypto.decrypt(secretTokenBot)
    const client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildVoiceStates],
    })

    client.once(Events.ClientReady, async (readyClient) => {
      await this.profileSync.syncOnce(botId, readyClient)
      this.profileSync.startAutoSync(botId, readyClient)

      await this.dsBotSync.syncBotGuilds(botId, readyClient)

      this.events.register(botId, readyClient)
    })

    try {
      await client.login(token)
    } catch (error) {
      client.destroy()
      throw error
    }

    this.clients.set(botId, client)
  }

  async stopBot(botId: string) {
    const client = this.clients.get(botId)

    if (!client) return

    this.profileSync.stopAutoSync(botId)
    client.destroy()
    this.clients.delete(botId)

    this.logger.log(`Bot stopped: ${botId}`)
  }

  getClient(botId: string) {
    return this.clients.get(botId)
  }
}
