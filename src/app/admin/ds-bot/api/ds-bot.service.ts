import { PrismaService } from '@/core/prisma/prisma.service'
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { DsBot } from '@prisma/client'
import { CreateDsBotDto } from './dto/createDsBot.dto'
import { DsBotManagerService } from '../manager/ds-bot.manager.service'
import { DsBotTokenCryptoService } from '../manager/crypto/ds-bot-token-crypto.service'
import { DsBotGuildSettingsService } from '../settings/ds-bot-guild-settings.service';
import { UpdateDsBotGuildSettingsDto } from './dto/createDsBotGuildSettings.dto';

@Injectable()
export class DsBotService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly dsBotManager: DsBotManagerService,
    private readonly tokenCrypto: DsBotTokenCryptoService,
    private readonly guildSettings: DsBotGuildSettingsService,
  ) {}

  async findAll() {
    return await this.prismaService.dsBot.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    })
  }

  async findById(id: string): Promise<DsBot> {
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


}
