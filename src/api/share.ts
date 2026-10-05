import { request } from '@/utils/request'
import { xhrSend } from '@/api/_xhr'
import type { ApiResponse, PaginatedResponse } from '@/types/common'

export const shareApi = {
  // 分享文本
  shareText: (data: {
    text: string
    expire_value: number
    expire_style: string
    require_auth?: boolean
    password?: string
    encrypted?: boolean
    custom_code?: string
  }) => {
    const formData = new FormData()
    formData.append('text', data.text)
    formData.append('expire_value', String(data.expire_value))
    if (data.require_auth && data.password) formData.append('password', data.password)
    formData.append('expire_style', data.expire_style)
    formData.append('require_auth', String(data.require_auth || false))
    if (data.encrypted) formData.append('encrypted', 'true')
    if (data.custom_code) formData.append('custom_code', data.custom_code)

    return request<ApiResponse<{
      code: string
      url: string
      share_url?: string
      full_share_url?: string
      qr_code_data?: string
    }>>({
      url: '/share/text/',
      method: 'POST',
      data: formData,
    })
  },

  // 分享文件
  shareFile: (data: {
    file: File
    expire_value: number
    expire_style: string
    require_auth?: boolean
    password?: string
  }) => {
    const formData = new FormData()
    formData.append('file', data.file)
    formData.append('expire_value', String(data.expire_value))
    formData.append('expire_style', data.expire_style)
    if (data.require_auth) {
      formData.append('require_auth', 'true')
      if (data.password) formData.append('password', data.password)
    }

    return request<ApiResponse<{
      code: string
      url: string
      share_url?: string
      full_share_url?: string
      qr_code_data?: string
    }>>({
      url: '/share/file/',
      method: 'POST',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  // 获取分享内容
  getShare: (code: string, password?: string) => {
    return request<ApiResponse<{
      code: string
      text?: string
      file_name?: string
      file_size?: string
      url?: string
      has_password: boolean
      expire_time: string
      encrypted?: boolean
      download_url?: string
      token?: string
      files?: Array<{ id: number; name: string; size: number }>
      is_multi?: boolean
    }>>({
      url: '/share/select/',
      method: 'GET',
      params: { code, password },
    })
  },

  // 获取用户的分享列表
  getUserShares: (params: { page: number; page_size: number }) => {
    return request<PaginatedResponse<any>>({
      url: '/share/user',
      method: 'GET',
      params
    })
  },

  // 删除分享
  deleteShare: (code: string) => {
    return request<ApiResponse<void>>({
      url: `/share/${code}`,
      method: 'DELETE'
    })
  },
}

/**
 * 分享文件（multipart，XHR 通道支持进度与中断）。
 * 2026-10-06 W2 收编自 FileUpload 内联 XHR；encrypted/custom_code 由调用方按
 * 原语义传入（e2e 且密文已生成才传 encrypted；登录且非空才传 custom_code）。
 */
export interface UploadFileResult {
  code: string
  url: string
  share_url?: string
  full_share_url?: string
  qr_code_data?: string
}

export async function uploadFile(
  file: File,
  opts: {
    expire_value: number
    expire_style: string
    require_auth: boolean
    password?: string
    encrypted: boolean
    custom_code?: string
  },
  onProgress?: (loaded: number, total: number) => void,
  signal?: AbortSignal
): Promise<UploadFileResult> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('expire_value', String(opts.expire_value))
  formData.append('expire_style', opts.expire_style)
  if (opts.require_auth) {
    formData.append('require_auth', 'true')
    if (opts.password) formData.append('password', opts.password)
  }
  if (opts.encrypted) formData.append('encrypted', 'true')
  if (opts.custom_code) formData.append('custom_code', opts.custom_code)

  // 原内联 XHR 无超时（timeout=0=不限），钉现状
  const res = await xhrSend<UploadFileResult>({
    url: '/share/file/',
    form: formData,
    onProgress,
    signal,
    timeout: 0,
  })
  if (!res.data) throw new Error(res.message || 'Upload failed')
  return res.data
}
