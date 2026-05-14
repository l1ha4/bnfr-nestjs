import { Injectable } from '@nestjs/common'
import { Client, GatewayIntentBits } from 'discord.js'

@Injectable()
export class DsBotManagerService {
  private readonly clients = new Map<string, Client>()

  async startBot(botId: string, token: string) {
    if (this.clients.has(botId)) {
      return
    }

    const client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    })

    client.once('ready', () => {
      console.log(`Bot ${client.user?.tag} started`)
    })

    await client.login(token)

    this.clients.set(botId, client)
  }

  async stopBot(botId: string) {
    const client = this.clients.get(botId)

    if (!client) return

    client.destroy()
    this.clients.delete(botId)

    client.once('ready', () => {
      console.log(`Bot ${client.user?.tag} stoped`)
    })
  }

  getClient(botId: string) {
    return this.clients.get(botId)
  }
}
