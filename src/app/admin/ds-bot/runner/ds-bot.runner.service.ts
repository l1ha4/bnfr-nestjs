// src\app\admin\ds-bot\runner\ds-bot.runner.service.ts

import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { PrismaService } from '@/core/prisma/prisma.service'
import { DsBotManagerService } from '../manager/ds-bot.manager.service'

@Injectable()
export class DsBotRunnerService implements OnModuleInit {
  private readonly logger = new Logger(DsBotRunnerService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly manager: DsBotManagerService,
  ) {}

  async onModuleInit() {
    const bots = await this.prisma.dsBot.findMany({
      where: {
        isActive: true,
      },
    })

    for (const bot of bots) {
      try {
        await this.manager.startBot(bot.id, bot.secretTokenBot)

        this.logger.log(`Bot started: ${bot.id}`)
      } catch (error) {
        this.logger.error(`Failed to start bot: ${bot.id}`, error)
      }
    }
  }
}
