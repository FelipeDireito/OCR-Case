import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LlmService } from '../llm/llm.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class ConversationsService {
  constructor(
    private prisma: PrismaService,
    private llmService: LlmService,
  ) {}

  async createConversation(userId: string, createConversationDto: CreateConversationDto) {
    const { documentId } = createConversationDto;

    // Check if the document exists and belongs to the user
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (document.userId !== userId) {
      throw new NotFoundException('Document not found');
    }

    // Create a new conversation
    const conversation = await this.prisma.conversation.create({
      data: {
        userId,
        documentId,
      },
      include: {
        document: {
          select: {
            fileName: true,
            fileType: true,
            fileSize: true,
          },
        },
        messages: true,
      },
    });

    return conversation;
  }

  async getConversations(userId: string) {
    return this.prisma.conversation.findMany({
      where: { userId },
      include: {
        document: {
          select: {
            fileName: true,
            fileType: true,
          },
        },
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
          take: 1, // Just get the latest message for preview
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  async getConversation(userId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        document: {
          select: {
            fileName: true,
            fileType: true,
            fileSize: true,
            extractedText: true,
          },
        },
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.userId !== userId) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  async createMessage(userId: string, createMessageDto: CreateMessageDto) {
    const { conversationId, content, role } = createMessageDto;

    // Check if the conversation exists and belongs to the user
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.userId !== userId) {
      throw new NotFoundException('Conversation not found');
    }

    // Create a new message
    const message = await this.prisma.message.create({
      data: {
        conversationId,
        content,
        role,
      },
    });

    // Update the conversation's updatedAt timestamp
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return message;
  }

  async sendMessage(userId: string, sendMessageDto: SendMessageDto) {
    const { conversationId, content } = sendMessageDto;

    // First, create the user message
    const userMessage = await this.createMessage(userId, {
      conversationId,
      content,
      role: 'user',
    });

    // Get the conversation with document and previous messages
    const conversation = await this.getConversation(userId, conversationId);

    if (!conversation.document.extractedText) {
      throw new BadRequestException('Document has no extracted text. Please process the document with OCR first.');
    }

    // Format previous messages for the LLM API
    const previousMessages = conversation.messages.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    try {
      // Generate a response using the LLM service
      const responseContent = await this.llmService.generateResponse(
        conversation.document.extractedText,
        previousMessages,
      );

      // Create the assistant message with the generated response
      const assistantMessage = await this.createMessage(userId, {
        conversationId,
        content: responseContent,
        role: 'assistant',
      });

      return {
        userMessage,
        assistantMessage,
      };
    } catch (error) {
      // If LLM fails, still return the user message but with an error
      return {
        userMessage,
        error: `Failed to generate response: ${error.message}`,
      };
    }
  }

  async deleteConversation(userId: string, conversationId: string) {
    // Check if the conversation exists and belongs to the user
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.userId !== userId) {
      throw new NotFoundException('Conversation not found');
    }

    // Delete all messages in the conversation
    await this.prisma.message.deleteMany({
      where: { conversationId },
    });

    // Delete the conversation
    await this.prisma.conversation.delete({
      where: { id: conversationId },
    });

    return { success: true };
  }
}
