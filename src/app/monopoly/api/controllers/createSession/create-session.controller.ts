import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common'
import { MonopolyService } from '../../monopoly.service'
import { Authorization } from '../../../../auth/decorators/auth.decorators'
import { CreateSessionDto } from '../../dto/create-session.dto'
import type { Request } from 'express'
import { MONOPOLY_API_PREFIX } from '../../config/monopolyApi.config';

@Controller(MONOPOLY_API_PREFIX)
export class CreateSessionController {
  constructor(private readonly monopolyService: MonopolyService) {}

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
}
