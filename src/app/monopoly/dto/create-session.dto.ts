import { IsNotEmpty, IsString, IsUUID } from 'class-validator'

export class CreateSessionDto {
  @IsUUID()
  templateId!: string

  @IsString()
  @IsNotEmpty()
  name!: string
}
