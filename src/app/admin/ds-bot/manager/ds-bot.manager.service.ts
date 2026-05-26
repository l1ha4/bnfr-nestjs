import { Injectable, Logger } from '@nestjs/common'
import { Client, Events, GatewayIntentBits, Partials } from 'discord.js'
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
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
      partials: [Partials.Message, Partials.Channel],
    })

    client.once(Events.ClientReady, async (readyClient) => {
      this.events.register(botId, readyClient)

      try {
        await this.profileSync.syncOnce(botId, readyClient)
      } catch (error) {
        this.logger.error(
          `Failed to sync bot profile on ready: ${botId}`,
          error,
        )
      }

      this.profileSync.startAutoSync(botId, readyClient)

      try {
        await this.dsBotSync.syncBotGuilds(botId, readyClient)
      } catch (error) {
        this.logger.error(
          `Failed to run initial guild sync on ready: ${botId}`,
          error,
        )
      }
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
