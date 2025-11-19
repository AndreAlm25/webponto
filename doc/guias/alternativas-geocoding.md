# Alternativas para Geocoding no Brasil

## Problema Atual com OpenStreetMap (Nominatim)

O **Nominatim** (geocoder do OpenStreetMap) tem **cobertura limitada** no Brasil:
- ❌ Muitas ruas não estão cadastradas
- ❌ Bairros podem ter coordenadas imprecisas
- ❌ Números de casas geralmente não existem
- ✅ Grandes avenidas e pontos conhecidos funcionam bem

---

## Alternativas OpenSource/Gratuitas

### 1. **Photon** (OpenStreetMap melhorado)
**Link**: https://photon.komoot.io/

**Prós:**
- ✅ 100% OpenSource e gratuito
- ✅ Mesmo banco de dados do Nominatim, mas API mais moderna
- ✅ Suporta autocompletar (digita e sugere)
- ✅ Mais rápido que Nominatim

**Contras:**
- ❌ Mesma cobertura limitada do Brasil (usa OSM)
- ❌ Precisa hospedar próprio servidor para alta performance

**Como usar:**
```typescript
// Substituir URL do Nominatim
const API = 'https://photon.komoot.io/api'
fetch(`${API}/?q=${endereco}&limit=10&lang=pt`)
```

---

### 2. **Pelias** (Geocoder multi-fonte)
**Link**: https://github.com/pelias/pelias

**Prós:**
- ✅ 100% OpenSource
- ✅ Combina várias fontes: OpenStreetMap + OpenAddresses + Geonames
- ✅ Melhor cobertura que Nominatim puro
- ✅ Suporta autocompletar e reverse geocoding

**Contras:**
- ❌ Precisa hospedar próprio servidor (Docker)
- ❌ Requer 50GB+ de espaço para dados do Brasil
- ❌ Setup complexo

**Como usar:**
```bash
# Instalar com Docker
docker-compose up pelias
```

---

### 3. **ViaCEP + Nominatim** (Solução Híbrida - **IMPLEMENTADA**)
**Link**: https://viacep.com.br/

**Prós:**
- ✅ ViaCEP é 100% gratuito e tem TODOS os CEPs brasileiros
- ✅ Nominatim fornece coordenadas (quando possível)
- ✅ Já implementado no WebPonto!
- ✅ Fallback: busca bairro quando rua não existe

**Contras:**
- ❌ Coordenadas podem ser aproximadas (centro do bairro)
- ❌ Não funciona para busca por rua sem CEP

**Status**: **✅ JÁ ESTÁ FUNCIONANDO NO SEU PROJETO**

---

## Alternativas Pagas (Mais Precisas)

### 4. **Google Maps Geocoding API** ⭐ MELHOR COBERTURA
**Link**: https://developers.google.com/maps/documentation/geocoding

**Prós:**
- ✅ Melhor cobertura do Brasil (99% das ruas)
- ✅ Números de casa precisos
- ✅ Autocompletar inteligente
- ✅ API bem documentada
- ✅ $200 grátis/mês (±40.000 requisições)

**Contras:**
- 💰 Pago após limite grátis ($5 por 1000 requisições)
- 🔐 Requer cartão de crédito

**Como usar:**
```typescript
const API = 'https://maps.googleapis.com/maps/api/geocode/json'
fetch(`${API}?address=${endereco}&key=SUA_API_KEY&region=br`)
```

**Custo estimado**: R$0,025 por busca (após limite grátis)

---

### 5. **Mapbox Geocoding API**
**Link**: https://docs.mapbox.com/api/search/geocoding/

**Prós:**
- ✅ Boa cobertura do Brasil
- ✅ 100.000 buscas grátis/mês
- ✅ API moderna (suporta WebSocket)

**Contras:**
- 💰 Pago após limite ($0.50 por 1000 requisições)
- ⚠️ Cobertura inferior ao Google Maps no Brasil

---

### 6. **Here Maps Geocoding API**
**Link**: https://developer.here.com/

**Prós:**
- ✅ 250.000 buscas grátis/mês
- ✅ Cobertura razoável no Brasil

**Contras:**
- 💰 Pago após limite
- ⚠️ Menos popular que Google/Mapbox

---

## Recomendação Final

Para o **WebPonto** (sistema de ponto de funcionários):

### Solução Atual (Gratuita) ✅ MANTER
```
CEP → ViaCEP (dados) + Nominatim (coordenadas)
Rua → Nominatim (limitado)
Bairro → Nominatim (funciona)
```

**Quando usar**: Projeto inicial, baixo volume, orçamento zero.

---

### Solução Ideal (Paga) 🏆 UPGRADE FUTURO
```
Tudo → Google Maps Geocoding API
```

**Custo**: ~R$50/mês (assumindo 2000 buscas/mês)  
**Quando usar**: Produção com clientes pagantes, precisa de precisão total.

---

### Solução Intermediária (Híbrida)
```
CEP → ViaCEP (grátis)
Rua/Número → Google Maps (pago)
Reverse → Nominatim (grátis)
```

**Custo**: ~R$25/mês (reduz uso do Google)  
**Quando usar**: Quer precisão sem gastar muito.

---

## Como Implementar Google Maps (Upgrade Futuro)

### 1. Criar API Key
1. Acesse: https://console.cloud.google.com/
2. Crie projeto "WebPonto"
3. Ative "Geocoding API"
4. Crie API Key
5. Restrinja por domínio/IP

### 2. Adicionar no Backend

**Arquivo**: `/root/Apps/webponto/backend/.env`
```bash
GOOGLE_MAPS_API_KEY=SUA_CHAVE_AQUI
```

**Novo arquivo**: `/root/Apps/webponto/backend/src/geocoding/google-maps.service.ts`
```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleMapsService {
  private apiKey: string;

  constructor(private config: ConfigService) {
    this.apiKey = this.config.get('GOOGLE_MAPS_API_KEY');
  }

  async geocode(address: string) {
    const url = `https://maps.googleapis.com/maps/api/geocode/json`;
    const params = new URLSearchParams({
      address,
      key: this.apiKey,
      region: 'br',
      language: 'pt-BR',
    });

    const response = await fetch(`${url}?${params}`);
    const data = await response.json();

    if (data.status !== 'OK') {
      throw new Error(`Google Maps API error: ${data.status}`);
    }

    return data.results.map((r: any) => ({
      lat: r.geometry.location.lat,
      lon: r.geometry.location.lng,
      display_name: r.formatted_address,
      address: {
        road: r.address_components.find((c: any) => c.types.includes('route'))?.long_name,
        house_number: r.address_components.find((c: any) => c.types.includes('street_number'))?.long_name,
        suburb: r.address_components.find((c: any) => c.types.includes('sublocality'))?.long_name,
        city: r.address_components.find((c: any) => c.types.includes('locality'))?.long_name,
        state: r.address_components.find((c: any) => c.types.includes('administrative_area_level_1'))?.short_name,
        postcode: r.address_components.find((c: any) => c.types.includes('postal_code'))?.long_name,
        country: 'Brasil',
      },
      place_id: r.place_id,
    }));
  }
}
```

**Atualizar**: `/root/Apps/webponto/backend/src/geocoding/geocoding.controller.ts`
```typescript
// Adicionar Google Maps como fallback
if (results.length === 0 && this.config.get('GOOGLE_MAPS_API_KEY')) {
  results = await this.googleMaps.geocode(query.q);
}
```

### 3. Frontend (sem mudanças)
O frontend continua chamando `/api/geocoding/search` normalmente!

---

## Monitoramento de Custos (Google Maps)

```typescript
// Adicionar contador no backend
let monthlyRequests = 0;

@Get('stats')
getStats() {
  const freeTier = 40000;
  const remaining = freeTier - monthlyRequests;
  const cost = monthlyRequests > freeTier 
    ? (monthlyRequests - freeTier) * 0.005 
    : 0;
  
  return {
    requests: monthlyRequests,
    remaining,
    estimatedCost: `R$ ${(cost * 5).toFixed(2)}`, // $1 ≈ R$5
  };
}
```

---

## Conclusão

| Opção | Precisão | Custo | Complexidade |
|-------|----------|-------|--------------|
| **Nominatim + ViaCEP** ⭐ | 60% | R$0 | ✅ Baixa |
| **Photon** | 60% | R$0 | ⚠️ Média |
| **Pelias** | 70% | R$0 + servidor | ❌ Alta |
| **Google Maps** 🏆 | 99% | R$25-100 | ✅ Baixa |
| **Mapbox** | 85% | R$15-50 | ✅ Baixa |

**Recomendação**: 
- **Agora**: Manter Nominatim + ViaCEP (já funciona!)
- **Futuro**: Upgrade para Google Maps quando tiver clientes pagantes
