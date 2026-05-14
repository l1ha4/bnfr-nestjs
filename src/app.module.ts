import { AdminModule } from './app/admin/admin-module.module'
import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { ConfigModule } from '@nestjs/config'
import { PrismaModule } from '@/core/prisma/prisma.module'
import { RouterModule } from '@nestjs/core'
import { router } from './core/router/router'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AdminModule,

    RouterModule.register(router),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
