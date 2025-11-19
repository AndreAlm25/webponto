import { Controller, Get, Post, Param, Res, HttpStatus, NotFoundException, UploadedFile, UseInterceptors, Body, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { FilesService } from './files.service';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get(':bucket/*')
  async getFile(
    @Param('bucket') bucket: 'employees' | 'time-entries',
    @Param() params: any,
    @Res() res: Response,
  ) {
    // Express wildcard param stores the rest of the path in params[0]
    const key: string = params[0];
    const exists = await this.filesService.exists(bucket, key);
    if (!exists) {
      throw new NotFoundException('Arquivo não encontrado');
    }
    const { stream, contentType } = await this.filesService.getObject(bucket, key);
    if (contentType) res.setHeader('Content-Type', contentType);
    res.status(HttpStatus.OK);
    stream.pipe(res);
  }

  @Post('upload/avatar')
  @UseInterceptors(FileInterceptor('photo'))
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @Body('userId') userId: string,
  ) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado');
    }
    if (!userId) {
      throw new BadRequestException('userId é obrigatório');
    }
    
    const result = await this.filesService.uploadAvatar(userId, file);
    return result;
  }
}
