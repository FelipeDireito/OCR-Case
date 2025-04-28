import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS to allow requests from the frontend
  app.enableCors({
    origin: 'http://localhost:3000', // Frontend runs on port 3000
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
  
  await app.listen(process.env.PORT ?? 5005);
}
bootstrap();
