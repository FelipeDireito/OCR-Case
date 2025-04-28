import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class SendMessageDto {
  @IsUUID()
  @IsNotEmpty()
  conversationId: string;

  @IsString()
  @IsNotEmpty()
  content: string;
}
