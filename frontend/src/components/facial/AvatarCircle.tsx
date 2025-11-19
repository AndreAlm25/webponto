"use client"

import React, { useMemo, useState } from "react"
import { getFileUrl } from "@/utils/files"

/**
 * AvatarCircle
 * - Mostra a foto de perfil (MinIO URL pública) se disponível
 * - Fallback: iniciais do nome dentro de um círculo estilizado
 *
 * Regras de resolução da URL pública:
 * - Se photoUrl for passado, usa diretamente
 * - Caso contrário, se companyId e userId forem passados, monta o caminho padrão
 *   `company/<companyId>/user/<userId>/public/profile.<ext>`
 *   usando as variáveis públicas:
 *   - NEXT_PUBLIC_S3_PUBLIC_ENDPOINT (ex.: cdn.suaempresa.com)
 *   - NEXT_PUBLIC_S3_PUBLIC_USE_SSL ("true"/"false")
 *   - NEXT_PUBLIC_S3_BUCKET (ex.: ct-app)
 */
export type AvatarCircleProps = {
  name: string
  photoUrl?: string
  avatarPath?: string
  companyId?: string
  userId?: string
  /** classes de tamanho: ex.: "w-8 h-8 sm:w-10 sm:h-10" */
  sizeClass?: string
  /** classes extras no container */
  className?: string
}

function getInitials(name: string): string {
  const parts = (name || "").trim().split(/\s+/)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

export default function AvatarCircle({
  name,
  photoUrl,
  avatarPath,
  companyId,
  userId,
  sizeClass = "w-8 h-8 sm:w-10 sm:h-10",
  className = "",
}: AvatarCircleProps) {
  const [imgError, setImgError] = useState(false)

  const computedUrl = useMemo(() => {
    // photoUrl e avatarPath aqui são chaves do MinIO (ex.: companyId/users/userId/profile.jpg)
    const key = photoUrl || avatarPath
    return getFileUrl(key)
  }, [photoUrl, avatarPath])

  const initials = useMemo(() => getInitials(name), [name])

  const containerClass = [
    sizeClass,
    "rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden bg-blue-100 text-blue-700",
    className,
  ].filter(Boolean).join(" ")

  if (!computedUrl || imgError) {
    return (
      <div className={containerClass} aria-label={`Avatar de ${name}`}>
        <span className="font-semibold select-none">
          {initials}
        </span>
      </div>
    )
  }

  return (
    <div className={containerClass} aria-label={`Avatar de ${name}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={computedUrl}
        alt={name}
        className="w-full h-full object-cover"
        referrerPolicy="no-referrer"
        draggable={false}
        title={computedUrl}
        onError={() => setImgError(true)}
        loading="lazy"
      />
    </div>
  )
}
