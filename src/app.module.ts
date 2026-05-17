import { AdminModule } from './app/admin/admin-module.module'
import { Module } from '@nestjs/common'

import { ConfigModule } from '@nestjs/config'
import { PrismaModule } from '@/core/prisma/prisma.module'
import { APP_GUARD, RouterModule } from '@nestjs/core'
import { router } from './core/router/router'
import { IS_DEV_ENV } from './common/utils/is-dev.utils'
import { AuthModule } from './app/auth/auth.module'
import { UserModule } from './app/user/user.module'
import { AdminRouteGuard } from './app/admin/guards/admin-route.guard'

@Module({
  imports: [
    ConfigModule.forRoot({
      ignoreEnvFile: !IS_DEV_ENV,
      isGlobal: true,
    }),
    PrismaModule,
    AdminModule,
    RouterModule.register(router),
    AuthModule,
    UserModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AdminRouteGuard,
    },
  ],
})
export class AppModule {}
