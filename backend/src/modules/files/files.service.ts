import { Injectable } from '@nestjs/common';
import { MinioService } from '../../common/minio.service';
import { PrismaService } from '../../prisma/prisma.service';
import * as sharp from 'sharp';
import * as path from 'path';

@Injectable()
export class FilesService {
  constructor(
    private readonly minio: MinioService,
    private readonly prisma: PrismaService,
  ) {}

  async exists(bucket: 'employees' | 'time-entries', key: string) {
    return this.minio.exists(key, bucket);
  }

  async getObject(bucket: 'employees' | 'time-entries', key: string) {
    return this.minio.getObject(key, bucket);
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    console.log('[FilesService] uploadAvatar iniciado:', { userId, fileName: file.originalname, size: file.size });
    
    // Buscar usuário e employee
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { employee: true },
    });

    if (!user) {
      console.error('[FilesService] Usuário não encontrado:', userId);
      throw new Error('Usuário não encontrado');
    }

    console.log('[FilesService] Usuário encontrado:', { userId: user.id, companyId: user.companyId });

    // Processar imagem (redimensionar para 200x200)
    const resized = await sharp(file.buffer)
      .resize(200, 200, { fit: 'cover' })
      .jpeg({ quality: 90 })
      .toBuffer();

    console.log('[FilesService] Imagem processada:', { originalSize: file.size, resizedSize: resized.length });

    // Gerar caminho do arquivo
    const ext = path.extname(file.originalname) || '.jpg';
    const userProfilePath = `${this.minio.generateUserProfileBasePath(user.companyId, user.id)}${ext}`;

    console.log('[FilesService] Path gerado:', userProfilePath);

    // Upload para MinIO
    await this.minio.upload(resized, userProfilePath, 'image/jpeg', 'employees');

    console.log('[FilesService] Upload para MinIO concluído');

    // Atualizar avatarUrl no banco
    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: userProfilePath },
    });

    console.log('[FilesService] avatarUrl atualizado no banco:', userProfilePath);

    return {
      success: true,
      message: 'Avatar atualizado com sucesso',
      avatarUrl: userProfilePath,
    };
  }
}
