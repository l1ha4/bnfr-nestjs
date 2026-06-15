import { Controller, Get, Post, Body, Delete, Req, Param } from '@nestjs/common'
import { MonopolyService } from './monopoly.service'
import { CreateSessionDto } from './dto/create-session.dto'
import { UpdatePlayerReadyDto } from './dto/update-player-ready.dto'
import type { Request } from 'express'
import { Authorization } from '../../auth/decorators/auth.decorators'

@Controller('monopoly')
export class MonopolyController {
  constructor(private readonly monopolyService: MonopolyService) {}

  @Authorization()
  @Post('session/:sessionId/add-player')
  connectToSession(@Param('sessionId') sessionId: string, @Req() req: Request) {
    return this.monopolyService.connectToSession(sessionId, req)
  }

  @Authorization()
  @Post('session/:sessionId/ready')
  readyPlayer(
    @Param('sessionId') sessionId: string,
    @Body() dto: UpdatePlayerReadyDto,
    @Req() req: Request,
  ) {
    return this.monopolyService.readyPlayer(sessionId, dto, req)
  }

  @Authorization()
  @Get('sessions')
  getListSessions() {
    return this.monopolyService.getListSessions()
  }

  @Authorization()
  @Get('templates')
  findAll() {
    return this.monopolyService.findAllPubicTemplate()
  }

  @Authorization()
  @Get('session/:id')
  findSessionById(@Param('id') id: string) {
    return this.monopolyService.findSessionById(id)
  }

  @Authorization()
  @Get('figurine-collections')
  getFigurineCollections() {
    return this.monopolyService.getFigurineCollections()
  }

  @Authorization()
  @Get('figurine-collections/:collectionId/figurines')
  getCollectionFigurines(@Param('collectionId') collectionId: string) {
    return this.monopolyService.getCollectionFigurines(collectionId)
  }

  @Authorization()
  @Get('player-colors')
  getPlayerColors() {
    return this.monopolyService.getPlayerColors()
  }

  @Authorization()
  @Post('create-session')
  createSession(
    @Body() createSessionDto: CreateSessionDto,
    @Req() req: Request,
  ) {
    return this.monopolyService.createSession(createSessionDto, req)
  }

  @Authorization()
  @Delete(':id')
  deleteSession(@Param('id') id: string) {
    return this.monopolyService.deleteSession(id)
  }
}
