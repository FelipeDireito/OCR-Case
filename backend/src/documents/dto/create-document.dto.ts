import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class CreateDocumentDto {
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @IsString()
  @IsNotEmpty()
  fileUrl: string;

  @IsString()
  @IsNotEmpty()
  fileType: string;

  @IsNumber()
  @IsNotEmpty()
  fileSize: number;

  @IsString()
  @IsOptional()
  extractedText?: string;
}
