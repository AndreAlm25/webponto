import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as FormData from 'form-data';

export interface ComprefaceSubject {
  subject: string;
  similarity: number;
}

export interface ComprefaceRecognitionResult {
  subjects: ComprefaceSubject[];
  box: {
    probability: number;
    x_max: number;
    y_max: number;
    x_min: number;
    y_min: number;
  };
}

@Injectable()
export class ComprefaceService {
  private readonly logger = new Logger(ComprefaceService.name);
  private readonly client: AxiosInstance;
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly threshold: number;
  private readonly detProb: number;

  constructor(private configService: ConfigService) {
    this.apiUrl = this.configService.get<string>('COMPREFACE_API_URL', 'http://localhost:8080');
    this.apiKey = this.configService.get<string>('COMPREFACE_API_KEY', '00000000-0000-0000-0000-000000000002');
    this.threshold = parseFloat(this.configService.get<string>('COMPREFACE_THRESHOLD', '0.9'));
    this.detProb = parseFloat(this.configService.get<string>('COMPREFACE_DET_PROB', '0.2'));

    this.client = axios.create({
      baseURL: this.apiUrl,
      headers: {
        'x-api-key': this.apiKey,
      },
      timeout: 120000, // 2 minutos (primeira carga dos modelos ML demora)
    });

    this.logger.log(`CompreFace configurado: ${this.apiUrl} (threshold: ${this.threshold})`);
  }

  /**
   * Cadastrar face de um funcionário
   */
  async addSubject(imageBuffer: Buffer, subjectId: string): Promise<void> {
    try {
      const formData = new FormData();
      formData.append('file', imageBuffer, {
        filename: 'face.jpg',
        contentType: 'image/jpeg',
      });

      const response = await this.client.post(`/api/v1/recognition/faces`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        params: {
          subject: subjectId,
          det_prob_threshold: this.detProb,
        },
      });

      this.logger.log(`Face cadastrada: ${subjectId}`, response.data);
    } catch (error) {
      this.logger.error(`Erro ao cadastrar face: ${subjectId}`, error.response?.data || error.message);
      
      if (error.response?.status === 400) {
        throw new BadRequestException(
          error.response.data?.message || 'Imagem inválida ou rosto não detectado'
        );
      }
      
      throw error;
    }
  }

  /**
   * Reconhecer face (retorna o funcionário mais similar)
   */
  async recognize(imageBuffer: Buffer): Promise<ComprefaceRecognitionResult> {
    try {
      const formData = new FormData();
      formData.append('file', imageBuffer, {
        filename: 'face.jpg',
        contentType: 'image/jpeg',
      });

      const response = await this.client.post(`/api/v1/recognition/recognize`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        params: {
          limit: 1, // Retornar apenas o mais similar
          det_prob_threshold: this.detProb,
          prediction_count: 1,
        },
      });

      const result = response.data?.result?.[0];

      if (!result) {
        throw new BadRequestException('Nenhum rosto detectado na imagem');
      }

      this.logger.log(`Reconhecimento: ${result.subjects?.length || 0} match(es)`);

      return result;
    } catch (error) {
      this.logger.error(`Erro no reconhecimento facial`, error.response?.data || error.message);
      
      if (error.response?.status === 400) {
        throw new BadRequestException(
          error.response.data?.message || 'Imagem inválida ou rosto não detectado'
        );
      }
      
      throw error;
    }
  }

  /**
   * Verificar se reconhecimento é válido baseado no threshold
   */
  isRecognitionValid(similarity: number): boolean {
    return similarity >= this.threshold;
  }

  /**
   * Deletar face de um funcionário
   */
  async deleteSubject(subjectId: string): Promise<void> {
    try {
      await this.client.delete(`/api/v1/recognition/subjects/${subjectId}`);
      this.logger.log(`Face deletada: ${subjectId}`);
    } catch (error) {
      this.logger.error(`Erro ao deletar face: ${subjectId}`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Deletar todas as faces de um subject
   */
  async deleteAllFaces(subjectId: string): Promise<void> {
    try {
      await this.client.delete(`/api/v1/recognition/faces`, {
        params: {
          subject: subjectId,
        },
      });
      this.logger.log(`Todas as faces deletadas: ${subjectId}`);
    } catch (error) {
      this.logger.error(`Erro ao deletar todas as faces: ${subjectId}`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Listar subjects cadastrados
   */
  async listSubjects(): Promise<string[]> {
    try {
      const response = await this.client.get(`/api/v1/recognition/subjects`);
      return response.data?.subjects || [];
    } catch (error) {
      this.logger.error(`Erro ao listar subjects`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Verificar se subject existe
   */
  async subjectExists(subjectId: string): Promise<boolean> {
    try {
      const subjects = await this.listSubjects();
      return subjects.includes(subjectId);
    } catch (error) {
      this.logger.error(`Erro ao verificar subject: ${subjectId}`, error.message);
      return false;
    }
  }

  /**
   * Detectar face (sem reconhecimento)
   */
  async detect(imageBuffer: Buffer): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('file', imageBuffer, {
        filename: 'face.jpg',
        contentType: 'image/jpeg',
      });

      const response = await this.client.post(`/api/v1/detection/detect`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        params: {
          limit: 1,
          det_prob_threshold: this.detProb,
        },
      });

      return response.data?.result || [];
    } catch (error) {
      this.logger.error(`Erro na detecção facial`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Obter threshold configurado
   */
  getThreshold(): number {
    return this.threshold;
  }

  /**
   * Obter probabilidade de detecção configurada
   */
  getDetProb(): number {
    return this.detProb;
  }
}
