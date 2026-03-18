// API client util para chamadas ao backend via proxy do Next.js
export const API_URL = ''

export async function api<T = any>(path: string, init?: RequestInit): Promise<T> {
  const url = `${path.startsWith('/') ? path : `/${path}`}`
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
