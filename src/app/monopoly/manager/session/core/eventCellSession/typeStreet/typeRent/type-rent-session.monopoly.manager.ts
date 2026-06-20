import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import {
  MonopolyCellType,
  MonopolyGameSessionStatus,
  MonopolyMoveType,
} from '@prisma/client'
import { PrismaService } from '@/core/prisma/prisma.service'
import { MonopolyWebsocketGateway } from '../../../../../../websocket/monopoly-websocket.gateway'
import { createSystemChatMessage } from '../../../chat/create-system-chat-message'
import { changeTurnToNextPlayer } from '../../../changeTurn/change-turn-to-next-player'

type TypeRentSessionCell = {
  id: string
  name: string
  price: number | null
}

type TypeRentSessionSnapshot = {
  id: string
  status: MonopolyGameSessionStatus
  currentMovePlayerId: string | null
  currentTypeMove: MonopolyMoveType
}

type TypeRentPaymentSessionCell = {
  id: string
  name: string
  orderIndex: number
  type: MonopolyCellType | null
  price: number | null
}

type TypeRentPaymentSessionSnapshot = TypeRentSessionSnapshot & {
  template: {
    cells: TypeRentPaymentSessionCell[]
  }
}

type TypeRentSessionParams<TSession extends TypeRentSessionSnapshot> = {
  sessionId: string
  session: TSession
  landedCell: TypeRentSessionCell
  ownerUserId: string
  prisma: PrismaService
  monopolyGateway: MonopolyWebsocketGateway
  fetchSessionSnapshot: (id: string) => Promise<TSession>
}

@Injectable()
export class TypeRentSessionMonopolyManager {
  public async expectRentPayment<TSession extends TypeRentSessionSnapshot>({
    sessionId,
    session,
    landedCell,
    ownerUserId,
    prisma,
    monopolyGateway,
    fetchSessionSnapshot,
  }: TypeRentSessionParams<TSession>) {
    if (!session.currentMovePlayerId) {
      throw new BadRequestException('Текущий игрок не определен')
    }

    const tenantUser = await prisma.user.findUnique({
      where: {
        id: session.currentMovePlayerId,
      },
      select: {
        id: true,
        displayName: true,
      },
    })

    if (!tenantUser) {
      throw new NotFoundException('Игрок-арендатор не найден')
    }

    const ownerUser = await prisma.user.findUnique({
      where: {
        id: ownerUserId,
      },
      select: {
        id: true,
        displayName: true,
      },
    })

    if (!ownerUser) {
      throw new NotFoundException('Игрок-владелец не найден')
    }

    const rentAmount = landedCell.price ?? 0

    await prisma.monopolyGameSession.update({
      where: {
        id: sessionId,
      },
      data: {
        currentTypeMove: MonopolyMoveType.EXPECTED_RENT_PAYMENT_RESPONSE,
      },
    })

    const tenantName = tenantUser.displayName ?? 'Игрок'
    const ownerName = ownerUser.displayName ?? 'Игрок'

    await createSystemChatMessage({
      prisma,
      monopolyGateway,
      sessionId,
      userId: tenantUser.id,
      userName: tenantName,
      content: `Игрок ${tenantName} попал на улицу ${landedCell.name}, владельцем которой является ${ownerName}. Ожидается ответ на оплату аренды ${rentAmount}`,
    })

    const updatedSession = await fetchSessionSnapshot(sessionId)

    monopolyGateway.sendStateUpdated(sessionId, updatedSession)

    return updatedSession
  }

  public async payRent<TSession extends TypeRentPaymentSessionSnapshot>({
    sessionId,
    session,
    prisma,
    monopolyGateway,
    fetchSessionSnapshot,
  }: {
    sessionId: string
    session: TSession
    prisma: PrismaService
    monopolyGateway: MonopolyWebsocketGateway
    fetchSessionSnapshot: (id: string) => Promise<TSession>
  }) {
    if (!session.currentMovePlayerId) {
      throw new BadRequestException('Текущий игрок не определен')
    }

    const tenantPlayer = await prisma.monopolyGameSessionPlayer.findUnique({
      where: {
        sessionId_userId: {
          sessionId,
          userId: session.currentMovePlayerId,
        },
      },
      select: {
        id: true,
        userId: true,
        money: true,
        position: true,
      },
    })

    if (!tenantPlayer) {
      throw new NotFoundException('Игрок-арендатор в сессии не найден')
    }

    const landedCell =
      session.template.cells.find(
        (cell) => cell.orderIndex === tenantPlayer.position,
      ) ?? null

    if (!landedCell || landedCell.type !== MonopolyCellType.STREET) {
      throw new BadRequestException('Оплата аренды недоступна на этой клетке')
    }

    const streetProperty = await prisma.monopolyGameSessionProperty.findFirst({
      where: {
        sessionId,
        cellTemplateId: landedCell.id,
      },
      select: {
        ownerUserId: true,
      },
    })

    if (!streetProperty?.ownerUserId) {
      throw new BadRequestException('Улица не имеет владельца')
    }

    if (streetProperty.ownerUserId === tenantPlayer.userId) {
      throw new BadRequestException('Нельзя платить аренду самому себе')
    }

    const ownerPlayer = await prisma.monopolyGameSessionPlayer.findUnique({
      where: {
        sessionId_userId: {
          sessionId,
          userId: streetProperty.ownerUserId,
        },
      },
      select: {
        id: true,
        userId: true,
        money: true,
      },
    })

    if (!ownerPlayer) {
      throw new NotFoundException('Игрок-владелец в сессии не найден')
    }

    const rentAmount = landedCell.price ?? 0

    if (tenantPlayer.money < rentAmount) {
      throw new ConflictException('Недостаточно денег для оплаты аренды')
    }

    await prisma.$transaction(async (tx) => {
      await tx.monopolyGameSessionPlayer.update({
        where: {
          id: tenantPlayer.id,
        },
        data: {
          money: tenantPlayer.money - rentAmount,
        },
      })

      await tx.monopolyGameSessionPlayer.update({
        where: {
          id: ownerPlayer.id,
        },
        data: {
          money: ownerPlayer.money + rentAmount,
        },
      })
    })

    const [tenantUser, ownerUser] = await Promise.all([
      prisma.user.findUnique({
        where: {
          id: tenantPlayer.userId,
        },
        select: {
          displayName: true,
        },
      }),
      prisma.user.findUnique({
        where: {
          id: ownerPlayer.userId,
        },
        select: {
          displayName: true,
        },
      }),
    ])

    const tenantName = tenantUser?.displayName ?? 'Игрок'
    const ownerName = ownerUser?.displayName ?? 'Игрок'

    await createSystemChatMessage({
      prisma,
      monopolyGateway,
      sessionId,
      userId: tenantPlayer.userId,
      userName: tenantName,
      content: `Игрок ${tenantName} оплатил аренду ${rentAmount} игроку ${ownerName} за улицу ${landedCell.name}`,
    })

    await changeTurnToNextPlayer({
      prisma,
      monopolyGateway,
      sessionId,
      currentMovePlayerId: session.currentMovePlayerId,
    })

    const updatedSession = await fetchSessionSnapshot(sessionId)

    monopolyGateway.sendStateUpdated(sessionId, updatedSession)

    return updatedSession
  }
}
