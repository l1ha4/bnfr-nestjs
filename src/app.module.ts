import { AdminModule } from './app/admin/admin-module.module'
import { Module } from '@nestjs/common'

import { ConfigModule } from '@nestjs/config'
import { PrismaModule } from '@/core/prisma/prisma.module'
import { RouterModule } from '@nestjs/core'
import { router } from './core/router/router'
import { IS_DEV_ENV } from './common/utils/is-dev.utils';

@Module({
  imports: [
    ConfigModule.forRoot({
      ignoreEnvFile: !IS_DEV_ENV,
      isGlobal: true,
    }),
    PrismaModule,
    AdminModule,

    RouterModule.register(router),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
