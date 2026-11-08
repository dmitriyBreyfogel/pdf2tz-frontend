export type MaintenanceModel = {
  modelCode: string
  displayName: string
  provider: string
  schemaEnforced: boolean
}

export type Consumable = {
  name: string
  purpose?: string
  consumptionRate?: string | null
}

export type GeneratedDocument = {
  documentUrl: string
  documentFileName: string
  consumables: Consumable[]
}

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

export async function getModels(): Promise<MaintenanceModel[]> {
  const response = await fetch(`${apiBaseUrl}/api/v1/maintenance/models`)
  if (!response.ok) throw new Error(await messageFrom(response))
  return response.json() as Promise<MaintenanceModel[]>
}

export async function generateDocument(file: File, modelCode: string): Promise<GeneratedDocument> {
  const form = new FormData()
  form.append('file', file)
  form.append('modelCode', modelCode)
  const response = await fetch(`${apiBaseUrl}/api/v1/maintenance/document`, { method: 'POST', body: form })
  if (!response.ok) throw new Error(await messageFrom(response))
  return parseMultipart(response)
}

async function messageFrom(response: Response): Promise<string> {
  try {
    const payload = await response.json() as { message?: string }
    return payload.message ?? `Сервис вернул ошибку ${response.status}`
  } catch {
    return `Сервис вернул ошибку ${response.status}`
  }
}

async function parseMultipart(response: Response): Promise<GeneratedDocument> {
  const contentType = response.headers.get('content-type') ?? ''
  const boundary = contentType.match(/boundary=(?:"([^"]+)"|([^;\s]+))/i)?.[1]
    ?? contentType.match(/boundary=(?:"([^"]+)"|([^;\s]+))/i)?.[2]
  if (!boundary) throw new Error('Сервис вернул ответ в неизвестном формате')

  const bytes = new Uint8Array(await response.arrayBuffer())
  const delimiter = new TextEncoder().encode(`--${boundary}`)
  const headerSeparator = new Uint8Array([13, 10, 13, 10])
  const decoder = new TextDecoder()
  const parts = new Map<string, { headers: string; body: Uint8Array }>()
  let cursor = indexOf(bytes, delimiter, 0)

  while (cursor >= 0) {
    const partStart = cursor + delimiter.length
    if (bytes[partStart] === 45 && bytes[partStart + 1] === 45) break
    const contentStart = partStart + 2
    const headerEnd = indexOf(bytes, headerSeparator, contentStart)
    if (headerEnd < 0) break
    const nextBoundary = indexOf(bytes, delimiter, headerEnd + headerSeparator.length)
    if (nextBoundary < 0) break
    const headers = decoder.decode(bytes.slice(contentStart, headerEnd))
    const name = headers.match(/name="([^"]+)"/i)?.[1]
    if (name) parts.set(name, { headers, body: bytes.slice(headerEnd + headerSeparator.length, nextBoundary - 2) })
    cursor = nextBoundary
  }

  const document = parts.get('document')
  const consumables = parts.get('consumables')
  if (!document || !consumables) throw new Error('Сервис вернул неполный результат генерации')
  const filename = document.headers.match(/filename="([^"]+)"/i)?.[1] ?? 'maintenance-plan.docx'
  return {
    documentUrl: URL.createObjectURL(new Blob([
      document.body.buffer.slice(document.body.byteOffset, document.body.byteOffset + document.body.byteLength) as ArrayBuffer,
    ], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })),
    documentFileName: filename,
    consumables: JSON.parse(decoder.decode(consumables.body)) as Consumable[],
  }
}

function indexOf(source: Uint8Array, value: Uint8Array, from: number): number {
  outer: for (let index = from; index <= source.length - value.length; index += 1) {
    for (let offset = 0; offset < value.length; offset += 1) if (source[index + offset] !== value[offset]) continue outer
    return index
  }
  return -1
}
