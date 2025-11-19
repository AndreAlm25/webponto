import { Module } from '@nestjs/common';
import { SeedController } from './seed.controller';
import { SeedService } from './seed.service';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../common/minio.service';

@Module({
  controllers: [SeedController],
  providers: [SeedService, PrismaService, MinioService],
})
export class SeedModule {}
