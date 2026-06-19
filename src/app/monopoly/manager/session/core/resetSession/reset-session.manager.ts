import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { MonopolyGameSessionStatus, MonopolyMoveType } from '@prisma/client'
import { PrismaService } from '@/core/prisma/prisma.service'
import { MonopolyWebsocketGateway } from '../../../../websocket/monopoly-websocket.gateway'

@Injectable()
export class ResetSessionManager {
  private readonly logger = new Logger(ResetSessionManager.name)

  public constructor(
    private readonly prisma: PrismaService,
    private readonly monopolyGateway: MonopolyWebsocketGateway,
  ) {}

  public async resetSession(sessionId: string) {
    const session = await this.prisma.monopolyGameSession.findUnique({
      where: { id: sessionId },
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
            id: true,
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
        where: { sessionId },
        data: {
          position: 0,
          money: template.startMoney,
          isBankrupt: false,
        },
      })

      await tx.monopolyGameSessionProperty.deleteMany({
        where: { sessionId },
      })

      await tx.monopolyGameSession.update({
        where: { id: sessionId },
        data: {
          status: MonopolyGameSessionStatus.ACTIVE,
          currentMovePlayerId: firstPlayer?.userId ?? null,
          currentTypeMove: firstPlayer
            ? MonopolyMoveType.DICE_ROLL_ON_THE_MOVE
            : MonopolyMoveType.NULL,
          currentRound: 1,
          startedAt: new Date(),
          finishedAt: null,
        },
      })
    })

    this.logger.log(`Session ${sessionId} has been reset to initial state`)

    this.monopolyGateway.sendStateUpdated(sessionId, {
      id: sessionId,
      reset: true,
    })

    return { success: true }
  }
}
