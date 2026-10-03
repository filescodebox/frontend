/**
 * 寄件码/反向收件 API（P2）
 */
import { request } from '@/utils/request'
import type { ApiResponse } from '@/types/common'

export interface FileRequestItem {
  ID: number
  Token: string
  Title: string
  UserID: number
  MaxFiles: number
  MaxBytes: number
  ExpiredAt: string | null
  UsedCount: number
  RecvBytes: number
  CreatedAt: string
}

export interface RequestPublicView {
  token: string
  title: string
  max_files: number
  max_bytes: number
  expired_at: string | null
}

export const requestApi = {
  create: (data: { title: string; max_files: number; max_bytes: number; expire_value: number; expire_style: string }) =>
    request<ApiResponse<FileRequestItem>>({ url: '/api/v1/user/requests', method: 'POST', data }),

  listMine: () => request<ApiResponse<FileRequestItem[]>>({ url: '/api/v1/user/requests', method: 'GET' }),

  remove: (token: string) =>
    request<ApiResponse<unknown>>({ url: `/api/v1/user/requests/${token}`, method: 'DELETE' }),

  getPublic: (token: string) =>
    request<ApiResponse<RequestPublicView>>({ url: `/request/${token}`, method: 'GET' }),
}

/** 访客投递（multipart，XHR 以支持进度） */
export function guestSubmit(
  token: string,
  files: File[],
  onProgress?: (percent: number) => void
): Promise<void> {
  const formData = new FormData()
  for (const f of files) formData.append('files', f)
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `/api/v1/request/${encodeURIComponent(token)}/upload`)
    const t = localStorage.getItem('token')
    if (t) xhr.setRequestHeader('Authorization', `Bearer ${t}`)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText) as ApiResponse<unknown>
        if (xhr.status >= 200 && xhr.status < 300 && (data.code === 200 || data.code === 0)) resolve()
        else reject(new Error(data.message || `HTTP ${xhr.status}`))
      } catch (e) {
        reject(e instanceof Error ? e : new Error('Parse error'))
      }
    }
    xhr.onerror = () => reject(new Error('Network error'))
    xhr.send(formData)
  })
}
