import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { UserRole } from '@prisma/client';
import { Request } from 'express'


@Injectable()
export class AdminRouteGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>()

    const isAdminRoute = request.path.startsWith('/admin')

    if (!isAdminRoute) {
      return true
    }

    const user = request.user

    if (!user) {
      throw new UnauthorizedException('Пользователь не авторизован')
    }

    if (user.role !== UserRole.ADMIN && user.role !== UserRole.OWNER) {
      throw new ForbiddenException('Недостаточно прав')
    }

    return true
  }
}