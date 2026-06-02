import { Injectable } from '@nestjs/common'
import { CreateSessionDto } from './dto/create-session.dto'
import { UpdateMonopolyDto } from './dto/update-monopoly.dto'
import { PrismaService } from '@/core/prisma/prisma.service'
import type { Request, Response } from 'express'

@Injectable()
export class MonopolyService {
  public constructor(private readonly prisma: PrismaService) {}

  findAllPubicTemplate() {
    return this.prisma.monopolyGameTemplate.findMany({
      where: { isPublic: true },
    })
  }

  async createSession(createSessionDto: CreateSessionDto, req: Request) {
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

    return true
  }
}
