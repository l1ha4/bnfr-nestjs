import { PrismaService } from '@/core/prisma/prisma.service'
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { CreateMonopolyPlayerColorDto } from '../../dto/monopoly-create-player-color.dto'

@Injectable()
export class MonopolyColorsManagerService {
  public constructor(private readonly prisma: PrismaService) {}

  public async allPlayerColors(): Promise<
    { id: string; name: string; hexCode: string }[]
  > {
    return this.prisma.monopolyPlayerColor.findMany({
      select: {
        id: true,
        name: true,
        hexCode: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  }

  public async createPlayerColor(
    dto: CreateMonopolyPlayerColorDto,
  ): Promise<{ id: string }> {
    const normalizedHexCode = dto.hexCode.toUpperCase()

    const duplicated = await this.prisma.monopolyPlayerColor.findFirst({
      where: {
        OR: [{ name: dto.name }, { hexCode: normalizedHexCode }],
      },
      select: { id: true },
    })

    if (duplicated) {
      throw new BadRequestException(
        'Цвет с таким названием или HEX-кодом уже существует',
      )
    }

    return this.prisma.monopolyPlayerColor.create({
      data: {
        name: dto.name,
        hexCode: normalizedHexCode,
      },
      select: {
        id: true,
      },
    })
  }

  public async deletePlayerColor(id: string): Promise<boolean> {
    const existing = await this.prisma.monopolyPlayerColor.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!existing) {
      throw new NotFoundException('Цвет игрока не найден')
    }

    await this.prisma.monopolyPlayerColor.delete({
      where: { id },
    })

    return true
  }
}
