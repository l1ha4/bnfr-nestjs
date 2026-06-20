import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common'
import { UserRole } from '@prisma/client'
import { Authorization } from '@/app/auth/decorators/auth.decorators'
import { CreateMonopolyFigurineDto } from '../../dto/monopoly-create-figurine.dto'
import { UpdateMonopolyFigurineDto } from '../../dto/update-figurine-monopoly.dto'
import { MonopolyFigurinesManagerService } from '../../manager/figurines/monopoly-figurines.manager.service'

@Controller()
export class MonopolyAdminFigurinesController {
  public constructor(
    private readonly figurinesManager: MonopolyFigurinesManagerService,
  ) {}

  @Authorization(UserRole.ADMIN, UserRole.OWNER)
  @Get('figurine/:id')
  @HttpCode(HttpStatus.OK)
  public async findByIdFigurine(@Param('id') id: string): Promise<{
    id: string
    name: string
    url: string
    collectionId?: string | null
  }> {
    return this.figurinesManager.findFigurineById(id)
  }

  @Authorization(UserRole.ADMIN, UserRole.OWNER)
  @Get('figurines')
  @HttpCode(HttpStatus.OK)
  public async allFigurines(): Promise<
    { id: string; name: string; url: string; collectionId?: string | null }[]
  > {
    return this.figurinesManager.allFigurines()
  }

  @Authorization(UserRole.ADMIN, UserRole.OWNER)
  @Get('figurine-collections')
  @HttpCode(HttpStatus.OK)
  public async allCollections() {
    return this.figurinesManager.allCollections()
  }

  @Authorization(UserRole.ADMIN, UserRole.OWNER)
  @Get('figurine-collection/:id')
  @HttpCode(HttpStatus.OK)
  public async findCollectionById(@Param('id') id: string) {
    return this.figurinesManager.findCollectionById(id)
  }

  @Authorization(UserRole.ADMIN, UserRole.OWNER)
  @Post('figurine-collection/create')
  @HttpCode(HttpStatus.OK)
  public async createCollection(
    @Body() dto: { name: string; figurineIds: string[] },
  ) {
    return this.figurinesManager.createCollection(dto)
  }

  @Authorization(UserRole.ADMIN, UserRole.OWNER)
  @Patch('figurine-collection/:id')
  @HttpCode(HttpStatus.OK)
  public async updateCollection(
    @Param('id') id: string,
    @Body() dto: { name: string; figurineIds: string[] },
  ) {
    return this.figurinesManager.updateCollection(id, dto)
  }

  @Authorization(UserRole.ADMIN, UserRole.OWNER)
  @Delete('figurine-collection/:id')
  @HttpCode(HttpStatus.OK)
  public async deleteCollection(@Param('id') id: string) {
    return this.figurinesManager.deleteCollection(id)
  }

  @Authorization(UserRole.ADMIN, UserRole.OWNER)
  @Patch('figurine/:id')
  @HttpCode(HttpStatus.OK)
  public async updateFigurine(
    @Param('id') id: string,
    @Body() dto: UpdateMonopolyFigurineDto,
  ): Promise<boolean> {
    return this.figurinesManager.updateFigurine(id, dto)
  }

  @Authorization(UserRole.ADMIN, UserRole.OWNER)
  @Post('figurine/create')
  @HttpCode(HttpStatus.OK)
  public async createFigurine(
    @Body() dto: CreateMonopolyFigurineDto,
  ): Promise<boolean> {
    return this.figurinesManager.createFigurine(dto)
  }
}
