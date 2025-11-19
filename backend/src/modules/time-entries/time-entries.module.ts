import { Module } from '@nestjs/common';
import { TimeEntriesController } from './time-entries.controller';
import { TimeEntriesService } from './time-entries.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ComprefaceService } from '../../common/compreface.service';
import { MinioService } from '../../common/minio.service';
import { ConfigModule } from '@nestjs/config';
import { EventsModule } from '../../events/events.module';

@Module({
  imports: [ConfigModule, EventsModule],
  controllers: [TimeEntriesController],
  providers: [
    TimeEntriesService,
    PrismaService,
    ComprefaceService,
    MinioService,
  ],
  exports: [TimeEntriesService],
})
export class TimeEntriesModule {}
