import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class ProcessOcrDto {
  @IsUUID()
  @IsNotEmpty()
  documentId: string;
  
  @IsString()
  @IsNotEmpty()
  language: string = 'eng'; // Default language is English
}
