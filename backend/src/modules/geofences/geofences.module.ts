import { Module } from '@nestjs/common'
import { GeofencesService } from './geofences.service'
import { GeofencesController } from './geofences.controller'
import { PrismaService } from '../../prisma/prisma.service'

@Module({
  controllers: [GeofencesController],
  providers: [GeofencesService, PrismaService],
  exports: [GeofencesService],
})
export class GeofencesModule {}
