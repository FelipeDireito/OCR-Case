import { Module } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { ConversationsController } from './conversations.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { LlmService } from '../llm/llm.service';

@Module({
  imports: [PrismaModule],
  controllers: [ConversationsController],
  providers: [ConversationsService, LlmService],
  exports: [ConversationsService],
})
export class ConversationsModule {}
