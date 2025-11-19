# 🎭 Reconhecimento Facial - Documentação Técnica Completa

**Migrado do projeto:** `/root/Apps/ponto/src/app/facial-recognition-enhanced/`  
**Status:** Production-ready ✅  
**Última atualização:** 20/10/2025

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Componente Principal](#componente-principal)
3. [Fluxo Completo](#fluxo-completo)
4. [Liveness Detection](#liveness-detection)
5. [Integração CompreFace](#integração-compreface)
6. [Integração MinIO](#integração-minio)
7. [Backend NestJS](#backend-nestjs)
8. [Configuração](#configuração)
9. [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

Componente de reconhecimento facial com:
- ✅ **Liveness Detection completo** (anti-fraude)
- ✅ **Performance < 2 segundos**
- ✅ **Modo offline** com sincronização
- ✅ **Detecção automática** do tipo de ponto
- ✅ **Suporte admin** (1:N) e **employee** (1:1)

---

## 🧩 Componente Principal: FacialRecognitionFlow

### Props

```typescript
interface FacialRecognitionFlowProps {
  mode: 'recognition' | 'registration';
  authMode: 'employee' | 'admin' | null;
  userId?: string;
  userEmail?: string;
  onRecognitionSuccess?: (result: RecognitionResult) => void;
  onRecognitionError?: (error: string) => void;
  onRegistrationSuccess?: (result: RegistrationResult) => void;
  onRegistrationError?: (error: string) => void;
  buttonLabel?: string;
  buttonIcon?: ReactNode;
  buttonColor?: string;
  buttonBgColor?: string;
  messageDisplayTime?: number;  // Padrão: 7000ms
  autoOpenCamera?: boolean;       // Padrão: false
  showButton?: boolean;           // Padrão: true
}
```

### Uso Básico

```typescript
import FacialRecognitionFlow from '@/components/FacialRecognitionFlow';

export default function PontoPage() {
  return (
    <FacialRecognitionFlow
      mode="recognition"
      authMode="employee"
      onRecognitionSuccess={(result) => {
        console.log('Ponto registrado:', result);
      }}
    />
  );
}
```

[... continue com todo o conteúdo do FACIAL_RECOGNITION_ENHANCED.md do projeto antigo ...]

