import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/core/prisma/prisma.service'

@Injectable()
export class ColorManager {
  public constructor(private readonly prisma: PrismaService) {}

  public async getPlayerColors() {
    return this.prisma.monopolyPlayerColor.findMany({
      orderBy: {
        createdAt: 'asc',
      },
      select: {
        id: true,
        name: true,
        hexCode: true,
      },
    })
  }

  public getColorsByIds(colorIds: string[]) {
    return this.prisma.monopolyPlayerColor.findMany({
      where: { id: { in: colorIds } },
      select: {
        id: true,
        hexCode: true,
      },
    })
  }

  public ensureColorExists(colorId: string) {
    return this.prisma.monopolyPlayerColor.findUniqueOrThrow({
      where: { id: colorId },
      select: { id: true },
    })
  }
}
