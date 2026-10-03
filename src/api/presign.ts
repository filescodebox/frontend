import { request } from '@/utils/request'
import type { ApiResponse } from '@/types/common'

export interface PresignInitData {
  upload_id: string
  upload_url: string
  method: string // PUT
  headers: Record<string, string>
  expire_seconds: number
  object_key: string
  scheme: string
  token: string
  // 秒传命中时返回（upload_id 为空串，无需直传）
  is_quick?: boolean
  existed?: boolean
  share_code?: string
  share_url?: string
  download_token?: string
}

export interface PresignCompleteData {
  code: string // share code
  url: string
  file_name: string
  file_size: number
  download_url: string
}

export const presignApi = {
  // 业务成功码：新版 resp.Success 返回 0，旧式 handler 返回 200
  isOk: (code?: number) => code === 0 || code === 200,

  // 计算 SHA-256（秒传指纹）。crypto.subtle 不支持流式，
  // 超过 limitBytes 时返回空串（调用方跳过秒传检测）。
  computeFileHash: async (file: File, limitBytes = 256 * 1024 * 1024): Promise<string> => {
    if (file.size > limitBytes) return ''
    if (!crypto?.subtle) return ''
    const buf = await file.arrayBuffer()
    const digest = await crypto.subtle.digest('SHA-256', buf)
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  },

  // 申请预签名上传 URL
  init: (data: {
    file_name: string
    file_size: number
    content_type: string
    scheme?: string
    expire_value?: number
    expire_style?: string
    require_auth?: boolean
    password?: string
    file_hash?: string
  }) => {
    return request<ApiResponse<PresignInitData>>({
      url: '/api/v1/presign/upload',
      method: 'POST',
      data,
    })
  },

  // 上传完成后通知后端写 share 表
  complete: (data: {
    upload_id: string
    token: string
    object_key?: string
    file_hash?: string
  }) => {
    return request<ApiResponse<PresignCompleteData>>({
      url: '/api/v1/presign/complete',
      method: 'POST',
      data,
    })
  },

  // 取消
  abort: (data: { upload_id: string; token: string }) => {
    return request<ApiResponse<unknown>>({
      url: '/api/v1/presign/abort',
      method: 'POST',
      data,
    })
  },
}
