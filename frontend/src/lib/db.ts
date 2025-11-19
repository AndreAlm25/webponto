import Dexie, { Table } from 'dexie';

// Estrutura dos dados offline
export interface PontoOffline {
  id?: number;
  employeeId: number;
  timestamp: string;
  tipo: 'ENTRADA' | 'SAIDA' | 'INICIO_INTERVALO' | 'FIM_INTERVALO';
  foto: string; // base64
  latitude?: number;
  longitude?: number;
  dispositivoId?: string;
  status: 'pendente' | 'sincronizado' | 'erro';
}

export interface FuncionarioLocal {
  id: number;
  nome: string;
  matricula: string;
  fotoUrl?: string;
  faceId?: string;
}

export interface ConfigLocal {
  key: string;
  value: any;
}

export class WebPontoDB extends Dexie {
  pontos!: Table<PontoOffline, number>;
  funcionarios!: Table<FuncionarioLocal, number>;
  config!: Table<ConfigLocal, string>;

  constructor() {
    super('WebPontoDB');
    
    this.version(1).stores({
      pontos: '++id, employeeId, timestamp, status',
      funcionarios: 'id, matricula',
      config: 'key',
    });
  }
}

export const db = new WebPontoDB();
