import { Injectable } from '@nestjs/common'
import {
  Prisma,
  MonopolyActionType,
  MonopolyCellElementType,
  MonopolyCellPosition,
  MonopolyCellType,
  MonopolyStreetRentGrowthMode,
} from '@prisma/client'
import { PrismaService } from '@/core/prisma/prisma.service'
import { CreateMonopolyFormDto } from '@/app/admin/monopoly/dto/create-monopoly-form.dto'

type MonopolyFormCellInput = {
  name: string
  position: string
  typeElement: string
  type?: string
  price?: number | null
  colorOwner?: string
  showPurchasePreview?: boolean
  streetEconomy?: MonopolyStreetEconomyInput
}

type MonopolyStreetEconomyInput = {
  description: string
  purchasePricesByOwnedCount: Array<number | null>
  rentByOwnedCount: Array<number | null>
  baseRentWithoutUpgrades: number | null
  upgrades: Array<{
    name: string
    buyPrice: number | null
    rentAfterUpgrade: number | null
    sellPrice: number | null
  }>
  salePriceWithoutUpgrades: number | null
  salePriceByUpgradeCount: Array<number | null>
  mortgagePrice: number | null
  mortgageBuyoutPrice: number | null
  allowRentWhenMortgaged: boolean
}

type MonopolyStreetCollectionInput = {
  name: string
  streetIds: string[]
  rentGrowthMode?: 'byCollectionSize' | 'byUpgrades' | string
  streetsCount?: number | null
  upgradesEnabled?: boolean | null
  maxUpgradeLevel?: number | null
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
export class MonopolyTemplateManagerService {
  public buildTemplateData(dto: CreateMonopolyFormDto) {
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
          colorOwner: cell.colorOwner ?? null,
          showPurchasePreview: cell.showPurchasePreview ?? false,
          streetEconomy: cell.streetEconomy
            ? {
                create: {
                  description: cell.streetEconomy.description,
                  purchasePricesByOwnedCount:
                    cell.streetEconomy.purchasePricesByOwnedCount,
                  rentByOwnedCount: cell.streetEconomy.rentByOwnedCount,
                  baseRentWithoutUpgrades:
                    cell.streetEconomy.baseRentWithoutUpgrades,
                  upgrades: cell.streetEconomy.upgrades,
                  salePriceWithoutUpgrades:
                    cell.streetEconomy.salePriceWithoutUpgrades,
                  salePriceByUpgradeCount:
                    cell.streetEconomy.salePriceByUpgradeCount,
                  mortgagePrice: cell.streetEconomy.mortgagePrice,
                  mortgageBuyoutPrice: cell.streetEconomy.mortgageBuyoutPrice,
                  allowRentWhenMortgaged:
                    cell.streetEconomy.allowRentWhenMortgaged,
                },
              }
            : undefined,
        })),
      },

      streetCollections: {
        create: collectionsStreet.map((collection) => ({
          name: collection.name,
          rentGrowthMode: this.resolveRentGrowthMode(collection.rentGrowthMode),
          streetsCount: collection.streetsCount ?? null,
          upgradesEnabled: collection.upgradesEnabled ?? null,
          maxUpgradeLevel: collection.maxUpgradeLevel ?? null,
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

  public async connectStreetCollections(
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

  private resolveRentGrowthMode(
    rentGrowthMode?: string,
  ): MonopolyStreetRentGrowthMode {
    switch (rentGrowthMode) {
      case 'byUpgrades':
      case 'BY_UPGRADES':
        return MonopolyStreetRentGrowthMode.BY_UPGRADES
      case 'byCollectionSize':
      case 'BY_COLLECTION_SIZE':
      default:
        return MonopolyStreetRentGrowthMode.BY_COLLECTION_SIZE
    }
  }
}
