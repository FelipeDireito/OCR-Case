import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  async create(createDocumentDto: CreateDocumentDto, userId: string) {
    return this.prisma.document.create({
      data: {
        ...createDocumentDto,
        userId,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.document.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string, userId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Check if the document belongs to the user
    if (document.userId !== userId) {
      throw new ForbiddenException('Access to this document is forbidden');
    }

    return document;
  }

  async remove(id: string, userId: string) {
    // First check if the document exists and belongs to the user
    await this.findOne(id, userId);

    return this.prisma.document.delete({
      where: { id },
    });
  }
}
