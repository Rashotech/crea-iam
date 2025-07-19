import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/http-exception/http-exception.filter';
import { UsersService } from './modules/users/users.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableCors();
  app.setGlobalPrefix("api/v1")
  const configService = app.get(ConfigService);
  const port = configService.get('PORT');
  const seedService = app.get(UsersService);
  await seedService.seedAdminUser();
  await app.listen(port);
}
bootstrap();
