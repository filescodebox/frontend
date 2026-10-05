/** 分享详情（/share/select 响应载荷） */
export interface ShareInfo {
  code: string
  filename: string
  file_size: number
  content_type: 'text' | 'file'
  content?: string
  has_password: boolean
  created_at: string
  expire_time?: string
  download_count: number
  max_downloads?: number
  username?: string
}

/** 分享成功结果载荷——FileUpload/TextShare 的 success emit 与 ShareResultDialog.open 的共同契约 */
export interface ShareResult {
  code: string
  share_url: string
  full_share_url: string
  qr_code_data: string
  e2e_key?: string
}

