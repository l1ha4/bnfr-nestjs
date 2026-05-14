import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { ConfigModule } from '@nestjs/config'
import { PrismaModule } from '@/prisma/prisma.module'
import { APP_MODULES } from './app/app.index'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    ...APP_MODULES,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
