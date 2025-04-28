import { IsNotEmpty, IsString, IsUUID, IsIn } from 'class-validator';

export class CreateMessageDto {
  @IsUUID()
  @IsNotEmpty()
  conversationId: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsIn(['user', 'assistant'])
  @IsNotEmpty()
  role: 'user' | 'assistant';
}
