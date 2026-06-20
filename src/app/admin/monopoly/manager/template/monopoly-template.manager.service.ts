import { PrismaService } from '@/core/prisma/prisma.service'
import { Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { CreateMonopolyFormDto } from '../../dto/create-monopoly-form.dto'
import { MonopolyTemplateManagerService } from './monopoly-template.manage'

@Injectable()
export class MonopolyTemplateCrudManagerService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly monopolyTemplateManager: MonopolyTemplateManagerService,
  ) {}

  public async createForm(dto: CreateMonopolyFormDto): Promise<{ id: string }> {
    const created = await this.prisma.monopolyGameTemplate.create({
      data: this.monopolyTemplateManager.buildTemplateData(dto),
      select: {
        id: true,
      },
    })

    await this.monopolyTemplateManager.connectStreetCollections(
      this.prisma,
      created.id,
      dto,
    )

    return created
  }

  public async updateForm(
    id: string,
    dto: CreateMonopolyFormDto,
  ): Promise<{ id: string }> {
    return this.prisma.$transaction(async (tx) => {
      await this.ensureFormExists(tx, id)

      await tx.monopolyCardGroupTemplate.deleteMany({
        where: { templateId: id },
      })

      await tx.monopolyCellTemplate.deleteMany({
        where: { templateId: id },
      })

      await tx.monopolyStreetCollectionTemplate.deleteMany({
        where: { templateId: id },
      })

      const updated = await tx.monopolyGameTemplate.update({
        where: { id },
        data: this.monopolyTemplateManager.buildTemplateData(dto),
        select: {
          id: true,
        },
      })

      await this.monopolyTemplateManager.connectStreetCollections(tx, id, dto)

      return updated
    })
  }

  public async updateFormPublic(
    id: string,
    isPublic: boolean,
  ): Promise<{ id: string }> {
    await this.ensureFormExists(this.prisma, id)

    return this.prisma.monopolyGameTemplate.update({
      where: { id },
      data: { isPublic },
      select: { id: true },
    })
  }

  public async deleteForm(id: string): Promise<boolean> {
    await this.ensureFormExists(this.prisma, id)

    await this.prisma.monopolyGameTemplate.delete({
      where: { id },
    })

    return true
  }

  public async findAllForms(): Promise<{ id: string; name: string }[]> {
    return this.prisma.monopolyGameTemplate.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  }

  public async findFormById(id: string) {
    const form = await this.prisma.monopolyGameTemplate.findUnique({
      where: { id },
      include: {
        cells: {
          include: {
            streetEconomy: true,
          },
          orderBy: {
            orderIndex: 'asc',
          },
        },
        streetCollections: {
          include: {
            cells: {
              orderBy: {
                orderIndex: 'asc',
              },
            },
          },
        },
        cardGroups: {
          include: {
            cards: {
              include: {
                actions: true,
              },
            },
          },
        },
      },
    })

    if (!form) {
      throw new NotFoundException('Форма монополии не найдена')
    }

    return form
  }

  private async ensureFormExists(
    prisma: Prisma.TransactionClient | PrismaService,
    id: string,
  ): Promise<void> {
    const form = await prisma.monopolyGameTemplate.findUnique({
      where: { id },
      select: {
        id: true,
      },
    })

    if (!form) {
      throw new NotFoundException('Форма монополии не найдена')
    }
  }
}
