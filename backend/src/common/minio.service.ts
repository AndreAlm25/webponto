import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

@Injectable()
export class MinioService {
  private readonly logger = new Logger(MinioService.name);
  private client: Minio.Client;
  private readonly bucketTimeEntries: string;
  private readonly bucketEmployees: string;

  constructor(private configService: ConfigService) {
    // Seguindo padrão do documento MINIO-S3-GUIA.md
    const isPublic = !!this.configService.get<string>('S3_PUBLIC_ENDPOINT');
    const endPoint = (isPublic
      ? this.configService.get<string>('S3_PUBLIC_ENDPOINT')
      : this.configService.get<string>('S3_INTERNAL_ENDPOINT')) || 
      this.configService.get<string>('MINIO_ENDPOINT', 'localhost');

    let port: number | undefined = undefined;
    if (isPublic) {
      const publicPort = this.configService.get<string>('S3_PUBLIC_PORT');
      port = publicPort ? parseInt(publicPort, 10) : undefined;
    } else {
      const internalPort = this.configService.get<string>('S3_INTERNAL_PORT') || this.configService.get<string>('MINIO_PORT', '9000');
      port = parseInt(internalPort, 10);
    }

    const useSSL = isPublic
      ? this.configService.get<string>('S3_PUBLIC_USE_SSL') === 'true'
      : this.configService.get<string>('S3_INTERNAL_USE_SSL') === 'true' || this.configService.get<string>('MINIO_USE_SSL') === 'true';

    const accessKey = this.configService.get<string>('S3_ACCESS_KEY') || this.configService.get<string>('MINIO_ACCESS_KEY', 'minioadmin');
    const secretKey = this.configService.get<string>('S3_SECRET_KEY') || this.configService.get<string>('MINIO_SECRET_KEY', 'minioadmin123');

    this.client = new Minio.Client({
      endPoint,
      ...(port ? { port } : {}),
      useSSL,
      accessKey,
      secretKey,
    });

    // Seguindo padrão do documento: usar um único bucket
    const defaultBucket = this.configService.get<string>('S3_BUCKET') || this.configService.get<string>('MINIO_BUCKET', 'webponto');
    this.bucketTimeEntries = defaultBucket;
    this.bucketEmployees = defaultBucket;

    this.logger.log(`MinIO/S3 configurado: ${endPoint}${port ? ':' + port : ''} (SSL: ${useSSL}, Modo: ${isPublic ? 'PUBLIC' : 'INTERNAL'})`);
  }

  /**
   * Obtém stream do objeto e metadados (Content-Type) para servir via HTTP
   */
  async getObject(path: string, bucket: 'time-entries' | 'employees'): Promise<{ stream: any; contentType: string | undefined }>{
    const bucketName = bucket === 'time-entries' ? this.bucketTimeEntries : this.bucketEmployees;
    try {
      const stat: any = await (this.client as any).statObject(bucketName, path);
      const stream = await (this.client as any).getObject(bucketName, path);
      const contentType = stat?.metaData?.['content-type'] || stat?.metaData?.['Content-Type'] || stat?.metaData?.['contenttype'];
      return { stream, contentType };
    } catch (error) {
      this.logger.error(`Erro ao obter objeto: ${bucketName}/${path}`, error);
      throw error;
    }
  }

  /**
   * Lista objetos por prefixo (stream) e retorna chaves
   */
  async listByPrefix(prefix: string, bucket: 'time-entries' | 'employees'): Promise<string[]> {
    const bucketName = bucket === 'time-entries' ? this.bucketTimeEntries : this.bucketEmployees;
    const keys: string[] = [];
    return new Promise<string[]>((resolve, reject) => {
      const stream = this.client.listObjectsV2(bucketName, prefix, true);
      stream.on('data', (obj: any) => {
        if (obj?.name) keys.push(obj.name);
      });
      stream.on('error', (err: any) => reject(err));
      stream.on('end', () => resolve(keys));
    });
  }

  /**
   * Deleta todos os objetos que começam com o prefixo fornecido
   */
  async deleteByPrefix(prefix: string, bucket: 'time-entries' | 'employees'): Promise<number> {
    const keys = await this.listByPrefix(prefix, bucket);
    if (keys.length === 0) return 0;
    const bucketName = bucket === 'time-entries' ? this.bucketTimeEntries : this.bucketEmployees;
    // Remoção em lote
    await this.client.removeObjects(bucketName, keys);
    this.logger.log(`Removidos ${keys.length} arquivos do bucket ${bucketName} com prefixo ${prefix}`);
    return keys.length;
  }

  /**
   * Remove todas as imagens de um funcionário (perfil + pontos)
   * Estrutura: {companyId}/{employeeId}/...
   */
  async deleteEmployeeMedia(companyId: string, employeeId: string): Promise<{ employees: number; timeEntries: number }> {
    const profilePrefix = `${companyId}/${employeeId}/profile`;
    const pointsPrefix = `${companyId}/${employeeId}/`;
    // Profile (bucket employees)
    const removedEmployees = await this.deleteByPrefix(`${companyId}/${employeeId}/`, 'employees');
    // Time entries (bucket time-entries)
    const removedTimeEntries = await this.deleteByPrefix(pointsPrefix, 'time-entries');
    return { employees: removedEmployees, timeEntries: removedTimeEntries };
  }

  /**
   * Remove todas as mídias associadas a uma empresa (prefixo companyId)
   */
  async deleteCompanyMedia(companyId: string): Promise<{ employees: number; timeEntries: number }> {
    const prefix = `${companyId}/`;
    const removedEmployees = await this.deleteByPrefix(prefix, 'employees');
    const removedTimeEntries = await this.deleteByPrefix(prefix, 'time-entries');
    return { employees: removedEmployees, timeEntries: removedTimeEntries };
  }

  /**
   * Garante que os buckets existam
   */
  async ensureBuckets(): Promise<void> {
    await this.ensureBucket(this.bucketTimeEntries);
    await this.ensureBucket(this.bucketEmployees);
  }

  /**
   * Garante que um bucket específico exista
   */
  private async ensureBucket(bucketName: string): Promise<void> {
    try {
      const exists = await this.client.bucketExists(bucketName);
      if (!exists) {
        await this.client.makeBucket(bucketName, 'us-east-1');
        this.logger.log(`Bucket criado: ${bucketName}`);
      }
    } catch (error) {
      this.logger.error(`Erro ao verificar/criar bucket ${bucketName}:`, error);
      throw error;
    }
  }

  /**
   * Upload de arquivo
   */
  async upload(
    buffer: Buffer,
    path: string,
    mimetype: string,
    bucket: 'time-entries' | 'employees' = 'time-entries',
  ): Promise<string> {
    const bucketName = bucket === 'time-entries' ? this.bucketTimeEntries : this.bucketEmployees;

    try {
      await this.ensureBucket(bucketName);

      const metadata = {
        'Content-Type': mimetype,
        'Upload-Date': new Date().toISOString(),
      };

      await this.client.putObject(bucketName, path, buffer, buffer.length, metadata);

      this.logger.log(`Arquivo enviado: ${bucketName}/${path} (${buffer.length} bytes)`);
      return path;
    } catch (error) {
      this.logger.error(`Erro ao fazer upload: ${bucketName}/${path}`, error);
      throw error;
    }
  }

  /**
   * Obtém URL pública assinada (expira)
   */
  async getPresignedUrl(path: string, bucket: 'time-entries' | 'employees', expiresIn: number = 3600): Promise<string> {
    const bucketName = bucket === 'time-entries' ? this.bucketTimeEntries : this.bucketEmployees;

    try {
      const url = await this.client.presignedGetObject(bucketName, path, expiresIn);
      return url;
    } catch (error) {
      this.logger.error(`Erro ao gerar URL assinada: ${bucketName}/${path}`, error);
      throw error;
    }
  }

  /**
   * Deletar arquivo
   */
  async delete(path: string, bucket: 'time-entries' | 'employees'): Promise<void> {
    const bucketName = bucket === 'time-entries' ? this.bucketTimeEntries : this.bucketEmployees;

    try {
      await this.client.removeObject(bucketName, path);
      this.logger.log(`Arquivo deletado: ${bucketName}/${path}`);
    } catch (error) {
      this.logger.error(`Erro ao deletar arquivo: ${bucketName}/${path}`, error);
      throw error;
    }
  }

  /**
   * Verifica se arquivo existe
   */
  async exists(path: string, bucket: 'time-entries' | 'employees'): Promise<boolean> {
    const bucketName = bucket === 'time-entries' ? this.bucketTimeEntries : this.bucketEmployees;

    try {
      await this.client.statObject(bucketName, path);
      return true;
    } catch (error) {
      if (error.code === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Gera path para foto de ponto
   * Formato: {empresaId}/{funcionarioId}/{YYYY-MM}/{timestamp}.jpg
   */
  generateTimeEntryPath(empresaId: string, funcionarioId: string): string {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const timestamp = now.getTime();
    return `${empresaId}/${funcionarioId}/${yearMonth}/${timestamp}.jpg`;
  }

  /**
   * Gera path para foto de perfil do funcionário (LEGADO)
   * Formato: {empresaId}/{funcionarioId}/profile.jpg
   */
  generateProfilePath(empresaId: string, funcionarioId: string): string {
    return `${empresaId}/${funcionarioId}/profile.jpg`;
  }

  /**
   * Gera base path para foto de perfil do usuário
   * Formato: {companyId}/users/{userId}/profile
   * A extensão deve ser adicionada pelo chamador conforme o MIME
   */
  generateUserProfileBasePath(companyId: string, userId: string): string {
    return `${companyId}/users/${userId}/profile`;
  }

  /**
   * Gera base path para logo da empresa
   * Formato: {companyId}/company/logo
   * A extensão deve ser adicionada pelo chamador conforme o MIME
   */
  generateCompanyLogoBasePath(companyId: string): string {
    return `${companyId}/company/logo`;
  }
}
