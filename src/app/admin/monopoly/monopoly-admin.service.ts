import { Injectable } from '@nestjs/common'
import type { Request } from 'express'
import { CreateMonopolyFormDto } from './dto/create-monopoly-form.dto'
import { CreateMonopolyPlayerColorDto } from './dto/monopoly-create-player-color.dto'
import { CreateMonopolyFigurineDto } from './dto/monopoly-create-figurine.dto'
import { UpdateMonopolyFigurineDto } from './dto/update-figurine-monopoly.dto'
import { MonopolyPanelSessionManagerService } from './manager/panelSession/monopoly-panel-session.manager.service'
import { MonopolyColorsManagerService } from './manager/colors/monopoly-colors.manager.service'
import { MonopolyFigurinesManagerService } from './manager/figurines/monopoly-figurines.manager.service'
import { MonopolyTemplateCrudManagerService } from './manager/template/monopoly-template.manager.service'

@Injectable()
export class MonopolyAdminService {
  public constructor(
    private readonly panelSessionManager: MonopolyPanelSessionManagerService,
    private readonly colorsManager: MonopolyColorsManagerService,
    private readonly figurinesManager: MonopolyFigurinesManagerService,
    private readonly templateManager: MonopolyTemplateCrudManagerService,
  ) {}

  public async allSessions(): Promise<
    {
      id: string
      name: string
      status: string
      templateName: string
      countPlayers: number
    }[]
  > {
    return this.panelSessionManager.allSessions()
  }

  public async deleteSession(id: string): Promise<boolean> {
    return this.panelSessionManager.deleteSession(id)
  }

  public async resetSession(
    id: string,
    req: Request,
  ): Promise<{ success: boolean }> {
    return this.panelSessionManager.resetSession(id, req)
  }

  public async allPlayerColors(): Promise<
    { id: string; name: string; hexCode: string }[]
  > {
    return this.colorsManager.allPlayerColors()
  }

  public async createPlayerColor(
    dto: CreateMonopolyPlayerColorDto,
  ): Promise<{ id: string }> {
    return this.colorsManager.createPlayerColor(dto)
  }

  public async deletePlayerColor(id: string): Promise<boolean> {
    return this.colorsManager.deletePlayerColor(id)
  }

  public async updateFigurine(
    id: string,
    dto: UpdateMonopolyFigurineDto,
  ): Promise<boolean> {
    return this.figurinesManager.updateFigurine(id, dto)
  }

  public async findFigurineById(id: string): Promise<{
    id: string
    name: string
    url: string
    collectionId?: string | null
  }> {
    return this.figurinesManager.findFigurineById(id)
  }

  public async allFigurines(): Promise<
    { id: string; name: string; url: string; collectionId?: string | null }[]
  > {
    return this.figurinesManager.allFigurines()
  }

  // * Collections

  public async allCollections(): Promise<
    {
      id: string
      name: string
      figurines: { id: string; name: string; url: string }[]
    }[]
  > {
    return this.figurinesManager.allCollections()
  }

  public async findCollectionById(id: string): Promise<{
    id: string
    name: string
    figurines: { id: string; name: string; url: string }[]
  }> {
    return this.figurinesManager.findCollectionById(id)
  }

  public async createCollection(dto: {
    name: string
    figurineIds: string[]
  }): Promise<{ id: string }> {
    return this.figurinesManager.createCollection(dto)
  }

  public async updateCollection(
    id: string,
    dto: { name: string; figurineIds: string[] },
  ): Promise<boolean> {
    return this.figurinesManager.updateCollection(id, dto)
  }

  public async deleteCollection(id: string): Promise<boolean> {
    return this.figurinesManager.deleteCollection(id)
  }

  public async createFigurine(
    dto: CreateMonopolyFigurineDto,
  ): Promise<boolean> {
    return this.figurinesManager.createFigurine(dto)
  }

  public async createForm(dto: CreateMonopolyFormDto): Promise<{ id: string }> {
    return this.templateManager.createForm(dto)
  }

  public async updateForm(
    id: string,
    dto: CreateMonopolyFormDto,
  ): Promise<{ id: string }> {
    return this.templateManager.updateForm(id, dto)
  }

  public async updateFormPublic(
    id: string,
    isPublic: boolean,
  ): Promise<{ id: string }> {
    return this.templateManager.updateFormPublic(id, isPublic)
  }

  public async deleteForm(id: string): Promise<boolean> {
    return this.templateManager.deleteForm(id)
  }

  public async findAllForms(): Promise<{ id: string; name: string }[]> {
    return this.templateManager.findAllForms()
  }

  public async findFormById(id: string) {
    return this.templateManager.findFormById(id)
  }
}
