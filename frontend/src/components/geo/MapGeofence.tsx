"use client";

// Componente de mapa (Leaflet) com pino arrastável e círculo de raio
// - Código em inglês; textos em português (padrão do projeto)

import React, { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'

type LatLngExpression = [number, number] | { lat: number; lng: number }

const MapContainer: any = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false })
const TileLayer: any = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false })
const Marker: any = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false })
const Circle: any = dynamic(() => import('react-leaflet').then(m => m.Circle), { ssr: false })

export type MapGeofenceProps = {
  center: { lat: number; lng: number }
  radiusMeters: number
  resetTimestamp?: number
  onChange?: (v: { center: { lat: number; lng: number }; radiusMeters: number }) => void
}

// Setará o ícone padrão somente no client (evita acessar window no SSR)
let leafletReady = false

// Função para calcular zoom ideal baseado no raio (metros)
// Comentário: garante que o círculo completo seja visível no mapa
function getZoomForRadius(radiusMeters: number): number {
  // Fórmula ajustada: zoom mais próximo para ver melhor o círculo
  // 200m → zoom 17 (mais próximo), 500m → zoom 16, 1000m → zoom 15
  if (radiusMeters <= 100) return 18
  if (radiusMeters <= 200) return 17  // Padrão: mais próximo
  if (radiusMeters <= 400) return 16
  if (radiusMeters <= 700) return 15
  return 14
}

// Componente carregado dinamicamente que usa useMapEvents
const MapEventsHandler: any = dynamic(
  () => import('react-leaflet').then((mod) => {
    // Retorna um componente que usa useMapEvents e useMap
    return ({ 
      onMapClick, 
      targetCenter,
      targetRadius,
      resetTimestamp
    }: { 
      onMapClick: (lat: number, lng: number) => void
      targetCenter: { lat: number; lng: number }
      targetRadius: number
      resetTimestamp?: number
    }) => {
      const map = mod.useMap()
      
      // Move o mapa quando targetCenter mudar (busca ou coordenadas)
      // Também força reset quando resetTimestamp mudar
      React.useEffect(() => {
        if (map && targetCenter) {
          const idealZoom = getZoomForRadius(targetRadius)
          const currentZoom = map.getZoom()
          console.log('🎯 MapEventsHandler RESET: resetTimestamp mudou!')
          console.log('   - Centro:', targetCenter)
          console.log('   - Raio:', targetRadius, 'm')
          console.log('   - Zoom atual:', currentZoom)
          console.log('   - Zoom ideal:', idealZoom)
          console.log('   - Aplicando flyTo com zoom', idealZoom)
          
          // Força zoom de forma mais agressiva para garantir que seja aplicado
          // 1. Para qualquer animação em andamento
          map.stop()
          // 2. Define zoom imediatamente (sem animação)
          map.setZoom(idealZoom, { animate: false })
          // 3. Move para o centro com animação
          map.flyTo([targetCenter.lat, targetCenter.lng], idealZoom, { animate: true, duration: 0.5 })
          
          setTimeout(() => {
            try {
              map.invalidateSize()
              // Garante que zoom está correto após invalidateSize
              const afterZoom = map.getZoom()
              if (afterZoom !== idealZoom) {
                console.log('   - Zoom divergiu após invalidateSize, corrigindo:', afterZoom, '→', idealZoom)
                map.setZoom(idealZoom, { animate: false })
              }
              map.panTo([targetCenter.lat, targetCenter.lng])
              const finalZoom = map.getZoom()
              console.log('   - Zoom final após flyTo:', finalZoom)
            } catch {}
          }, 200)
        }
      }, [targetCenter.lat, targetCenter.lng, resetTimestamp, targetRadius, map])
      
      // Ajusta zoom quando apenas o raio mudar (slider)
      React.useEffect(() => {
        if (map) {
          const idealZoom = getZoomForRadius(targetRadius)
          const currentZoom = map.getZoom()
          // Só ajusta se a diferença for significativa (evita tremor)
          if (Math.abs(currentZoom - idealZoom) >= 1) {
            console.log('MapEventsHandler: ajustando zoom para', idealZoom, 'devido a raio', targetRadius)
            map.setZoom(idealZoom, { animate: true })
          }
        }
      }, [targetRadius, map])
      
      mod.useMapEvents({
        click: (e: any) => {
          const { lat, lng } = e.latlng
          onMapClick(lat, lng)
        },
        zoomend: () => {
          // Log do zoom atual sempre que o usuário mudar o zoom manualmente
          const currentZoom = map.getZoom()
          console.log('🔍 Zoom atual do mapa:', currentZoom)
        },
      })
      return null
    }
  }),
  { ssr: false }
)

export function MapGeofence({ center, radiusMeters, resetTimestamp, onChange }: MapGeofenceProps) {
  const [pos, setPos] = useState(center)
  const [radius, setRadius] = useState(radiusMeters)
  const [maxZoom] = useState(20)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (leafletReady) return
      if (typeof window === 'undefined') return
      const L = (await import('leaflet')).default
      const defaultIcon = new L.Icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        tooltipAnchor: [16, -28],
        shadowSize: [41, 41],
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(L as any).Marker.prototype.options.icon = defaultIcon
      if (mounted) leafletReady = true
    })()
    return () => { mounted = false }
  }, [])

  // Atualiza posição local quando center prop muda
  useEffect(() => {
    console.log('MapGeofence: center mudou para', center)
    setPos(center)
  }, [center.lat, center.lng])

  useEffect(() => setRadius(radiusMeters), [radiusMeters])

  const mapCenter = useMemo<LatLngExpression>(() => {
    console.log('MapGeofence: mapCenter atualizado para', [pos.lat, pos.lng])
    return [pos.lat, pos.lng]
  }, [pos.lat, pos.lng])

  return (
    <div className="w-full h-[480px] rounded overflow-hidden relative z-0">
      <MapContainer
        center={mapCenter}
        zoom={17}
        maxZoom={maxZoom}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
        scrollWheelZoom
        zoomControl
        doubleClickZoom
        dragging
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={maxZoom}
        />
        <Marker
          draggable
          position={mapCenter}
          eventHandlers={{
            dragend: (e: any) => {
              const ll = e.target.getLatLng()
              const next = { lat: ll.lat, lng: ll.lng }
              setPos(next)
              onChange?.({ center: next, radiusMeters: radius })
            },
          }}
        />
        <Circle
          center={mapCenter}
          radius={radius}
          pathOptions={{ color: '#2563eb', fillOpacity: 0.15 }}
        />
        <MapEventsHandler
          targetCenter={center}
          targetRadius={radiusMeters}
          resetTimestamp={resetTimestamp}
          onMapClick={(lat: number, lng: number) => {
            const next = { lat, lng }
            setPos(next)
            onChange?.({ center: next, radiusMeters: radius })
          }}
        />
      </MapContainer>
      <div className="mt-2 text-xs text-gray-500">Arraste o pino ou clique no mapa para posicionar o centro da cerca.</div>
    </div>
  )
}
