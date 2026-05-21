import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common'
import { DsBotService } from './ds-bot.service'
import { CreateDsBotDto } from './dto/createDsBot.dto'

@Controller()
export class DsBotController {
  constructor(private readonly dsBotService: DsBotService) {}

  @Get('all-guilds/:id')
  allGuilds(@Param('id') id: string) {
    return this.dsBotService.findAllGuilds(id)
  }

  @Get('all')
  all() {
    return this.dsBotService.findAll()
  }

  @Post('add')
  add(@Body() dto: CreateDsBotDto) {
    return this.dsBotService.add(dto)
  }

  @Delete('delete/:id')
  delete(@Param('id') id: string) {
    return this.dsBotService.delete(id)
  }
}
