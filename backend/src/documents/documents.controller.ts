import { Controller, Get, Post, Body, Param, Delete, UseGuards, Request, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          // Create a unique filename with original extension
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          const filename = `${uniqueSuffix}${ext}`;
          callback(null, filename);
        },
      }),
      fileFilter: (req, file, callback) => {
        // Allow only certain file types
        const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff'];
        if (allowedMimeTypes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(new BadRequestException('Unsupported file type'), false);
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max file size
      },
    }),
  )
  async uploadDocument(@UploadedFile() file, @Request() req) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Create directory if it doesn't exist
    if (!fs.existsSync('./uploads')) {
      fs.mkdirSync('./uploads', { recursive: true });
    }

    // Create document record in database
    const createDocumentDto: CreateDocumentDto = {
      fileName: file.originalname,
      fileUrl: file.path,
      fileType: file.mimetype,
      fileSize: file.size,
    };

    return this.documentsService.create(createDocumentDto, req.user.id);
  }

  @Get()
  findAll(@Request() req) {
    return this.documentsService.findAll(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.documentsService.findOne(id, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.documentsService.remove(id, req.user.id);
  }
}
