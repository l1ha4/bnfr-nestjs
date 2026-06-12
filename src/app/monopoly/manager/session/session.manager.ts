import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import type { Request } from 'express'
import { PrismaService } from '@/core/prisma/prisma.service'
import { CreateSessionDto } from '../../api/dto/create-session.dto'
import { MonopolyWebsocketGateway } from '../../websocket/monopoly-websocket.gateway'

@Injectable()
export class SessionManager {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly monopolyGateway: MonopolyWebsocketGateway,
  ) {}

  public async findSessionById(id: string) {
    const session = await this.prisma.monopolyGameSession.findUnique({
      where: { id },
      include: {
        template: {
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
          },
        },
        players: {
          orderBy: {
            joinedAt: 'asc',
          },
        },
      },
    })

    if (!session) {
      throw new NotFoundException('Сессия не найдена')
    }

    return session
  }

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
        startMoney: true,
      },
    })

    const session = await this.prisma.monopolyGameSession.create({
      data: {
        name: createSessionDto.name,
        minPlayers: template.minPlayers,
        maxPlayers: template.maxPlayers,
        template: {
          connect: { id: createSessionDto.templateId },
        },
        createdById: req.session.userId,
      },
    })

    await this.prisma.monopolyGameSessionPlayer.create({
      data: {
        userId: req.session.userId,
        sessionId: session.id,
        money: template.startMoney,
      },
    })

    this.monopolyGateway.sendSessionCreated({
      id: session.id,
      name: session.name,
      minPlayers: session.minPlayers,
      maxPlayers: session.maxPlayers,
      templateId: session.templateId,
    })

    return { id: session.id }
  }

  public async deleteSession(id: string) {
    const result = await this.prisma.monopolyGameSession.deleteMany({
      where: { id },
    })

    if (result.count === 0) {
      throw new NotFoundException('Сессия не найдена')
    }

    this.monopolyGateway.sendSessionDeleted(id)

    return true
  }

  public exitSession(id: string, req: Request) {
    return this.prisma.monopolyGameSessionPlayer.deleteMany({
      where: { sessionId: id, userId: req.session.userId },
    })
  }

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

    this.monopolyGateway.sendPlayerJoined(id, player)

    return true
  }
}
