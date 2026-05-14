// ds-bot-runner.service.ts

import { Injectable, OnModuleInit } from '@nestjs/common'
import { PrismaService } from '@/core/prisma/prisma.service'
import { DsBotManagerService } from '../manager/ds-bot.manager.service'

@Injectable()
export class DsBotRunnerService implements OnModuleInit {
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
      await this.manager.startBot(bot.id, bot.secretTokenBot)
    }
  }
}
