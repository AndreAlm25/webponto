export function getFileUrl(key?: string | null) {
  if (!key) return ''
  const base = process.env.NEXT_PUBLIC_API_URL || ''
  if (!base) return ''
  return `${base.replace(/\/$/, '')}/api/files/employees/${String(key).replace(/^\/+/, '')}`
}
