import { request } from '@/utils/request'
import type { ApiResponse } from '@/types/common'

export interface PublicConfig {
  name: string
  description: string
  uploadSize: number
  enableChunk: number
  openUpload: number
  /** 注册开关（与 /user/register 判定同源）；缺省视为未拿到，不据此隐藏入口 */
  registerEnabled?: boolean
  /** OIDC 单点登录开关（P2 SSO；security.oidc.enabled） */
  oidcEnabled?: boolean
  /** 管理后台入口可见性（ui.show_admin_addr；/admin 路由始终可达，仅控制页脚入口展示） */
  showAdminAddr?: boolean
  expireStyle: string[]
  initialized?: boolean
}

// 系统初始化请求（字段名与后端 thrift 模型 snake_case 对齐）
export interface InitializeSystemReq {
  admin_username: string
  admin_password: string
  admin_email: string
}

export const publicApi = {
  // 获取公开配置（站点名/上传限制/初始化状态等，前端启动时拉取）
  getConfig: () => {
    return request<ApiResponse<PublicConfig>>({
      url: '/api/config',
      method: 'GET',
    })
  },

  // 检查系统初始化状态
  checkInitialization: () => {
    return request<{
      initialized: boolean
      message: string
    }>({
      url: '/setup/check',
      method: 'GET',
    })
  },

  // 初始化系统（创建首个管理员；仅未初始化时可用，重复调用返回 403）
  // 成功：HTTP 200 + {message, username}；失败：HTTP 400/403/500 + {code, message}
  initializeSystem: (data: InitializeSystemReq) => {
    return request<{ message: string; username: string }>({
      url: '/setup',
      method: 'POST',
      data,
    })
  },
}
