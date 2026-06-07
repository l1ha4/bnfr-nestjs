import { Controller, Get, Post, Body, Delete, Req, Param } from '@nestjs/common'
import { MonopolyService } from './monopoly.service'
import { CreateSessionDto } from './dto/create-session.dto'
import type { Request } from 'express'
import { Authorization } from '../auth/decorators/auth.decorators'

@Controller('monopoly')
export class MonopolyController {
  constructor(private readonly monopolyService: MonopolyService) {}

  @Authorization()
  @Post('session/${sessionId}/add-player')
  connectToSession(@Body('id') id: string, @Req() req: Request) {
    return this.monopolyService.connectToSession(id, req)
  }d

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
