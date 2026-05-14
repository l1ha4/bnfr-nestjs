import { PrismaService } from '@/core/prisma/prisma.service'
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { DsBot } from '@prisma/client'
import { CreateDsBotDto } from './dto/createDsBot.dto'
import { DsBotManagerService } from '../manager/ds-bot.manager.service'

@Injectable()
export class DsBotService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly dsBotManager: DsBotManagerService,
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

    const dsBot = await this.prismaService.dsBot.findFirst({
      where: {
        secretTokenBot,
      },
    })

    if (dsBot) throw new ConflictException('Данный бот уже добавлен')

    const newDsBot = await this.prismaService.dsBot.create({
      data: {
        secretTokenBot,
      },
    })

    await this.dsBotManager.startBot(newDsBot.id, newDsBot.secretTokenBot)

    return true
  }

  async delete(id: string): Promise<boolean> {
    const dsBot = await this.findById(id)

    await this.dsBotManager.stopBot(dsBot.secretTokenBot)

    await this.prismaService.dsBot.delete({
      where: {
        id,
      },
    })

    return true
  }
}
