import { Module } from '@nestjs/common'
import { AuthAdminController } from './auth-admin.controller'
import { AuthAdminService } from './auth-admin.service'
import { AuthModule } from '../../auth/auth.module'
import { UserModule } from '@/app/user/user.module';

@Module({
  imports: [AuthModule, UserModule],
  controllers: [AuthAdminController],
  providers: [AuthAdminService],
  exports: [AuthAdminService],
})
export class AuthAdminModule {}
