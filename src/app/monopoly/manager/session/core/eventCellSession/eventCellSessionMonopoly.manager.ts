import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import {
  MonopolyCellType,
  MonopolyGameSessionStatus,
  MonopolyMoveType,
} from '@prisma/client'
import { PrismaService } from '@/core/prisma/prisma.service'
import { MonopolyWebsocketGateway } from '../../../../websocket/monopoly-websocket.gateway'
import { TypePurchaseSessionMonopolyManager } from './typeStreet/typePurchase/type-purchase-session.monopoly.manager'
import { TypeStreetSessionMonopolyManager } from './typeStreet/type-street-session.monopoly.manager'

type EventCellSessionCell = {
  id: string
  orderIndex: number
  type: MonopolyCellType | null
  price: number | null
}

type EventCellSessionSnapshot = {
  id: string
  status: MonopolyGameSessionStatus
  currentMovePlayerId: string | null
  currentTypeMove: MonopolyMoveType
  template: {
    cells: EventCellSessionCell[]
  }
}

type EventCellSessionParams<TSession extends EventCellSessionSnapshot> = {
  sessionId: string
  session: TSession
  landedCell: EventCellSessionCell | null
  prisma: PrismaService
  monopolyGateway: MonopolyWebsocketGateway
  fetchSessionSnapshot: (id: string) => Promise<TSession>
}

@Injectable()
export class EventCellSessionMonopolyManager {
  private readonly logger = new Logger(EventCellSessionMonopolyManager.name)

  public constructor(
    private readonly typeStreetSessionMonopolyManager = new TypeStreetSessionMonopolyManager(),
    private readonly typePurchaseSessionMonopolyManager = new TypePurchaseSessionMonopolyManager(),
  ) {}

  public async handleLandedCell<TSession extends EventCellSessionSnapshot>({
    sessionId,
    session,
    landedCell,
    prisma,
    monopolyGateway,
    fetchSessionSnapshot,
  }: EventCellSessionParams<TSession>) {
    if (
      session.status !== MonopolyGameSessionStatus.ACTIVE ||
      !session.currentMovePlayerId
    ) {
      throw new BadRequestException('Ход сейчас недоступен')
    }

    if (!landedCell) {
      throw new NotFoundException('Клетка для обработки не найдена')
    }

    if (landedCell.type === MonopolyCellType.STREET) {
      return this.typeStreetSessionMonopolyManager.handleStreetCell({
        sessionId,
        session,
        landedCell,
        prisma,
        monopolyGateway,
        fetchSessionSnapshot,
        typePurchaseSessionMonopolyManager:
          this.typePurchaseSessionMonopolyManager,
      })
    }

    this.logger.warn(
      'Сервер не знает, как обработать этот тип клетки[в разработке]',
      {
        sessionId,
        cellId: landedCell.id,
        cellType: landedCell.type,
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
}
