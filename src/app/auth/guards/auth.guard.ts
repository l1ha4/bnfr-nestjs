import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common'
import { UserService } from '@/app/user/user.service'
import { PrismaService } from '@/core/prisma/prisma.service';

@Injectable()
export class AuthGuard implements CanActivate {
  public constructor(private readonly prisma: PrismaService) {}
  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()

    if (typeof request.session.userId === 'undefined') {
      throw new UnauthorizedException(
        'Пользователь не авторизован. Пожалуйста, войдите в систему.',
      )
    }

    const user = await this.prisma.user.findUnique({
      where: { id: request.session.userId },
    })

    request.user = user

    return true
  }
}
