import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { MonopolyGameSessionStatus, MonopolyMoveType } from '@prisma/client'
import { PrismaService } from '@/core/prisma/prisma.service'
import { MonopolyWebsocketGateway } from '../../../../../websocket/monopoly-websocket.gateway'
import { TypePurchaseSessionMonopolyManager } from './typePurchase/type-purchase-session.monopoly.manager'

type TypeStreetSessionCell = {
  id: string
  orderIndex: number
  type: string | null
  price: number | null
}

type TypeStreetSessionSnapshot = {
  id: string
  status: MonopolyGameSessionStatus
  currentMovePlayerId: string | null
  currentTypeMove: MonopolyMoveType
}

type TypeStreetSessionParams<TSession extends TypeStreetSessionSnapshot> = {
  sessionId: string
  session: TSession
  landedCell: TypeStreetSessionCell
  prisma: PrismaService
  monopolyGateway: MonopolyWebsocketGateway
  fetchSessionSnapshot: (id: string) => Promise<TSession>
  typePurchaseSessionMonopolyManager: TypePurchaseSessionMonopolyManager
}

@Injectable()
export class TypeStreetSessionMonopolyManager {
  private readonly logger = new Logger(TypeStreetSessionMonopolyManager.name)

  public constructor(
    private readonly typePurchaseSessionMonopolyManager = new TypePurchaseSessionMonopolyManager(),
  ) {}

  public async handleStreetCell<TSession extends TypeStreetSessionSnapshot>({
    sessionId,
    session,
    landedCell,
    prisma,
    monopolyGateway,
    fetchSessionSnapshot,
    typePurchaseSessionMonopolyManager,
  }: TypeStreetSessionParams<TSession>) {
    if (!session.currentMovePlayerId) {
      throw new BadRequestException('Текущий игрок не определен')
    }

    const streetProperty = await prisma.monopolyGameSessionProperty.findFirst({
      where: {
        sessionId,
        cellTemplateId: landedCell.id,
      },
      select: {
        id: true,
        sessionPlayerId: true,
        ownerUserId: true,
      },
    })

    if (!streetProperty?.sessionPlayerId) {
      await prisma.monopolyGameSession.update({
        where: {
          id: sessionId,
        },
        data: {
          currentTypeMove: MonopolyMoveType.DECISION_TO_BUY_A_STREET,
        },
      })

      const updatedSession = await fetchSessionSnapshot(sessionId)

      monopolyGateway.sendStateUpdated(sessionId, updatedSession)

      return updatedSession
    }

    this.logger.warn(
      'Сервер не знает, как обработать этот тип клетки [в разработке]',
      {
        sessionId,
        cellId: landedCell.id,
        ownerPlayerId: streetProperty.sessionPlayerId,
        ownerUserId: streetProperty.ownerUserId,
      },
    )

    await prisma.monopolyGameSession.update({
      where: {
        id: sessionId,
      },
      data: {
        currentTypeMove: MonopolyMoveType.WAIT,
      },
    })

    const updatedSession = await fetchSessionSnapshot(sessionId)

    monopolyGateway.sendStateUpdated(sessionId, updatedSession)

    return updatedSession
  }

  public async buyStreet<TSession extends TypeStreetSessionSnapshot>({
    sessionId,
    session,
    landedCell,
    prisma,
    monopolyGateway,
    fetchSessionSnapshot,
  }: TypeStreetSessionParams<TSession>) {
    return this.typePurchaseSessionMonopolyManager.buyStreet({
      sessionId,
      session,
      landedCell,
      prisma,
      monopolyGateway,
      fetchSessionSnapshot,
    })
  }
}
