import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { DocumentsModule } from './documents/documents.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { OcrModule } from './ocr/ocr.module';
import { ConversationsModule } from './conversations/conversations.module';

@Module({
  imports: [
    PrismaModule, 
    AuthModule, 
    DocumentsModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    OcrModule,
    ConversationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
