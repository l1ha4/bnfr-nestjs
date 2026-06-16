import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common'
import type { Request } from 'express'
import { PrismaService } from '@/core/prisma/prisma.service'
import { CreateSessionDto } from '../../../api/dto/create-session.dto'
import { MonopolyWebsocketGateway } from '../../../websocket/monopoly-websocket.gateway'
import { ConnectionPlayerManager } from '../connection/connectionPlayer/connection-player.manager'

@Injectable()
export class CreateSessionManager {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly monopolyGateway: MonopolyWebsocketGateway,
    private readonly connectionPlayerManager: ConnectionPlayerManager,
  ) {}

  public async createSession(createSessionDto: CreateSessionDto, req: Request) {
    const userId = req.session.userId

    const userSessionsCount = await this.prisma.monopolyGameSessionPlayer.count(
      {
        where: { userId },
      },
    )

    if (userSessionsCount >= 1) {
      throw new ConflictException('Пользователь уже участвует в сессии')
    }

    const template = await this.prisma.monopolyGameTemplate.findUniqueOrThrow({
      where: { id: createSessionDto.templateId },
      select: {
        minPlayers: true,
        maxPlayers: true,
      },
    })

    const playersCount = createSessionDto.playersCount ?? template.maxPlayers

    if (
      playersCount < template.minPlayers ||
      playersCount > template.maxPlayers
    ) {
      throw new BadRequestException(
        `Количество игроков должно быть в диапазоне ${template.minPlayers}-${template.maxPlayers}`,
      )
    }

    const session = await this.prisma.monopolyGameSession.create({
      data: {
        name: createSessionDto.name,
        playersCount,
        template: {
          connect: { id: createSessionDto.templateId },
        },
        createdById: userId,
      },
    })

    this.monopolyGateway.sendSessionCreated({
      id: session.id,
      name: session.name,
      playersCount: session.playersCount,
      templateId: session.templateId,
    })

    await this.connectionPlayerManager.connectToSession(session.id, req)

    return { id: session.id }
  }
}
