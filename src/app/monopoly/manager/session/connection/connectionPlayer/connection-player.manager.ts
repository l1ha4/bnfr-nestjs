import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import type { Request } from 'express'
import { PrismaService } from '@/core/prisma/prisma.service'
import { MonopolyWebsocketGateway } from '../../../../websocket/monopoly-websocket.gateway'

@Injectable()
export class ConnectionPlayerManager {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly monopolyGateway: MonopolyWebsocketGateway,
  ) {}

  public async connectToSession(id: string, req: Request) {
    if (!id) {
      throw new BadRequestException('Не передан id сессии')
    }

    const userId = req.session.userId

    const [session, userSessionsCount, sessionPlayersCount] = await Promise.all(
      [
        this.prisma.monopolyGameSession.findUnique({
          where: { id },
          select: {
            id: true,
            maxPlayers: true,
            templateId: true,
          },
        }),
        this.prisma.monopolyGameSessionPlayer.count({
          where: { userId },
        }),
        this.prisma.monopolyGameSessionPlayer.count({
          where: { sessionId: id },
        }),
      ],
    )

    if (!session) {
      throw new NotFoundException('Сессия не найдена')
    }

    const template = await this.prisma.monopolyGameTemplate.findUniqueOrThrow({
      where: { id: session.templateId },
      select: {
        startMoney: true,
      },
    })

    if (userSessionsCount >= 1) {
      throw new ConflictException('Пользователь уже участвует в сессии')
    }

    if (sessionPlayersCount >= session.maxPlayers) {
      throw new ConflictException('Сессия уже полна')
    }

    const player = await this.prisma.monopolyGameSessionPlayer.create({
      data: {
        sessionId: id,
        userId,
        money: template.startMoney,
      },
    })

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        displayName: true,
        picture: true,
      },
    })

    this.monopolyGateway.sendPlayerJoined(id, {
      ...player,
      displayName: user?.displayName ?? 'Игрок',
      picture: user?.picture ?? null,
    })

    return true
  }
}
