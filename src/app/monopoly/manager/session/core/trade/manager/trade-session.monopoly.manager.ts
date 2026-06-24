import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { randomUUID } from 'crypto'
import { MonopolyMoveType } from '@prisma/client'
import type { Request } from 'express'
import { PrismaService } from '@/core/prisma/prisma.service'
import { MonopolyWebsocketGateway } from '@/app/monopoly/websocket/monopoly-websocket.gateway'
import { PlayerReadyManager } from '../../../connection/playerReady/player-ready.manager'
import { createSystemChatMessage } from '../../chat/create-system-chat-message'
import { CreateTradeOfferDto } from '@/app/monopoly/api/dto/trade/createTradeOffer/create-trade-offer.dto'
import { TradeOfferStoreService } from '../store/trade-offer.store.service'
import type {
  MonopolyTradeOffer,
  MonopolyTradeOfferStreet,
} from '../types/trade-offer.types'

@Injectable()
export class TradeSessionMonopolyManager {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly monopolyGateway: MonopolyWebsocketGateway,
    private readonly playerReadyManager: PlayerReadyManager,
    private readonly tradeOfferStoreService: TradeOfferStoreService,
  ) {}

  public async getIncomingOffers(sessionId: string, req: Request) {
    const currentUserId = req.session.userId

    return this.tradeOfferStoreService.getIncomingPending(
      sessionId,
      currentUserId,
    )
  }

  public async createOffer(
    sessionId: string,
    dto: CreateTradeOfferDto,
    req: Request,
  ): Promise<MonopolyTradeOffer> {
    const fromUserId = req.session.userId
    const giveMoney = Math.max(0, Number(dto.giveMoney ?? 0))
    const getMoney = Math.max(0, Number(dto.getMoney ?? 0))
    const giveStreetCellTemplateIds = Array.from(
      new Set(dto.giveStreetCellTemplateIds ?? []),
    )
    const getStreetCellTemplateIds = Array.from(
      new Set(dto.getStreetCellTemplateIds ?? []),
    )

    if (dto.toUserId === fromUserId) {
      throw new BadRequestException('Нельзя отправить торговлю самому себе')
    }

    if (
      giveMoney === 0 &&
      getMoney === 0 &&
      giveStreetCellTemplateIds.length === 0 &&
      getStreetCellTemplateIds.length === 0
    ) {
      throw new BadRequestException('Предложение торговли пустое')
    }

    const session = await this.playerReadyManager.findSessionById(sessionId)

    if (session.currentMovePlayerId !== fromUserId) {
      throw new BadRequestException(
        'Создавать торговлю можно только в свой ход',
      )
    }

    if (session.currentTypeMove !== MonopolyMoveType.DICE_ROLL_ON_THE_MOVE) {
      throw new BadRequestException('Торговля сейчас недоступна')
    }

    const sessionPlayers = await this.prisma.monopolyGameSessionPlayer.findMany(
      {
        where: {
          sessionId,
        },
        select: {
          id: true,
          userId: true,
          money: true,
        },
      },
    )

    const users = await this.prisma.user.findMany({
      where: {
        id: {
          in: sessionPlayers.map((player) => player.userId),
        },
      },
      select: {
        id: true,
        displayName: true,
      },
    })

    const userNameById = new Map(
      users.map((user) => [user.id, user.displayName]),
    )

    const fromPlayer = sessionPlayers.find(
      (player) => player.userId === fromUserId,
    )
    const toPlayer = sessionPlayers.find(
      (player) => player.userId === dto.toUserId,
    )

    if (!fromPlayer || !toPlayer) {
      throw new NotFoundException('Один из игроков торговли не найден')
    }

    if (fromPlayer.money < giveMoney) {
      throw new BadRequestException(
        'Недостаточно денег для предложения торговли',
      )
    }

    if (toPlayer.money < getMoney) {
      throw new BadRequestException('У выбранного игрока недостаточно денег')
    }

    const allStreetIds = Array.from(
      new Set([...giveStreetCellTemplateIds, ...getStreetCellTemplateIds]),
    )

    const properties = allStreetIds.length
      ? await this.prisma.monopolyGameSessionProperty.findMany({
          where: {
            sessionId,
            cellTemplateId: {
              in: allStreetIds,
            },
          },
          select: {
            cellTemplateId: true,
            ownerUserId: true,
          },
        })
      : []

    const propertyByCellId = new Map(
      properties.map((property) => [property.cellTemplateId, property]),
    )

    for (const cellTemplateId of giveStreetCellTemplateIds) {
      const property = propertyByCellId.get(cellTemplateId)

      if (!property || property.ownerUserId !== fromUserId) {
        throw new BadRequestException('Вы можете отдавать только свои улицы')
      }
    }

    for (const cellTemplateId of getStreetCellTemplateIds) {
      const property = propertyByCellId.get(cellTemplateId)

      if (!property || property.ownerUserId !== dto.toUserId) {
        throw new BadRequestException(
          'Можно запросить только улицы выбранного игрока',
        )
      }
    }

    const cellTemplates = allStreetIds.length
      ? await this.prisma.monopolyCellTemplate.findMany({
          where: {
            id: {
              in: allStreetIds,
            },
          },
          select: {
            id: true,
            name: true,
            price: true,
          },
        })
      : []

    const streetById = new Map(
      cellTemplates.map((cellTemplate) => [cellTemplate.id, cellTemplate]),
    )

    const toStreetPreview = (
      cellTemplateId: string,
    ): MonopolyTradeOfferStreet => {
      const street = streetById.get(cellTemplateId)

      return {
        cellTemplateId,
        name: street?.name ?? `Улица ${cellTemplateId.slice(0, 6)}`,
        price: Number(street?.price ?? 0),
      }
    }

    const offer: MonopolyTradeOffer = {
      id: randomUUID(),
      sessionId,
      fromUserId,
      fromPlayerName: userNameById.get(fromUserId) ?? 'Игрок',
      toUserId: dto.toUserId,
      toPlayerName: userNameById.get(dto.toUserId) ?? 'Игрок',
      giveMoney,
      getMoney,
      giveStreets: giveStreetCellTemplateIds.map(toStreetPreview),
      getStreets: getStreetCellTemplateIds.map(toStreetPreview),
      status: 'PENDING',
      createdAt: new Date(),
      decidedAt: null,
    }

    this.tradeOfferStoreService.create(offer)
    this.monopolyGateway.sendTradeOfferCreated(sessionId, offer)

    await createSystemChatMessage({
      prisma: this.prisma,
      monopolyGateway: this.monopolyGateway,
      sessionId,
      userId: null,
      userName: null,
      content: `Игрок ${offer.fromPlayerName} предложил торговлю игроку ${offer.toPlayerName}`,
    })

    return offer
  }

  public async acceptOffer(sessionId: string, offerId: string, req: Request) {
    const currentUserId = req.session.userId
    const offer = this.tradeOfferStoreService.getById(offerId)

    if (!offer || offer.sessionId !== sessionId) {
      throw new NotFoundException('Предложение торговли не найдено')
    }

    if (offer.status !== 'PENDING') {
      throw new BadRequestException('Предложение торговли уже обработано')
    }

    if (offer.toUserId !== currentUserId) {
      throw new BadRequestException('Вы не можете принять это предложение')
    }

    await this.prisma.$transaction(async (tx) => {
      const sessionPlayers = await tx.monopolyGameSessionPlayer.findMany({
        where: {
          sessionId,
          userId: {
            in: [offer.fromUserId, offer.toUserId],
          },
        },
        select: {
          id: true,
          userId: true,
          money: true,
        },
      })

      const fromPlayer = sessionPlayers.find(
        (player) => player.userId === offer.fromUserId,
      )
      const toPlayer = sessionPlayers.find(
        (player) => player.userId === offer.toUserId,
      )

      if (!fromPlayer || !toPlayer) {
        throw new NotFoundException('Один из игроков торговли не найден')
      }

      if (fromPlayer.money < offer.giveMoney) {
        throw new BadRequestException(
          'У отправителя недостаточно денег для обмена',
        )
      }

      if (toPlayer.money < offer.getMoney) {
        throw new BadRequestException(
          'У получателя недостаточно денег для обмена',
        )
      }

      const giveStreetIds = offer.giveStreets.map(
        (street) => street.cellTemplateId,
      )
      const getStreetIds = offer.getStreets.map(
        (street) => street.cellTemplateId,
      )
      const allStreetIds = Array.from(
        new Set([...giveStreetIds, ...getStreetIds]),
      )

      const properties = allStreetIds.length
        ? await tx.monopolyGameSessionProperty.findMany({
            where: {
              sessionId,
              cellTemplateId: {
                in: allStreetIds,
              },
            },
            select: {
              cellTemplateId: true,
              ownerUserId: true,
            },
          })
        : []

      const propertyByCellId = new Map(
        properties.map((property) => [property.cellTemplateId, property]),
      )

      for (const cellTemplateId of giveStreetIds) {
        const property = propertyByCellId.get(cellTemplateId)

        if (!property || property.ownerUserId !== offer.fromUserId) {
          throw new BadRequestException(
            'Одна из улиц отправителя больше ему не принадлежит',
          )
        }
      }

      for (const cellTemplateId of getStreetIds) {
        const property = propertyByCellId.get(cellTemplateId)

        if (!property || property.ownerUserId !== offer.toUserId) {
          throw new BadRequestException(
            'Одна из улиц получателя больше ему не принадлежит',
          )
        }
      }

      await tx.monopolyGameSessionPlayer.update({
        where: { id: fromPlayer.id },
        data: {
          money: fromPlayer.money - offer.giveMoney + offer.getMoney,
        },
      })

      await tx.monopolyGameSessionPlayer.update({
        where: { id: toPlayer.id },
        data: {
          money: toPlayer.money - offer.getMoney + offer.giveMoney,
        },
      })

      if (giveStreetIds.length > 0) {
        await tx.monopolyGameSessionProperty.updateMany({
          where: {
            sessionId,
            cellTemplateId: {
              in: giveStreetIds,
            },
            ownerUserId: offer.fromUserId,
          },
          data: {
            ownerUserId: offer.toUserId,
            sessionPlayerId: toPlayer.id,
          },
        })
      }

      if (getStreetIds.length > 0) {
        await tx.monopolyGameSessionProperty.updateMany({
          where: {
            sessionId,
            cellTemplateId: {
              in: getStreetIds,
            },
            ownerUserId: offer.toUserId,
          },
          data: {
            ownerUserId: offer.fromUserId,
            sessionPlayerId: fromPlayer.id,
          },
        })
      }
    })

    const updatedOffer = this.tradeOfferStoreService.updateStatus(
      offer.id,
      'ACCEPTED',
    )

    if (!updatedOffer) {
      throw new NotFoundException('Предложение торговли не найдено')
    }

    const updatedSession =
      await this.playerReadyManager.findSessionById(sessionId)

    this.monopolyGateway.sendStateUpdated(sessionId, updatedSession)
    this.monopolyGateway.sendTradeOfferUpdated(sessionId, updatedOffer)

    await createSystemChatMessage({
      prisma: this.prisma,
      monopolyGateway: this.monopolyGateway,
      sessionId,
      userId: null,
      userName: null,
      content: `Игрок ${offer.toPlayerName} принял торговлю от игрока ${offer.fromPlayerName}`,
    })

    return updatedSession
  }

  public async rejectOffer(sessionId: string, offerId: string, req: Request) {
    const currentUserId = req.session.userId
    const offer = this.tradeOfferStoreService.getById(offerId)

    if (!offer || offer.sessionId !== sessionId) {
      throw new NotFoundException('Предложение торговли не найдено')
    }

    if (offer.status !== 'PENDING') {
      throw new BadRequestException('Предложение торговли уже обработано')
    }

    if (offer.toUserId !== currentUserId) {
      throw new BadRequestException('Вы не можете отклонить это предложение')
    }

    const updatedOffer = this.tradeOfferStoreService.updateStatus(
      offer.id,
      'REJECTED',
    )

    if (!updatedOffer) {
      throw new NotFoundException('Предложение торговли не найдено')
    }

    this.monopolyGateway.sendTradeOfferUpdated(sessionId, updatedOffer)

    await createSystemChatMessage({
      prisma: this.prisma,
      monopolyGateway: this.monopolyGateway,
      sessionId,
      userId: null,
      userName: null,
      content: `Игрок ${offer.toPlayerName} отклонил торговлю от игрока ${offer.fromPlayerName}`,
    })

    return {
      success: true,
    }
  }

  public clearSessionOffers(sessionId: string) {
    this.tradeOfferStoreService.clearSession(sessionId)
  }
}
