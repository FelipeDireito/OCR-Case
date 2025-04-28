import { Controller, Get, Post, Body, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post()
  createConversation(@Request() req, @Body() createConversationDto: CreateConversationDto) {
    return this.conversationsService.createConversation(req.user.id, createConversationDto);
  }

  @Get()
  getConversations(@Request() req) {
    return this.conversationsService.getConversations(req.user.id);
  }

  @Get(':id')
  getConversation(@Request() req, @Param('id') id: string) {
    return this.conversationsService.getConversation(req.user.id, id);
  }

  @Post('message')
  sendMessage(@Request() req, @Body() sendMessageDto: SendMessageDto) {
    return this.conversationsService.sendMessage(req.user.id, sendMessageDto);
  }

  @Delete(':id')
  deleteConversation(@Request() req, @Param('id') id: string) {
    return this.conversationsService.deleteConversation(req.user.id, id);
  }
}
