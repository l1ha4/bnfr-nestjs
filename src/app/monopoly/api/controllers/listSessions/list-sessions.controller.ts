import { Controller, Get } from '@nestjs/common'
import { MonopolyService } from '../../monopoly.service'
import { Authorization } from '../../../../auth/decorators/auth.decorators'
import { MONOPOLY_API_PREFIX } from '../../config/monopolyApi.config';

@Controller(MONOPOLY_API_PREFIX)
export class ListSessionsController {
  constructor(private readonly monopolyService: MonopolyService) {}

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
}
