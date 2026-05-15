import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common'
import { Client } from 'discord.js'

import { PrismaService } from '@/core/prisma/prisma.service'

@Injectable()
export class DsBotProfileSyncService implements OnModuleDestroy {
  private readonly logger = new Logger(DsBotProfileSyncService.name)

  private readonly intervals = new Map<string, NodeJS.Timeout>()

  constructor(private readonly prisma: PrismaService) {}

  async syncOnce(botId: string, client: Client) {
    const user = client.user

    if (!user) {
      this.logger.warn(`Client user not found for bot: ${botId}`)
      return null
    }

    const avatarUrl = user.displayAvatarURL({
      extension: 'png',
      size: 256,
    })

    return this.prisma.dsBot.update({
      where: {
        id: botId,
      },
      data: {
        name: user.username,
        avatarUrl,
      },
    })
  }

  startAutoSync(botId: string, client: Client) {
    if (this.intervals.has(botId)) {
      return
    }

    const interval = setInterval(async () => {
      try {
        await this.syncOnce(botId, client)
      } catch (error) {
        this.logger.error(`Failed to auto sync bot profile: ${botId}`, error)
      }
    }, 1000 * 60 * 10)

    this.intervals.set(botId, interval)

    this.logger.log(`Profile auto sync started for bot: ${botId}`)
  }

  stopAutoSync(botId: string) {
    const interval = this.intervals.get(botId)

    if (!interval) {
      return
    }

    clearInterval(interval)
    this.intervals.delete(botId)

    this.logger.log(`Profile auto sync stopped for bot: ${botId}`)
  }

  onModuleDestroy() {
    for (const interval of this.intervals.values()) {
      clearInterval(interval)
    }

    this.intervals.clear()
  }
}