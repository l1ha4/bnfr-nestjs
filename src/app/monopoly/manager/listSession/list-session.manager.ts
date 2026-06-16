import { Injectable } from '@nestjs/common'
import { MonopolyGameSessionStatus } from '@prisma/client'
import { PrismaService } from '@/core/prisma/prisma.service'

@Injectable()
export class ListSessionManager {
  public constructor(private readonly prisma: PrismaService) {}

  public getListSessions() {
    return this.prisma.monopolyGameSession
      .findMany({
        where: {
          status: MonopolyGameSessionStatus.WAITING,
        },
        select: {
          id: true,
          name: true,
          createdById: true,
          playersCount: true,
          templateId: true,
          template: {
            select: {
              minPlayers: true,
              maxPlayers: true,
            },
          },
          createdAt: true,
          updatedAt: true,
        },
      })
      .then((sessions) =>
        sessions.map(({ template, ...session }) => ({
          ...session,
          minPlayers: template.minPlayers,
          maxPlayers: template.maxPlayers,
        })),
      )
  }
}
