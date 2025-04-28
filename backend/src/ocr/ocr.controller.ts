import { Controller, Post, Body, UseGuards, Request, Param } from '@nestjs/common';
import { OcrService } from './ocr.service';
import { ProcessOcrDto } from './dto/process-ocr.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('ocr')
@UseGuards(JwtAuthGuard)
export class OcrController {
  constructor(private readonly ocrService: OcrService) {}

  @Post('process')
  async processDocument(@Body() processOcrDto: ProcessOcrDto, @Request() req) {
    return this.ocrService.processDocument(
      processOcrDto.documentId,
      req.user.id,
      processOcrDto.language,
    );
  }

  @Post('process/:id')
  async processDocumentById(@Param('id') id: string, @Request() req) {
    return this.ocrService.processDocument(
      id,
      req.user.id,
      'eng', // Default to English
    );
  }
}
