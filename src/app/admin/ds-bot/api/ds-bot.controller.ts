import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common'
import { DsBotService } from './ds-bot.service'
import { CreateDsBotDto } from './dto/createDsBot.dto'
import { SetDsBotEnabledDto } from './dto/setDsBotEnabled.dto'

@Controller()
export class DsBotController {
  constructor(private readonly dsBotService: DsBotService) {}

  @Get('all-text-channels/:botId/:guildId')
  allTextChannels(
    @Param('botId') botId: string,
    @Param('guildId') guildId: string,
  ) {
    return this.dsBotService.findAllTextChannelsGuild(botId, guildId)
  }

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

  @Get('enabled/:id')
  getEnabled(@Param('id') id: string) {
    return this.dsBotService.getEnabled(id)
  }

  @Patch('enabled/:id')
  setEnabled(@Param('id') id: string, @Body() dto: SetDsBotEnabledDto) {
    return this.dsBotService.setEnabled(id, dto.isEnabled)
  }

  @Delete('delete/:id')
  delete(@Param('id') id: string) {
    return this.dsBotService.delete(id)
  }
}
