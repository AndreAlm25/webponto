import { Controller, Get, Query } from '@nestjs/common';

// Controller para proxy de geocoding (evita CORS do Nominatim)
@Controller('geocoding')
export class GeocodingController {
  // Cache em memória para respostas de geocoding
  // Comentário: simples, process-wide, suficiente para reduzir chamadas repetidas
  private geoCache = new Map<string, { data: any; ts: number }>()
  private GEO_TTL_MS = 6 * 60 * 60 * 1000 // 6 horas
  // Helper para retry com backoff exponencial e timeout
  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    maxRetries = 3,
    timeoutMs = 30_000, // 30s timeout
  ): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Tentativa ${attempt}/${maxRetries}:`, url);

        // AbortController para timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        console.log(`✅ Sucesso na tentativa ${attempt}`);
        return response;
      } catch (error) {
        lastError = error as Error;
        console.error(`❌ Falha na tentativa ${attempt}:`, error.message);

        if (attempt < maxRetries) {
          const delayMs = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
          console.log(`⏳ Aguardando ${delayMs}ms antes de tentar novamente...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

    throw lastError || new Error('Falha após todas as tentativas');
  }
  
  @Get('search')
  async search(@Query() query: Record<string, string>) {
    console.log('\n=== GEOCODING SEARCH CHAMADO ===');
    console.log('Query params:', query);

    try {
      // Normaliza o termo de busca 'q' logo no início para usar em todo o fluxo
      const q: string = String(query.q || '').trim();
      // Heurística simples para extrair cidade/UF/bairro do termo
      const partesTopo = q.split(',').map((s) => s.trim());
      const possivelUF = partesTopo.find((p) => /^([A-Za-z]{2})$/.test(p)) || '';
      const possivelCidade = partesTopo.length >= 2 ? partesTopo[partesTopo.length - 2] : '';
      const possivelBairro = partesTopo.find((p) => /bairro|parque|jardim|vila|centro|independencia/i.test(p)) || '';

      // Monta um termo limpo para consultas a serviços que são sensíveis a ruído
      const ruaPrimeiraParte = String(q).split(',')[0]?.trim() || '';
      const cepRemovido = q.replace(/\b\d{5}-?\d{3}\b/g, '').replace(/\s{2,}/g, ' ').trim();
      const cleanQ = [ruaPrimeiraParte, possivelCidade, possivelUF, 'Brasil']
        .filter(Boolean)
        .join(', ')
        .replace(/\s*-\s*/g, ' - ')
        .trim();

      // Heurística: endereço parece rua?
      const looksLikeStreet = /^(rua|av\.|avenida|travessa|estr\.|estrada|rod\.|rodovia|al\.|alameda)\b/i.test(q || '') || /,\s*[^,]+,\s*[^,]+/i.test(q || '');

      const url = new URL('https://nominatim.openstreetmap.org/search');
      Object.keys(query).forEach((key) => {
        url.searchParams.set(key, query[key]);
      });
      // Garante que o 'q' enviado ao Nominatim é o termo normalizado
      if (q) url.searchParams.set('q', looksLikeStreet ? cleanQ : cepRemovido || q);
      console.log('📍 URL:', url.toString());

      // Cache: checa se já temos um resultado recente para esta chave
      const cacheKey = `q:${(cleanQ || q).toLowerCase()}`
      const now = Date.now()
      const cached = this.geoCache.get(cacheKey)
      if (cached && now - cached.ts < this.GEO_TTL_MS) {
        console.log('🟢 GEO CACHE HIT para', cacheKey)
        return cached.data
      } else {
        console.log('🟡 GEO CACHE MISS para', cacheKey)
      }

      const response = await this.fetchWithRetry(url.toString(), {
        headers: {
          Accept: 'application/json',
          'Accept-Language': 'pt-BR',
          'User-Agent': 'WebPonto-Geocoder/1.0 (+https://webponto.app)',
        },
      });

      console.log('✅ Status:', response.status);

      let data: any = [];
      if (response.ok) {
        data = await response.json();
        console.log('📦 Resultados:', Array.isArray(data) ? data.length : 'não é array');
        if (Array.isArray(data) && data.length > 0) return data;
      } else {
        console.error(`❌ Nominatim retornou ${response.status}`);
      }

      // Se Nominatim não trouxe nada e o termo aparenta ser uma rua, tentar primeiro Nominatim estruturado
      if (!Array.isArray(data) && looksLikeStreet) data = [];
      if (looksLikeStreet) {
        const struct = new URL('https://nominatim.openstreetmap.org/search');
        // parâmetros estruturados (rua pode conter número ou não)
        struct.searchParams.set('street', ruaPrimeiraParte);
        if (possivelCidade) struct.searchParams.set('city', possivelCidade);
        if (possivelUF) struct.searchParams.set('state', possivelUF);
        struct.searchParams.set('country', 'Brasil');
        const postal = (q.match(/\b\d{5}-?\d{3}\b/)?.[0] || '').replace(/\D/g, '');
        if (postal) struct.searchParams.set('postalcode', postal);
        struct.searchParams.set('format', 'json');
        struct.searchParams.set('limit', query.limit || '5');
        struct.searchParams.set('addressdetails', '1');
        struct.searchParams.set('accept-language', 'pt-BR');
        console.log('📍 URL (Nominatim structured):', struct.toString());
        const respStruct = await this.fetchWithRetry(struct.toString(), {
          headers: {
            Accept: 'application/json',
            'Accept-Language': 'pt-BR',
            'User-Agent': 'WebPonto-Geocoder/1.0 (+https://webponto.app)',
          },
        });
        if (respStruct.ok) {
          const d = await respStruct.json();
          if (Array.isArray(d) && d.length > 0) {
          this.geoCache.set(cacheKey, { data: d, ts: now })
          return d
        }
        } else {
          console.error(`❌ Nominatim structured retornou ${respStruct.status}`);
        }
      }

      // Se parecer rua e houver possível número no termo, tentar Nominatim estruturado com número (duas variações)
      if (looksLikeStreet) {
        const numberMatch = q.match(/\b(\d{1,6})\b/)
        const num = numberMatch ? numberMatch[1] : ''
        if (num) {
          const variants = [
            `${num} ${ruaPrimeiraParte}`,
            `${ruaPrimeiraParte} ${num}`,
          ]
          for (const streetVariant of variants) {
            const structNum = new URL('https://nominatim.openstreetmap.org/search')
            structNum.searchParams.set('street', streetVariant)
            if (possivelCidade) structNum.searchParams.set('city', possivelCidade)
            if (possivelUF) structNum.searchParams.set('state', possivelUF)
            structNum.searchParams.set('country', 'Brasil')
            structNum.searchParams.set('format', 'json')
            structNum.searchParams.set('limit', query.limit || '5')
            structNum.searchParams.set('addressdetails', '1')
            structNum.searchParams.set('accept-language', 'pt-BR')
            console.log('📍 URL (Nominatim structured + number):', streetVariant)
            const respNum = await this.fetchWithRetry(structNum.toString(), {
              headers: {
                Accept: 'application/json',
                'Accept-Language': 'pt-BR',
                'User-Agent': 'WebPonto-Geocoder/1.0 (+https://webponto.app)',
              },
            })
            if (respNum.ok) {
              const d = await respNum.json()
              if (Array.isArray(d) && d.length > 0) {
                this.geoCache.set(cacheKey, { data: d, ts: now })
                return d
              }
            }
          }
        }
      }

      // Se ainda não, e o termo aparenta ser uma rua, tentar Overpass primeiro (centro da via)
      // Heurística simples: começa com Rua/Av./Avenida/Travessa/Estrada/Rodovia etc. ou contém vírgula com bairro/cidade
      if (looksLikeStreet) {
        const spBBoxEarly = [-46.825, -24.008, -46.365, -23.356];
        const bboxEarlyParts = (query.viewbox || '').split(',').map((v) => parseFloat(v));
        const validBBoxEarly = bboxEarlyParts.length === 4 && bboxEarlyParts.every((n) => Number.isFinite(n)) ? bboxEarlyParts : spBBoxEarly;
        const streetNameEarly = String(q).split(',')[0]?.trim() || '';
        if (streetNameEarly) {
          const [leftE, topE, rightE, bottomE] = validBBoxEarly;
          // Overpass exige bbox em (south,west,north,east) com south<north e west<east
          const southE = Math.min(topE, bottomE);
          const northE = Math.max(topE, bottomE);
          const westE = Math.min(leftE, rightE);
          const eastE = Math.max(leftE, rightE);
          const overpassUrlEarly = 'https://overpass-api.de/api/interpreter';
          const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const sEsc = esc(streetNameEarly);
          const overpassBodyEarly =
            'data=' + encodeURIComponent(
              `[out:json][timeout:25];\n` +
              `(` +
              `way["highway"]["name"~"^${sEsc}$",i](${southE},${westE},${northE},${eastE});` +
              `way["highway"]["name"~"${sEsc}",i](${southE},${westE},${northE},${eastE});` +
              `);\n` +
              `out center 1;`
            );
          console.log('📍 POST (Overpass early):', overpassUrlEarly);
          let overpassRespEarly = await this.fetchWithRetry(overpassUrlEarly, {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            },
            body: overpassBodyEarly,
          });
          if (!overpassRespEarly.ok) {
            // fallback para endpoint alternativo
            const overpassAlt = 'https://overpass.kumi.systems/api/interpreter';
            console.log('📍 POST (Overpass early alt):', overpassAlt);
            overpassRespEarly = await this.fetchWithRetry(overpassAlt, {
              method: 'POST',
              headers: {
                Accept: 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
              },
              body: overpassBodyEarly,
            });
          }
          if (overpassRespEarly.ok) {
            const overDataEarly: any = await overpassRespEarly.json();
            const elementsEarly: any[] = Array.isArray(overDataEarly?.elements) ? overDataEarly.elements : [];
            const bestEarly = elementsEarly
              .filter((el) => el.type === 'way' && el.center && typeof el.center.lat === 'number' && typeof el.center.lon === 'number')
              .sort((a, b) => (b.nodes?.length || 0) - (a.nodes?.length || 0))[0];
            if (bestEarly) {
              const lat = bestEarly.center.lat;
              const lon = bestEarly.center.lon;
              const name = bestEarly.tags?.name || streetNameEarly;
              const display = [name, possivelBairro, possivelCidade, possivelUF, 'Brasil'].filter(Boolean).join(', ');
              const earlyMapped = [{
                lat,
                lon,
                display_name: display,
                address: { road: name, suburb: possivelBairro, city: possivelCidade, state: possivelUF, country: 'Brasil' },
                class: 'highway',
                type: 'street',
              }];
              console.log('📦 Overpass early resultados mapeados:', earlyMapped.length);
              return earlyMapped;
            }
          } else {
            console.error(`❌ Overpass early retornou ${overpassRespEarly.status}`);
          }
        }
      }

      // Photon (desabilitado por padrão). Ative com PHOTON_ENABLE=true no .env do backend
      const photonEnabled = /^true$/i.test(process.env.PHOTON_ENABLE || '')
      let features: any[] = []
      if (photonEnabled) {
        const photonBase = (process.env.PHOTON_URL || 'http://localhost:2322/api').replace(/\/+$/, '');
        const photonUrl = new URL(photonBase);
        photonUrl.searchParams.set('q', cleanQ || q);
        if (query.limit) photonUrl.searchParams.set('limit', query.limit);
        photonUrl.searchParams.set('lang', 'pt');

        const photonHost = photonUrl.host || '';
        if (!/photon\.komoot\.io$/i.test(photonHost)) {
          photonUrl.searchParams.append('layer', 'house');
          photonUrl.searchParams.append('layer', 'street');
        }

        const viewbox = query.viewbox;
        if (viewbox) {
          const parts = viewbox.split(',').map((v) => parseFloat(v));
          if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
            if (!/photon\.komoot\.io$/i.test(photonHost)) {
              const [left, top, right, bottom] = parts;
              photonUrl.searchParams.set('bbox', `${left},${top},${right},${bottom}`);
            }
          }
        }

        console.log('📍 URL (Photon):', photonUrl.toString());
        const photonResp = await this.fetchWithRetry(photonUrl.toString(), {
          headers: {
            Accept: 'application/json',
            'Accept-Language': 'pt-BR',
            'User-Agent': 'WebPonto-Geocoder/1.0 (+https://webponto.app)',
          },
        });

        if (!photonResp.ok) {
          console.error(`❌ Photon retornou ${photonResp.status}`);
        }
        const photonData: any = photonResp.ok ? await photonResp.json() : null;
        features = Array.isArray(photonData?.features) ? photonData.features : [];
      }

      // Alvos inferidos a partir da string q (bairro, cidade, UF, CEP)
      const norm = (s: string) => (s || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .trim();
      const alvoCEP = (q.match(/\b\d{5}-?\d{3}\b/)?.[0] || '').replace(/\D/g, '').slice(0, 5);
      // Heurística simples para extrair cidade/UF do termo (últimos tokens úteis)
      // (já extraído no topo): possivelUF, possivelCidade, possivelBairro
      const alvoUF = norm(possivelUF);
      const alvoCidade = norm(possivelCidade);
      const alvoBairro = norm(possivelBairro);

      function scoreFeature(f: any) {
        try {
          const p = f?.properties || {};
          let s = 0;
          const nBairro = norm(p.suburb || p.district || '');
          const nCidade = norm(p.city || p.town || p.village || '');
          const nUF = norm(p.state_code || p.state || '');
          const pc = String(p.postcode || '').replace(/\D/g, '');
          const typ = String(p.osm_value || '').toLowerCase();

          if (alvoBairro && nBairro && (nBairro.includes(alvoBairro) || alvoBairro.includes(nBairro))) s += 5;
          if (alvoCidade && nCidade && (nCidade.includes(alvoCidade) || alvoCidade.includes(nCidade))) s += 4;
          if (alvoUF && nUF && (nUF.includes(alvoUF) || alvoUF.includes(nUF))) s += 3;
          if (alvoCEP && pc.startsWith(alvoCEP)) s += 2;
          if (typ === 'house') s += 2;
          if (typ === 'street') s += 1;
          return s;
        } catch {
          return 0;
        }
      }

      const ranked = [...features].sort((a, b) => scoreFeature(b) - scoreFeature(a));

      const mapped = ranked.map((f: any) => {
        const coords = (f?.geometry?.coordinates || [null, null]);
        const lon = coords[0];
        const lat = coords[1];
        const p = f?.properties || {};

        const displayParts = [
          p.name,
          p.street && p.housenumber ? `${p.street}, ${p.housenumber}` : p.street,
          p.suburb || p.district,
          p.city || p.town || p.village,
          p.state,
          p.postcode,
          p.country,
        ].filter(Boolean);
        const display = displayParts.join(', ');

        return {
          lat,
          lon,
          display_name: display || p.name,
          address: {
            road: p.street || p.name,
            house_number: p.housenumber,
            suburb: p.suburb || p.district,
            city: p.city || p.town || p.village,
            state: p.state,
            postcode: p.postcode,
            country: p.country,
          },
          class: p.osm_key || '',
          type: p.osm_value || '',
        };
      });

      console.log('📦 Photon resultados mapeados (ranked):', mapped.length);
      if (mapped.length > 0) {
        this.geoCache.set(cacheKey, { data: mapped, ts: now })
        return mapped
      }

      // Fallback extra: Overpass (buscar via por nome dentro do bbox/SP e usar centro)
      const spBBox = [-46.825, -24.008, -46.365, -23.356];
      const bboxParts = (query.viewbox || '').split(',').map((v) => parseFloat(v));
      const validBBox = bboxParts.length === 4 && bboxParts.every((n) => Number.isFinite(n)) ? bboxParts : spBBox;
      // Extrair nome da rua (antes da primeira vírgula)
      const streetName = String(q).split(',')[0]?.trim() || '';
      if (streetName) {
        const [left, top, right, bottom] = validBBox; // viewbox: left,top,right,bottom
        const south = bottom;
        const west = left;
        const north = top;
        const east = right;
        const overpassUrl = 'https://overpass-api.de/api/interpreter';
        // Consulta por vias (highway) com nome aproximado, case-insensitive, dentro do bbox
        const overpassBody =
          'data=' + encodeURIComponent(
            `[out:json][timeout:25];\n` +
            `(` +
            `way["highway"]["name"~"^${streetName}$",i](${south},${west},${north},${east});` +
            `way["highway"]["name"~"${streetName}",i](${south},${west},${north},${east});` +
            `);\n` +
            `out center 1;`
          );
        console.log('📍 POST (Overpass):', overpassUrl);
        let overpassResp = await this.fetchWithRetry(overpassUrl, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          },
          body: overpassBody,
        });
        if (!overpassResp.ok) {
          const overpassAlt = 'https://overpass.kumi.systems/api/interpreter';
          console.log('📍 POST (Overpass alt):', overpassAlt);
          overpassResp = await this.fetchWithRetry(overpassAlt, {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            },
            body: overpassBody,
          });
        }
        if (overpassResp.ok) {
          const overData: any = await overpassResp.json();
          const elements: any[] = Array.isArray(overData?.elements) ? overData.elements : [];
          // Escolher a via com mais nós (provável via principal) e usar o centro
          const best = elements
            .filter((el) => el.type === 'way' && el.center && typeof el.center.lat === 'number' && typeof el.center.lon === 'number')
            .sort((a, b) => (b.nodes?.length || 0) - (a.nodes?.length || 0))[0];
          if (best) {
            const lat = best.center.lat;
            const lon = best.center.lon;
            const name = best.tags?.name || streetName;
            const state = possivelUF || '';
            const city = possivelCidade || '';
            const suburb = possivelBairro || '';
            const display = [name, suburb, city, state, 'Brasil'].filter(Boolean).join(', ');
            const overpassMapped = [{
              lat,
              lon,
              display_name: display,
              address: {
                road: name,
                house_number: undefined,
                suburb,
                city,
                state,
                postcode: undefined,
                country: 'Brasil',
              },
              class: 'highway',
              type: 'street',
            }];
            console.log('📦 Overpass resultados mapeados:', overpassMapped.length);
            this.geoCache.set(cacheKey, { data: overpassMapped, ts: now });
            return overpassMapped;
          }
        } else {
          console.error(`❌ Overpass retornou ${overpassResp.status}`);
        }
      }

      this.geoCache.set(cacheKey, { data: [], ts: now });
      return [];
    } catch (error) {
      console.error('❌ Erro final no geocoding search:', error.message);
      return [];
    }
  }
  
  // Proxy para Nominatim reverse
  @Get('reverse')
  async reverse(@Query() query: Record<string, string>) {
    console.log('\n=== GEOCODING REVERSE CHAMADO ===');
    console.log('Query params:', query);

    try {
      const url = new URL('https://nominatim.openstreetmap.org/reverse');

      // Copia todos os query params
      Object.keys(query).forEach((key) => {
        url.searchParams.set(key, query[key]);
      });

      console.log('📍 URL:', url.toString());

      const response = await this.fetchWithRetry(url.toString(), {
        headers: {
          Accept: 'application/json',
          'Accept-Language': 'pt-BR',
          'User-Agent': 'WebPonto-Geocoder/1.0 (+https://webponto.app)',
        },
      });

      console.log('✅ Status:', response.status);

      if (!response.ok) {
        console.error(`❌ Nominatim retornou ${response.status}`);
        throw new Error(`Nominatim retornou ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Erro final no geocoding reverse:', error.message);
      return null;
    }
  }
}
