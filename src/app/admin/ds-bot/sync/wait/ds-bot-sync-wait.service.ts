import { Injectable } from '@nestjs/common'

import { PrismaService } from '@/core/prisma/prisma.service'
import { TimeoutWaitService } from '@/common/utils/timeout/timeout-wait.service'

@Injectable()
export class DsBotSyncWaitService {
  private static readonly SYNC_WAIT_INTERVAL_MS = 300
  private static readonly SYNC_WAIT_TIMEOUT_MS = 60_000

  constructor(
    private readonly prismaService: PrismaService,
    private readonly timeoutWaitService: TimeoutWaitService,
  ) {}

  async waitUntilAllSyncCompleted(): Promise<void> {
    await this.timeoutWaitService.waitWithTimeout(
      async () => {
        const loadingCount = await this.prismaService.dsBot.count({
          where: {
            isLoadingSync: true,
          },
        })

        return loadingCount === 0
      },
      'Ожидание завершения синхронизации ботов превысило лимит времени',
      DsBotSyncWaitService.SYNC_WAIT_TIMEOUT_MS,
      DsBotSyncWaitService.SYNC_WAIT_INTERVAL_MS,
    )
  }

  async waitUntilBotSyncCompleted(id: string): Promise<void> {
    await this.timeoutWaitService.waitWithTimeout(
      async () => {
        const dsBotState = await this.prismaService.dsBot.findUnique({
          where: {
            id,
          },
          select: {
            isLoadingSync: true,
          },
        })

        return !dsBotState || !dsBotState.isLoadingSync
      },
      `Ожидание синхронизации бота (${id}) превысило лимит времени`,
      DsBotSyncWaitService.SYNC_WAIT_TIMEOUT_MS,
      DsBotSyncWaitService.SYNC_WAIT_INTERVAL_MS,
    )
  }

  async waitUntilBotGuildsSyncCompleted(botId: string): Promise<void> {
    await this.timeoutWaitService.waitWithTimeout(
      async () => {
        const loadingGuildCount =
          await this.prismaService.dsBotGuildConnection.count({
            where: {
              botId,
              guild: {
                isLoadingSync: true,
              },
            },
          })

        return loadingGuildCount === 0
      },
      `Ожидание синхронизации гильдий бота (${botId}) превысило лимит времени`,
      DsBotSyncWaitService.SYNC_WAIT_TIMEOUT_MS,
      DsBotSyncWaitService.SYNC_WAIT_INTERVAL_MS,
    )
  }
}
