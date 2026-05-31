import { PrismaService } from '@/core/prisma/prisma.service'
import { Injectable, NotFoundException } from '@nestjs/common'
import {
  Prisma,
  MonopolyActionType,
  MonopolyCellElementType,
  MonopolyCellPosition,
  MonopolyCellType,
} from '@prisma/client'
import { CreateMonopolyFormDto } from './dto/create-monopoly-form.dto'

type MonopolyFormCellInput = {
  name: string
  position: string
  typeElement: string
  type?: string
  price?: number | null
}

type MonopolyStreetCollectionInput = {
  name: string
  streetIds: string[]
}

type MonopolyCardActionInput = {
  actionType: string
  amount?: number | null
  text?: string | null
}

type MonopolyCardInput = {
  title: string
  description?: string | null
  actions: MonopolyCardActionInput[]
}

type MonopolyEventGroupInput = {
  title: string
  actions: MonopolyCardInput[]
}

@Injectable()
export class MonopolyAdminService {
  public constructor(private readonly prisma: PrismaService) {}

  public async createForm(dto: CreateMonopolyFormDto): Promise<{ id: string }> {
    const created = await this.prisma.monopolyGameTemplate.create({
      data: this.buildTemplateData(dto),
      select: {
        id: true,
      },
    })

    await this.connectStreetCollections(this.prisma, created.id, dto)

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
        data: this.buildTemplateData(dto),
        select: {
          id: true,
        },
      })

      await this.connectStreetCollections(tx, id, dto)

      return updated
    })
  }

  public async deleteForm(id: string): Promise<boolean> {
    await this.ensureFormExists(this.prisma, id)

    await this.prisma.monopolyGameTemplate.delete({
      where: { id },
    })

    return true
  }

  private buildTemplateData(dto: CreateMonopolyFormDto) {
    const field = dto.field as MonopolyFormCellInput[]
    const collectionsStreet =
      dto.collectionsStreet as MonopolyStreetCollectionInput[]
    const events = dto.events as MonopolyEventGroupInput[]

    return {
      name: dto.name,
      description: dto.description,

      fieldWidthCells: dto.fieldWidthCells,
      fieldHeightCells: dto.fieldHeightCells,

      moneyPerLap: dto.moneyPerLap,
      minPlayers: dto.minPlayers,
      maxPlayers: dto.maxPlayers,
      startMoney: dto.startMoney,

      cells: {
        create: field.map((cell, index) => ({
          orderIndex: index,
          name: cell.name,

          position: this.resolveCellPosition(cell.position),
          typeElement: this.resolveCellElementType(cell.typeElement),

          type: this.resolveCellType(cell),
          price: cell.price ?? null,
        })),
      },

      streetCollections: {
        create: collectionsStreet.map((collection) => ({
          name: collection.name,
        })),
      },

      cardGroups: {
        create: events.map((event) => ({
          title: event.title,

          cards: {
            create: event.actions.map((card) => ({
              title: card.title,
              description: card.description,

              actions: {
                create: card.actions.map((action) => ({
                  actionType: this.resolveActionType(action.actionType),
                  amount: action.amount ?? null,
                  text: action.text ?? null,
                })),
              },
            })),
          },
        })),
      },
    }
  }

  private async connectStreetCollections(
    prisma: Prisma.TransactionClient | PrismaService,
    templateId: string,
    dto: CreateMonopolyFormDto,
  ): Promise<void> {
    const collectionsStreet =
      dto.collectionsStreet as MonopolyStreetCollectionInput[]

    const collections = await prisma.monopolyStreetCollectionTemplate.findMany({
      where: { templateId },
      select: {
        id: true,
        name: true,
      },
    })

    for (const collectionDto of collectionsStreet) {
      const collection = collections.find(
        (item) => item.name === collectionDto.name,
      )

      if (!collection) continue

      const cellIndexes = collectionDto.streetIds
        .map((streetId) => this.extractCellIndex(streetId))
        .filter((index): index is number => index !== null)

      await prisma.monopolyCellTemplate.updateMany({
        where: {
          templateId,
          orderIndex: {
            in: cellIndexes,
          },
        },
        data: {
          collectionId: collection.id,
        },
      })
    }
  }

  private extractCellIndex(streetId: string): number | null {
    const match = streetId.match(/^cell-(\d+)$/)

    if (!match) return null

    return Number(match[1])
  }

  private resolveCellPosition(position: string): MonopolyCellPosition {
    switch (position) {
      case 'top':
        return MonopolyCellPosition.TOP
      case 'right':
        return MonopolyCellPosition.RIGHT
      case 'bottom':
        return MonopolyCellPosition.BOTTOM
      case 'left':
        return MonopolyCellPosition.LEFT
      case 'top-left':
        return MonopolyCellPosition.TOP_LEFT
      case 'top-right':
        return MonopolyCellPosition.TOP_RIGHT
      case 'bottom-left':
        return MonopolyCellPosition.BOTTOM_LEFT
      case 'bottom-right':
        return MonopolyCellPosition.BOTTOM_RIGHT
      default:
        throw new Error(`Неизвестная позиция клетки: ${position}`)
    }
  }

  private resolveCellElementType(typeElement: string): MonopolyCellElementType {
    switch (typeElement) {
      case 'cell':
        return MonopolyCellElementType.CELL
      case 'angle':
        return MonopolyCellElementType.ANGLE
      default:
        throw new Error(`Неизвестный тип элемента клетки: ${typeElement}`)
    }
  }

  private resolveCellType(cell: {
    name: string
    type?: string
  }): MonopolyCellType {
    switch (cell.type?.toLowerCase()) {
      case 'street':
        return MonopolyCellType.STREET
      case 'chance':
        return MonopolyCellType.CHANCE
      case 'community':
      case 'community_chest':
        return MonopolyCellType.COMMUNITY
      case 'jail':
        return MonopolyCellType.JAIL
      case 'go_to_jail':
      case 'gotojail':
        return MonopolyCellType.GO_TO_JAIL
      case 'parking':
      case 'free_parking':
        return MonopolyCellType.PARKING
      case 'tax':
        return MonopolyCellType.TAX
      case 'railroad':
        return MonopolyCellType.RAILROAD
      case 'utility':
        return MonopolyCellType.UTILITY
    }

    switch (cell.name.trim().toLowerCase()) {
      case 'старт':
        return MonopolyCellType.START
      case 'тюрьма':
        return MonopolyCellType.JAIL
      case 'парковка':
        return MonopolyCellType.PARKING
      case 'шанс':
        return MonopolyCellType.CHANCE
      case 'общественная казна':
        return MonopolyCellType.COMMUNITY
      case 'вперёд':
      case 'вперед':
        return MonopolyCellType.GO_TO_JAIL
    }

    throw new Error(`Не удалось определить тип клетки монополии: ${cell.name}`)
  }

  private resolveActionType(actionType: string): MonopolyActionType {
    switch (actionType) {
      case 'receiveMoney':
        return MonopolyActionType.RECEIVE_MONEY
      case 'payMoney':
        return MonopolyActionType.PAY_MONEY
      case 'moveToCell':
        return MonopolyActionType.MOVE_TO_CELL
      case 'moveSteps':
        return MonopolyActionType.MOVE_STEPS
      case 'skipTurn':
        return MonopolyActionType.SKIP_TURN
      case 'goToJail':
        return MonopolyActionType.GO_TO_JAIL
      case 'custom':
        return MonopolyActionType.CUSTOM
      default:
        throw new Error(`Неизвестный тип действия карточки: ${actionType}`)
    }
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
