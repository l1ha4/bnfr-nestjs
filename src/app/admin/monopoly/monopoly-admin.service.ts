import { PrismaService } from '@/core/prisma/prisma.service'
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import type { Request } from 'express'
import { Prisma } from '@prisma/client'
import { CreateMonopolyFormDto } from './dto/create-monopoly-form.dto'
import { MonopolyTemplateManagerService } from './manager/monopoly-template.manager.service'
import { CreateMonopolyPlayerColorDto } from './dto/monopoly-create-player-color.dto'
import { MonopolyWebsocketGateway } from '@/app/monopoly/websocket/monopoly-websocket.gateway'
import { createSystemChatMessage } from '@/app/monopoly/manager/session/core/chat/create-system-chat-message'

@Injectable()
export class MonopolyAdminService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly monopolyTemplateManager: MonopolyTemplateManagerService,
    private readonly monopolyGateway: MonopolyWebsocketGateway,
  ) {}

  public async allSessions(): Promise<
    {
      id: string
      name: string
      status: string
      templateName: string
      countPlayers: number
    }[]
  > {
    const sessions = await this.prisma.monopolyGameSession.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        playersCount: true,
        template: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    return sessions.map((session) => ({
      id: session.id,
      name: session.name ?? `Сессия ${session.id.slice(0, 8)}`,
      status: session.status,
      templateName: session.template.name,
      countPlayers: session.playersCount,
    }))
  }

  public async deleteSession(id: string): Promise<boolean> {
    const deleted = await this.prisma.monopolyGameSession.deleteMany({
      where: { id },
    })

    if (deleted.count === 0) {
      throw new NotFoundException('Сессия не найдена')
    }

    return true
  }

  public async resetSession(
    id: string,
    req: Request,
  ): Promise<{ success: boolean }> {
    const adminUserId = req.session.userId

    const session = await this.prisma.monopolyGameSession.findUnique({
      where: { id },
      select: {
        id: true,
        templateId: true,
        players: {
          orderBy: [
            {
              orderIndex: 'asc',
            },
            {
              joinedAt: 'asc',
            },
          ],
          select: {
            userId: true,
          },
        },
      },
    })

    if (!session) {
      throw new NotFoundException('Сессия не найдена')
    }

    const firstPlayer = session.players[0]

    const template = await this.prisma.monopolyGameTemplate.findUniqueOrThrow({
      where: { id: session.templateId },
      select: { startMoney: true },
    })

    await this.prisma.$transaction(async (tx) => {
      await tx.monopolyGameSessionPlayer.updateMany({
        where: { sessionId: id },
        data: {
          position: 0,
          money: template.startMoney,
          isBankrupt: false,
        },
      })

      await tx.monopolyGameSessionProperty.deleteMany({
        where: { sessionId: id },
      })

      await tx.monopolyGameSession.update({
        where: { id },
        data: {
          status: 'ACTIVE',
          currentMovePlayerId: firstPlayer?.userId ?? null,
          currentTypeMove: firstPlayer ? 'DICE_ROLL_ON_THE_MOVE' : 'NULL',
          currentRound: 1,
          startedAt: new Date(),
          finishedAt: null,
        },
      })
    })

    const adminUser = await this.prisma.user.findUnique({
      where: {
        id: adminUserId,
      },
      select: {
        displayName: true,
      },
    })

    const adminName = adminUser?.displayName ?? 'Администратор'

    this.monopolyGateway.sendStateUpdated(id, {
      id,
      reset: true,
    })

    await createSystemChatMessage({
      prisma: this.prisma,
      monopolyGateway: this.monopolyGateway,
      sessionId: id,
      userId: null,
      userName: adminName,
      content: `Сессия была сброшена администратором ${adminName}`,
    })

    return { success: true }
  }

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

  public async updateFigurine(
    id: string,
    dto: { name: string; url: string; collectionId?: string },
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

  // * Collections

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

  public async createFigurine(dto: {
    name: string
    url: string
  }): Promise<boolean> {
    await this.prisma.monopolyFigurine.create({
      data: {
        name: dto.name,
        url: dto.url,
      },
    })

    return true
  }

  public async createForm(dto: CreateMonopolyFormDto): Promise<{ id: string }> {
    const created = await this.prisma.monopolyGameTemplate.create({
      data: this.monopolyTemplateManager.buildTemplateData(dto),
      select: {
        id: true,
      },
    })

    await this.monopolyTemplateManager.connectStreetCollections(
      this.prisma,
      created.id,
      dto,
    )

    return created
  }

  public async updateForm(
    id: string,
    dto: CreateMonopolyFormDto,
  ): Promise<{ id: string }> {
    return this.prisma.$transaction(async (tx) => {
      await this.ensureFormExists(tx, id)

      await tx.monopolyCardGroupTemplate.deleteMany({
        where: { templateId: id },
      })

      await tx.monopolyCellTemplate.deleteMany({
        where: { templateId: id },
      })

      await tx.monopolyStreetCollectionTemplate.deleteMany({
        where: { templateId: id },
      })

      const updated = await tx.monopolyGameTemplate.update({
        where: { id },
        data: this.monopolyTemplateManager.buildTemplateData(dto),
        select: {
          id: true,
        },
      })

      await this.monopolyTemplateManager.connectStreetCollections(tx, id, dto)

      return updated
    })
  }

  public async updateFormPublic(
    id: string,
    isPublic: boolean,
  ): Promise<{ id: string }> {
    await this.ensureFormExists(this.prisma, id)

    return this.prisma.monopolyGameTemplate.update({
      where: { id },
      data: { isPublic },
      select: { id: true },
    })
  }

  public async deleteForm(id: string): Promise<boolean> {
    await this.ensureFormExists(this.prisma, id)

    await this.prisma.monopolyGameTemplate.delete({
      where: { id },
    })

    return true
  }

  private async ensureFormExists(
    prisma: Prisma.TransactionClient | PrismaService,
    id: string,
  ): Promise<void> {
    const form = await prisma.monopolyGameTemplate.findUnique({
      where: { id },
      select: {
        id: true,
      },
    })

    if (!form) {
      throw new NotFoundException('Форма монополии не найдена')
    }
  }

  public async findAllForms(): Promise<{ id: string; name: string }[]> {
    return this.prisma.monopolyGameTemplate.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  }

  public async findFormById(id: string) {
    const form = await this.prisma.monopolyGameTemplate.findUnique({
      where: { id },
      include: {
        cells: {
          include: {
            streetEconomy: true,
          },
          orderBy: {
            orderIndex: 'asc',
          },
        },
        streetCollections: {
          include: {
            cells: {
              orderBy: {
                orderIndex: 'asc',
              },
            },
          },
        },
        cardGroups: {
          include: {
            cards: {
              include: {
                actions: true,
              },
            },
          },
        },
      },
    })

    if (!form) {
      throw new NotFoundException('Форма монополии не найдена')
    }

    return form
  }
}
