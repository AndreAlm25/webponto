import { Controller, Post, Body, UsePipes, ValidationPipe } from '@nestjs/common';
import { SeedService } from './seed.service';
import { StaticSeedDto } from './dto/static-seed.dto';

@Controller('seed')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Post()
  async seed() {
    return this.seedService.seed();
  }

  @Post('static')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async seedStatic(@Body() dto: StaticSeedDto) {
    return this.seedService.seedWithStatic(dto);
  }
}
