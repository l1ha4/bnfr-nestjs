import { Module } from '@nestjs/common'
import { MonopolyService } from './monopoly.service'
import { MonopolyController } from './monopoly.controller'
import { MonopolySessionsGateway } from './monopoly-sessions.gateway'

@Module({
  controllers: [MonopolyController],
  providers: [MonopolyService, MonopolySessionsGateway],
})
export class MonopolyModule {}
