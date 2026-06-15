import { IsUUID } from 'class-validator'

export class UpdatePlayerReadyDto {
  @IsUUID()
  colorId!: string

  @IsUUID()
  figurineId!: string
}
