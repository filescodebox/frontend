import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'
import { userApi } from '@/api/user'
import type { UserInfo } from '@/types/user'

// 会话承载（2026-10-05 遗留修复）：JWT 迁 HttpOnly Cookie——服务端在
// 登录/刷新/OIDC 回调时下发，前端不再持久化令牌。localStorage 仅存非敏感
// 的会话标记（路由守卫 UX 用，真实鉴权在服务端，HttpOnly 令牌 JS 不可读）。
const SESSION_FLAG = 'fcb_session'

export const useUserStore = defineStore('user', () => {
  const userInfo = ref<UserInfo | null>(null)
  // 登出进行中标志：阻断在途请求 401 → refreshToken 造成"已退出登录但刷新
  // 页面会话复活"的竞态（2026-10-03 自测复现一次）
  let loggingOut = false

  const isLoggedIn = computed(
    () => !!userInfo.value || localStorage.getItem(SESSION_FLAG) === '1'
  )
  const isAdmin = computed(() => userInfo.value?.role === 'admin')

  const login = async (username: string, password: string) => {
    const res = await userApi.login({ username, password })
    if (res.code === 200) {
      userInfo.value = res.data.user
      localStorage.setItem(SESSION_FLAG, '1')
      loggingOut = false
      return true
    }
    throw new Error(res.message)
  }

  const logout = () => {
    // 服务端注销：吊销 Cookie 中的 token 并清 Cookie（fire-and-forget，
    // 失败不阻断本地登出）。CSRF 头必须携带（Cookie 认证的写请求）。
    loggingOut = true
    axios
      .post('/api/v1/user/logout', null, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      })
      .catch(() => {
        // 后端不可达时本地登出仍生效
      })
    userInfo.value = null
    localStorage.removeItem(SESSION_FLAG)
    localStorage.removeItem('userRole')
  }

  const fetchUserInfo = async () => {
    if (!isLoggedIn.value) return
    try {
      const res = await userApi.getUserInfo()
      if (res.code === 200) {
        userInfo.value = res.data
      }
    } catch (error) {
      logout()
    }
  }

  // refreshToken：Cookie 通道续期（服务端轮换并下发新 Cookie）。
  // 用裸 axios 避免触发 request.ts 的拦截器递归。
  const refreshToken = async (): Promise<boolean> => {
    // 登出流程中的 401 不做续期
    if (loggingOut || localStorage.getItem(SESSION_FLAG) !== '1') return false
    try {
      const res = await axios.post('/api/v1/user/refresh', null, {
        baseURL: import.meta.env.VITE_API_BASE_URL || '',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      })
      return res.data?.code === 200
    } catch {
      // refresh 失败，返回 false，调用方处理登出
      return false
    }
  }

  return {
    userInfo,
    isLoggedIn,
    isAdmin,
    login,
    logout,
    fetchUserInfo,
    refreshToken,
  }
})
