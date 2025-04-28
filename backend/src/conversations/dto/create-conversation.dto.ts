import { IsNotEmpty, IsUUID } from 'class-validator';

export class CreateConversationDto {
  @IsUUID()
  @IsNotEmpty()
  documentId: string;
}
