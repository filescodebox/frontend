/**
 * 多文件分享 API（P0 多文件）。
 *
 * 两条通道：
 *  - multiDirect：小批量（总体积 ≤ 单请求体上限）一次 multipart 建分享
 *  - chunkUploadFile + multiBind：大文件走分片通道，全部传完后一次性绑定为一个分享
 */
import { request } from '@/utils/request'
import type { ApiResponse } from '@/types/common'

export interface MultiShareOptions {
  expire_value: number
  expire_style: string
  require_auth?: boolean
  password?: string
  encrypted?: boolean
  custom_code?: string
}

export interface MultiShareResult {
  code: string
  url: string
  share_url: string
  file_count: number
}

export const isOkCode = (code?: number) => code === 0 || code === 200

/** 多文件直传（multipart，字段名 files；总体积需 ≤ 后端单请求体上限） */
export function multiDirect(
  files: File[],
  opts: MultiShareOptions,
  onProgress?: (loaded: number, total: number) => void,
  signal?: AbortSignal
): Promise<MultiShareResult> {
  const formData = new FormData()
  for (const f of files) formData.append('files', f)
  formData.append('expire_value', String(opts.expire_value))
  formData.append('expire_style', opts.expire_style)
  if (opts.require_auth) {
    formData.append('require_auth', 'true')
    if (opts.password) formData.append('password', opts.password)
  }
  if (opts.encrypted) formData.append('encrypted', 'true')
  if (opts.custom_code) formData.append('custom_code', opts.custom_code)

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/v1/share/multi-direct')
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest')
    if (signal) {
      signal.addEventListener('abort', () => xhr.abort())
    }
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded, e.total)
    }
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText) as ApiResponse<MultiShareResult>
        if (xhr.status >= 200 && xhr.status < 300 && isOkCode(data.code) && data.data) {
          resolve(data.data)
        } else {
          reject(new Error(data.message || `HTTP ${xhr.status}`))
        }
      } catch (e) {
        reject(e instanceof Error ? e : new Error('Parse error'))
      }
    }
    xhr.onerror = () => reject(new Error('Network error'))
    xhr.onabort = () => reject(new Error('Cancelled'))
    xhr.send(formData)
  })
}

/** 分片上传单个文件，返回 upload_id（绑定用；不调 complete——multi-bind 服务端负责合并+标记） */
export async function chunkUploadFile(
  file: File,
  uploadId: string,
  chunkSize: number,
  onProgress?: (loaded: number, total: number) => void,
  signal?: AbortSignal
): Promise<string> {
  const totalChunks = Math.max(1, Math.ceil(file.size / chunkSize))

  await request<ApiResponse<unknown>>({
    url: '/chunk/upload/init/',
    method: 'POST',
    data: {
      file_name: file.name,
      file_size: file.size,
      chunk_size: chunkSize,
      total_chunks: totalChunks,
      upload_id: uploadId,
    },
    signal,
  })

  for (let index = 0; index < totalChunks; index++) {
    if (signal?.aborted) throw new Error('Cancelled')
    const start = index * chunkSize
    const blob = file.slice(start, Math.min(start + chunkSize, file.size))
    const form = new FormData()
    form.append('chunk', blob, `${file.name}.part${index}`)
    // 分片期望哈希（SHA-256，服务端恒时比对，不符返回 422）：传输损坏限定在单片内，
    // 客户端重传该分片即可；非安全上下文(无 crypto.subtle)自动降级为不携带。
    const hash = await sha256Hex(blob)
    if (hash) form.append('hash', hash)
    await uploadChunkWithRetry(uploadId, index, form, signal)
    onProgress?.(Math.min(start + blob.size, file.size), file.size)
  }
  return uploadId
}

/** 逐片 SHA-256；非安全上下文(subtle 不可用)返回 null */
async function sha256Hex(blob: Blob): Promise<string | null> {
  if (!globalThis.crypto?.subtle) return null
  const digest = await globalThis.crypto.subtle.digest('SHA-256', await blob.arrayBuffer())
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** 上传单片；422（服务端哈希校验失败）时重传，最多 2 次 */
async function uploadChunkWithRetry(
  uploadId: string,
  index: number,
  form: FormData,
  signal?: AbortSignal,
  maxRetries = 2
): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    try {
      await request<ApiResponse<unknown>>({
        url: `/chunk/upload/chunk/${uploadId}/${index}`,
        method: 'POST',
        data: form,
        timeout: 300000,
        signal,
      })
      return
    } catch (e) {
      const code = (e as { code?: number })?.code
      if (code === 422 && attempt < maxRetries) continue
      throw e
    }
  }
}

/** 把若干 chunk 会话/对象 key 绑定为一个多文件分享 */
export async function multiBind(
  entries: Array<{ upload_id?: string; object_key?: string; file_name?: string }>,
  opts: MultiShareOptions
): Promise<MultiShareResult> {
  const res = await request<ApiResponse<MultiShareResult>>({
    url: '/api/v1/share/multi-bind',
    method: 'POST',
    data: {
      entries,
      expire_value: opts.expire_value,
      expire_style: opts.expire_style,
      require_auth: opts.require_auth || false,
      password: opts.password || '',
      encrypted: opts.encrypted || false,
      custom_code: opts.custom_code || '',
    },
    timeout: 600000,
  })
  if (isOkCode(res.code) && res.data) return res.data
  throw new Error(res.message || 'multi-bind failed')
}
