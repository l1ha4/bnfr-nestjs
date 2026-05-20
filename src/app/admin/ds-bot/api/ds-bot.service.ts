import { PrismaService } from '@/core/prisma/prisma.service'
import {
  ConflictException,
  Injectable,
  NotFoundException,
  RequestTimeoutException,
} from '@nestjs/common'
import { DsBot } from '@prisma/client'
import { CreateDsBotDto } from './dto/createDsBot.dto'
import { DsBotManagerService } from '../manager/ds-bot.manager.service'
import { DsBotTokenCryptoService } from '../manager/crypto/ds-bot-token-crypto.service'
import { DsBotGuildSettingsService } from '../settings/ds-bot-guild-settings.service'

@Injectable()
export class DsBotService {
  private static readonly SYNC_WAIT_INTERVAL_MS = 300
  private static readonly SYNC_WAIT_TIMEOUT_MS = 60_000

  constructor(
    private readonly prismaService: PrismaService,
    private readonly dsBotManager: DsBotManagerService,
    private readonly tokenCrypto: DsBotTokenCryptoService,
    private readonly guildSettings: DsBotGuildSettingsService,
  ) {}

  async findAll() {
    await this.waitUntilAllSyncCompleted()

    return await this.prismaService.dsBot.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        isActive: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  }

  async findById(id: string): Promise<DsBot> {
    await this.waitUntilBotSyncCompleted(id)

    const dsBot = await this.prismaService.dsBot.findUnique({
      where: {
        id,
      },
    })

    if (!dsBot) throw new NotFoundException('Такой бот не найден')

    return dsBot
  }

  async add(dto: CreateDsBotDto): Promise<boolean> {
    const { secretTokenBot } = dto
    const encryptedToken = this.tokenCrypto.encrypt(secretTokenBot)

    const dsBot = await this.prismaService.dsBot.findFirst({
      where: {
        secretTokenBot: encryptedToken,
      },
    })

    if (dsBot) throw new ConflictException('Данный бот уже добавлен')

    const newDsBot = await this.prismaService.dsBot.create({
      data: {
        secretTokenBot: encryptedToken,
      },
    })

    await this.dsBotManager.startBot(newDsBot.id, newDsBot.secretTokenBot)

    return true
  }

  async delete(id: string): Promise<boolean> {
    const dsBot = await this.findById(id)

    await this.dsBotManager.stopBot(dsBot.id)

    await this.prismaService.dsBot.delete({
      where: {
        id,
      },
    })

    return true
  }

  private async waitUntilAllSyncCompleted(): Promise<void> {
    await this.waitWithTimeout(async () => {
      const loadingCount = await this.prismaService.dsBot.count({
        where: {
          isLoadingSync: true,
        },
      })

      return loadingCount === 0
    }, 'Ожидание завершения синхронизации ботов превысило лимит времени')
  }

  private async waitUntilBotSyncCompleted(id: string): Promise<void> {
    await this.waitWithTimeout(async () => {
      const dsBotState = await this.prismaService.dsBot.findUnique({
        where: {
          id,
        },
        select: {
          isLoadingSync: true,
        },
      })

      return !dsBotState || !dsBotState.isLoadingSync
    }, `Ожидание синхронизации бота (${id}) превысило лимит времени`)
  }

  private async waitWithTimeout(
    condition: () => Promise<boolean>,
    timeoutMessage: string,
  ): Promise<void> {
    const startedAt = Date.now()

    while (true) {
      const isDone = await condition()

      if (isDone) {
        return
      }

      const elapsedMs = Date.now() - startedAt

      if (elapsedMs >= DsBotService.SYNC_WAIT_TIMEOUT_MS) {
        throw new RequestTimeoutException(timeoutMessage)
      }

      await this.sleep(DsBotService.SYNC_WAIT_INTERVAL_MS)
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
