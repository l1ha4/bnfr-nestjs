import { PrismaService } from '@/core/prisma/prisma.service'
import { Injectable, NotFoundException } from '@nestjs/common'
import { CreateMonopolyFigurineDto } from '../../dto/monopoly-create-figurine.dto'
import { UpdateMonopolyFigurineDto } from '../../dto/update-figurine-monopoly.dto'

@Injectable()
export class MonopolyFigurinesManagerService {
  public constructor(private readonly prisma: PrismaService) {}

  public async updateFigurine(
    id: string,
    dto: UpdateMonopolyFigurineDto,
  ): Promise<boolean> {
    const resolvedCollectionId = dto.collectionId
      ? await this.prisma.monopolyFigurineCollection.findUnique({
          where: { id: dto.collectionId },
          select: { id: true },
        })
      : null

    await this.prisma.monopolyFigurine.update({
      where: { id },
      data: {
        name: dto.name,
        url: dto.url,
        collectionId: resolvedCollectionId?.id ?? null,
      },
    })

    return true
  }

  public async findFigurineById(id: string): Promise<{
    id: string
    name: string
    url: string
    collectionId?: string | null
  }> {
    const figurine = await this.prisma.monopolyFigurine.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        url: true,
        collectionId: true,
      },
    })

    if (!figurine) {
      throw new NotFoundException('Фигурка монополии не найдена')
    }

    return figurine
  }

  public async allFigurines(): Promise<
    { id: string; name: string; url: string; collectionId?: string | null }[]
  > {
    return this.prisma.monopolyFigurine.findMany({
      select: {
        id: true,
        name: true,
        url: true,
        collectionId: true,
      },
    })
  }

  public async allCollections(): Promise<
    {
      id: string
      name: string
      figurines: { id: string; name: string; url: string }[]
    }[]
  > {
    return this.prisma.monopolyFigurineCollection.findMany({
      select: {
        id: true,
        name: true,
        figurines: {
          select: { id: true, name: true, url: true },
          take: 4,
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  public async findCollectionById(id: string): Promise<{
    id: string
    name: string
    figurines: { id: string; name: string; url: string }[]
  }> {
    const collection = await this.prisma.monopolyFigurineCollection.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        figurines: {
          select: { id: true, name: true, url: true },
        },
      },
    })

    if (!collection) {
      throw new NotFoundException('Коллекция фигурок не найдена')
    }

    return collection
  }

  public async createCollection(dto: {
    name: string
    figurineIds: string[]
  }): Promise<{ id: string }> {
    const collection = await this.prisma.monopolyFigurineCollection.create({
      data: {
        name: dto.name,
        figurines: {
          connect: dto.figurineIds.map((id) => ({ id })),
        },
      },
      select: { id: true },
    })

    return collection
  }

  public async updateCollection(
    id: string,
    dto: { name: string; figurineIds: string[] },
  ): Promise<boolean> {
    const existing = await this.prisma.monopolyFigurineCollection.findUnique({
      where: { id },
      select: { figurines: { select: { id: true } } },
    })

    if (!existing) {
      throw new NotFoundException('Коллекция фигурок не найдена')
    }

    const disconnectIds = existing.figurines
      .map((f) => f.id)
      .filter((fid) => !dto.figurineIds.includes(fid))

    await this.prisma.monopolyFigurineCollection.update({
      where: { id },
      data: {
        name: dto.name,
        figurines: {
          disconnect: disconnectIds.map((fid) => ({ id: fid })),
          connect: dto.figurineIds.map((fid) => ({ id: fid })),
        },
      },
    })

    return true
  }

  public async deleteCollection(id: string): Promise<boolean> {
    const existing = await this.prisma.monopolyFigurineCollection.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!existing) {
      throw new NotFoundException('Коллекция фигурок не найдена')
    }

    await this.prisma.monopolyFigurineCollection.delete({ where: { id } })

    return true
  }

  public async createFigurine(
    dto: CreateMonopolyFigurineDto,
  ): Promise<boolean> {
    await this.prisma.monopolyFigurine.create({
      data: {
        name: dto.name,
        url: dto.url,
      },
    })

    return true
  }
}
