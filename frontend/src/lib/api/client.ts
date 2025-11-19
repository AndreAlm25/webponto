// API client util para chamadas ao backend usando NEXT_PUBLIC_API_URL
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

export async function api<T = any>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_URL}${path.startsWith('/') ? path : `/${path}`}`
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`API ${res.status}: ${txt || res.statusText}`)
  }
  // Tenta JSON, senão vazio
  try {
    return (await res.json()) as T
  } catch {
    return undefined as unknown as T
  }
}
