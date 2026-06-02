import { Module } from '@nestjs/common';
import { MonopolyService } from './monopoly.service';
import { MonopolyController } from './monopoly.controller';

@Module({
  controllers: [MonopolyController],
  providers: [MonopolyService],
})
export class MonopolyModule {}
