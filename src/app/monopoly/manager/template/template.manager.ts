import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/core/prisma/prisma.service'

@Injectable()
export class TemplateManager {
  public constructor(private readonly prisma: PrismaService) {}

  public findAllPubicTemplate() {
    return this.prisma.monopolyGameTemplate.findMany({
      where: { isPublic: true },
    })
  }
}
