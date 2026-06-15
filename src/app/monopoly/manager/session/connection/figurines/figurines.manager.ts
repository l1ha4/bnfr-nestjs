import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '@/core/prisma/prisma.service'

@Injectable()
export class FigurinesManager {
  public constructor(private readonly prisma: PrismaService) {}

  public async getFigurineCollections() {
    return this.prisma.monopolyFigurineCollection.findMany({
      orderBy: {
        createdAt: 'asc',
      },
      include: {
        figurines: {
          orderBy: {
            createdAt: 'asc',
          },
          take: 3,
          select: {
            id: true,
            name: true,
            url: true,
          },
        },
      },
    })
  }

  public async getCollectionFigurines(collectionId: string) {
    const collection = await this.prisma.monopolyFigurineCollection.findUnique({
      where: { id: collectionId },
      select: {
        id: true,
      },
    })

    if (!collection) {
      throw new NotFoundException('Коллекция фигурок не найдена')
    }

    return this.prisma.monopolyFigurine.findMany({
      where: {
        collectionId,
      },
      orderBy: {
        createdAt: 'asc',
      },
      select: {
        id: true,
        name: true,
        url: true,
      },
    })
  }

  public getFigurinesByIds(figurineIds: string[]) {
    return this.prisma.monopolyFigurine.findMany({
      where: { id: { in: figurineIds } },
      select: {
        id: true,
        url: true,
      },
    })
  }

  public ensureFigurineExists(figurineId: string) {
    return this.prisma.monopolyFigurine.findUniqueOrThrow({
      where: { id: figurineId },
      select: { id: true },
    })
  }
}