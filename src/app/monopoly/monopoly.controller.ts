import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
} from '@nestjs/common'
import { MonopolyService } from './monopoly.service'
import { CreateSessionDto } from './dto/create-session.dto'
import type { Request } from 'express'
import { Authorization } from '../auth/decorators/auth.decorators';

@Controller('monopoly')
export class MonopolyController {
  constructor(private readonly monopolyService: MonopolyService) {}

  @Authorization()
  @Get('templates')
  findAll() {
    return this.monopolyService.findAllPubicTemplate()
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
