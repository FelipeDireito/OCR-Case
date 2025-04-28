import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createWorker } from 'tesseract.js';
import * as fs from 'fs';
import * as path from 'path';
import * as pdfParse from 'pdf-parse';
import * as sharp from 'sharp';

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);

  constructor(private prisma: PrismaService) {
    // Create tessdata directory if it doesn't exist
    const tessDataPath = path.join(process.cwd(), 'tessdata');
    const tessDataCachePath = path.join(process.cwd(), 'tessdata_cache');
    
    if (!fs.existsSync(tessDataPath)) {
      fs.mkdirSync(tessDataPath, { recursive: true });
      this.logger.log(`Created tessdata directory at ${tessDataPath}`);
    }
    
    if (!fs.existsSync(tessDataCachePath)) {
      fs.mkdirSync(tessDataCachePath, { recursive: true });
      this.logger.log(`Created tessdata cache directory at ${tessDataCachePath}`);
    }
  }

  async processDocument(documentId: string, userId: string, language: string = 'eng') {
    // Find the document and check if it belongs to the user
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (document.userId !== userId) {
      throw new NotFoundException('Document not found');
    }

    // Check if the file exists
    const filePath = document.fileUrl;
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Document file not found');
    }

    try {
      let extractedText = '';

      // Process based on file type
      if (document.fileType === 'application/pdf') {
        extractedText = await this.processPdf(filePath, language);
      } else if (['image/jpeg', 'image/png', 'image/tiff'].includes(document.fileType)) {
        extractedText = await this.processImage(filePath, language);
      } else {
        throw new BadRequestException('Unsupported file type for OCR');
      }

      // Update the document with the extracted text
      const updatedDocument = await this.prisma.document.update({
        where: { id: documentId },
        data: { extractedText },
      });

      return updatedDocument;
    } catch (error) {
      this.logger.error('OCR processing error:', error);
      throw new BadRequestException(`Failed to process document: ${error.message}`);
    }
  }

  private async processPdf(filePath: string, language: string): Promise<string> {
    // Read the PDF file
    const dataBuffer = fs.readFileSync(filePath);
    
    try {
      // Parse the PDF
      const pdfData = await pdfParse(dataBuffer);
      
      // If the PDF already has text content, return it
      if (pdfData.text && pdfData.text.trim().length > 0) {
        return pdfData.text;
      }
      
      // If no text content, the PDF is likely scanned - process it with Tesseract
      this.logger.log('PDF appears to be scanned. Converting pages to images for OCR processing...');
      
      // Use pdf2pic for PDF to image conversion - it's more compatible with Docker environments
      const { PDFDocument } = await import('pdf-lib');
      const pdf = await PDFDocument.load(dataBuffer);
      const pageCount = pdf.getPageCount();
      
      // Create temp directory for page images
      const tempDir = path.join(process.cwd(), 'temp', Date.now().toString());
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      let allText = '';
      
      try {
        // For each page, render to PNG using pdf-lib and sharp
        for (let i = 0; i < pageCount; i++) {
          this.logger.log(`Processing page ${i + 1} of ${pageCount}`);
          
          // Extract the page
          const subPdf = await PDFDocument.create();
          const [page] = await subPdf.copyPages(pdf, [i]);
          subPdf.addPage(page);
          
          // Save the single page PDF
          const pagePdfBytes = await subPdf.save();
          const pagePdfPath = path.join(tempDir, `page-${i}.pdf`);
          fs.writeFileSync(pagePdfPath, pagePdfBytes);
          
          // Convert PDF to image using poppler-utils (must be installed in the Docker container)
          const pageImagePath = path.join(tempDir, `page-${i}.png`);
          
          try {
            // Use pdftoppm from poppler-utils via child_process
            const { execSync } = require('child_process');
            execSync(`pdftoppm -png -r 300 -singlefile "${pagePdfPath}" "${path.join(tempDir, `page-${i}`)}"`, {
              stdio: 'pipe',
            });
            
            // Process the image with OCR if the conversion was successful
            if (fs.existsSync(pageImagePath)) {
              const pageText = await this.processImage(pageImagePath, language);
              allText += `\n\n--- Page ${i + 1} ---\n\n${pageText}`;
            } else {
              this.logger.warn(`Failed to convert page ${i + 1} to image`);
            }
          } catch (conversionError) {
            this.logger.error(`Error converting page ${i + 1} to image:`, conversionError);
          }
          
          // Clean up the single page PDF
          if (fs.existsSync(pagePdfPath)) {
            fs.unlinkSync(pagePdfPath);
          }
          
          // Clean up the page image
          if (fs.existsSync(pageImagePath)) {
            fs.unlinkSync(pageImagePath);
          }
        }
        
        // Clean up the temporary directory
        fs.rmdirSync(tempDir, { recursive: true });
        
        return allText.trim() || 'No text could be extracted from the scanned PDF.';
      } catch (conversionError) {
        this.logger.error('PDF to image conversion error:', conversionError);
        
        // Clean up the temporary directory if it exists
        if (fs.existsSync(tempDir)) {
          fs.rmdirSync(tempDir, { recursive: true });
        }
        
        throw new Error('Failed to convert PDF pages to images for OCR processing');
      }
    } catch (error) {
      this.logger.error('PDF processing error:', error);
      throw new Error('Failed to process PDF');
    }
  }

  private async processImage(filePath: string, language: string): Promise<string> {
    try {
      // Optimize the image for OCR
      const optimizedImagePath = await this.optimizeImage(filePath);
      
      // Create a Tesseract worker
      const worker = await createWorker();
      
      // Recognize text directly with the worker
      // Note: In newer versions of Tesseract.js, loadLanguage and initialize are handled internally
      const { data } = await worker.recognize(optimizedImagePath);
      
      // Terminate the worker
      await worker.terminate();
      
      // Clean up the optimized image
      if (optimizedImagePath !== filePath) {
        fs.unlinkSync(optimizedImagePath);
      }
      
      return data.text;
    } catch (error) {
      this.logger.error('Image OCR error:', error);
      throw new Error('Failed to process image with OCR');
    }
  }

  private async optimizeImage(filePath: string): Promise<string> {
    try {
      const optimizedPath = path.join(
        path.dirname(filePath),
        `optimized-${path.basename(filePath)}`,
      );
      
      // Use sharp to optimize the image for OCR
      await sharp(filePath)
        .greyscale() // Convert to grayscale
        .normalize() // Normalize the image
        .sharpen() // Sharpen the image
        .toFile(optimizedPath);
      
      return optimizedPath;
    } catch (error) {
      this.logger.error('Image optimization error:', error);
      // If optimization fails, return the original file path
      return filePath;
    }
  }
}
