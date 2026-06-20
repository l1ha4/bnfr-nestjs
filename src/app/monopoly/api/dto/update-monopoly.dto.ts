import { PartialType } from '@nestjs/mapped-types';
import { CreateSessionDto } from './create-session.dto';

export class UpdateMonopolyDto extends PartialType(CreateSessionDto) {}
