import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator'

export class CreateSessionDto {
  @IsUUID()
  templateId!: string

  @IsString()
  @IsNotEmpty()
  name!: string

  @IsOptional()
  @IsInt()
  @Min(2)
  playersCount?: number
}
