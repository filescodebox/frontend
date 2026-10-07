<template>
  <div class="retrieve-container">
    <div class="retrieve-wrapper">
      <!-- 顶部 -->
      <header class="retrieve-header">
        <div class="logo-section" @click="$router.push('/')">
          <div class="logo-icon">
            <img src="/favicon.svg" alt="PigeonBox" class="logo-img" />
          </div>
          <span class="logo-text">PigeonBox</span>
        </div>
        <div class="header-actions">
          <LocaleSwitcher />
          <ThemeSwitcher />
        </div>
      </header>

      <!-- 主内容 -->
      <main class="retrieve-main">
        <div class="retrieve-card">
          <div class="card-icon">
            <el-icon size="64"><Postcard /></el-icon>
          </div>
          <h1 class="card-title">{{ t('anonymous.title') }}</h1>
          <p class="card-subtitle">{{ t('anonymous.subtitle') }}</p>

          <el-form
            ref="formRef"
            :model="form"
            :rules="rules"
            class="retrieve-form"
            @submit.prevent="handleRetrieve"
          >
            <el-form-item prop="code">
              <el-input
                v-model="form.code"
                ref="codeInputRef"
                :placeholder="t('anonymous.codePlaceholder')"
                size="large"
                maxlength="32"
                class="code-input"
                @input="onCodeInput"
              >
                <template #prefix>
                  <el-icon><Key /></el-icon>
                </template>
              </el-input>
            </el-form-item>

            <el-form-item prop="password">
              <el-input
                v-model="form.password"
                type="password"
                :placeholder="t('anonymous.passwordPlaceholder')"
                size="large"
                show-password
                @keyup.enter="handleRetrieve"
              >
                <template #prefix>
                  <el-icon><Lock /></el-icon>
                </template>
              </el-input>
            </el-form-item>

            <el-button
              type="primary"
              size="large"
              :loading="loading"
              class="submit-btn"
              @click="handleRetrieve"
            >
              {{ t('anonymous.submit') }}
            </el-button>
          </el-form>

          <div class="card-hint">
            <el-icon><InfoFilled /></el-icon>
            <span>{{ t('anonymous.codeHint') }}</span>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { type FormInstance, type FormRules } from 'element-plus'
import { useI18n } from 'vue-i18n'
import {
  Postcard, Key, Lock, InfoFilled
} from '@element-plus/icons-vue'
import { anonymousApi } from '@/api/anonymous'
import { federationApi } from '@/api/federation'
import { useErrorHandler } from '@/composables/useErrorHandler'
import LocaleSwitcher from '@/components/LocaleSwitcher.vue'
import ThemeSwitcher from '@/components/ThemeSwitcher.vue'
import { ElMessageBox } from 'element-plus'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const { handleError } = useErrorHandler()

const formRef = ref<FormInstance>()
const codeInputRef = ref<{ focus: () => void }>()
const loading = ref(false)

const form = reactive({
  code: '',
  password: '',
})

const rules: FormRules = {
  code: [
    { required: true, message: () => t('anonymous.noCode'), trigger: 'blur' },
    {
      // 6 位取件码或 8 位分享码，字母数字，区分大小写（后端按长度分派查找路径）
      // 6 位取件码 / 8 位分享码 / 联邦设备直传码(含连字符,最长 32)
      pattern: /^[A-Za-z0-9-]{4,32}$/,
      message: t('anonymous.codeInvalid'),
      trigger: 'blur',
    },
  ],
}

const onCodeInput = (val: string) => {
  // 只拦非法字符，不做大小写转换——分享码区分大小写（回归 2026-10-03：
  // 旧实现强制 toUpperCase 导致混合大小写分享码永远取不到件）。
  // 连字符合法：联邦设备直传码形如 XXXX-XXXX-XXXX-XXXX
  form.code = val.replace(/[^A-Za-z0-9-]/g, '').slice(0, 32)
}

// 联邦回退（P2P M2）：本站查无此码时问联邦注册中心。
// 命中 → 弹确认框，用户同意后跳源节点取件页预填口令（hash 路由）；
// 未命中/未启用/网络失败 → 静默返回 false，回退本地错误提示。
// isDeviceNodeUrl p2pc 等直传客户端注册时使用占位 url(direct.invalid),
// 无真实网页可跳。
const isDeviceNodeUrl = (url: string): boolean => {
  try {
    const u = new URL(url)
    return !/^https?:$/.test(u.protocol) || /(^|\.)direct\.invalid$/i.test(u.hostname)
  } catch {
    return true
  }
}

const tryFederationJump = async (): Promise<boolean> => {
  const code = form.code
  if (!code) return false
  try {
    const res = await federationApi.resolve(code)
    const data = res.data
    if ((res.code === 200 || res.code === 0) && data?.available && data.url) {
      // 设备直传节点(p2pc 占位 url)不可网页取件:提示到设备端接收
      if (isDeviceNodeUrl(data.url)) {
        try {
          await ElMessageBox.alert(
            t('federation.deviceDesc', { name: data.name || data.url }),
            t('federation.deviceTitle'),
            { confirmButtonText: t('common.confirm'), type: 'info' },
          )
        } catch {
          /* 用户关闭 */
        }
        return true
      }
      // 跳本站自身=公告过期残留,视为未命中走本地错误
      try {
        if (new URL(data.url).origin === location.origin) return false
      } catch {
        /* url 非法按未命中处理 */
      }
      try {
        await ElMessageBox.confirm(
          t('federation.confirm', { name: data.name || data.url }),
          t('federation.title'),
          {
            confirmButtonText: t('federation.go'),
            cancelButtonText: t('common.cancel'),
            type: 'info',
          },
        )
      } catch {
        return true // 用户取消：视为已处理，不再弹本地错误
      }
      const base = data.url.endsWith('/') ? data.url : `${data.url}/`
      window.location.href = `${base}#/retrieve?code=${encodeURIComponent(code)}`
      return true
    }
  } catch {
    // registry 不可达/未启用：静默降级为纯单站体验
  }
  return false
}

const handleRetrieve = async () => {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  loading.value = true
  try {
    const res = await anonymousApi.retrieve({
      code: form.code,
      password: form.password || undefined,
    })
    // 后端成功码两代约定并存：200（旧 handler）/ 0（resp.Success）。
    // 此前只认 200，匿名取件的 code:0 成功响应被误判为失败（"操作失败: success"）
    if ((res.code === 200 || res.code === 0) && res.data) {
      // 成功 — 跳到结果页，带上数据
      router.push({
        path: '/retrieve/result',
        query: { data: encodeURIComponent(JSON.stringify(res.data)) },
      })
    } else {
      // 本站未命中 → 联邦回退（P2P M2）：命中则引导直跳源节点取件页
      const jumped = await tryFederationJump()
      if (!jumped) {
        handleError({ code: res.code, message: res.message, trace_id: res.trace_id })
      }
    }
  } catch (e) {
    // 本站 miss 表现为 HTTP 404 → request util 抛异常走这里（而非 else 分支）:
    // 联邦回退必须在 catch 路径同样尝试,否则 404 形态的未命中永远绕过全网取件
    const jumped = await tryFederationJump()
    if (!jumped) {
      handleError(e)
    }
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  // 支持 ?code=XXXXX 直填（保持原样大小写，只去空白与非法字符）
  const pre = (route.query.code as string) || ''
  if (pre) {
    form.code = pre.trim().replace(/[^A-Za-z0-9]/g, '').slice(0, 8)
  }
  await nextTick()
  codeInputRef.value?.focus?.()
})
</script>

<style scoped>
.retrieve-container {
  position: relative;
  min-height: 100vh;
  background: var(--color-bg);
  overflow-x: hidden;
}

.retrieve-wrapper {
  position: relative;
  z-index: 1;
  max-width: 600px;
  margin: 0 auto;
  padding: 24px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.retrieve-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  padding: 16px 20px;
  background: var(--color-card-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  color: var(--color-text-primary);
}

.logo-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  overflow: hidden;
}

.logo-img {
  width: 100%;
  height: 100%;
  display: block;
}

.logo-text {
  font-size: 18px;
  font-weight: 700;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.retrieve-main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.retrieve-card {
  width: 100%;
  background: var(--color-card-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: 48px 40px;
  box-shadow: var(--shadow-xs);
  text-align: center;
  transition: background-color 0.3s ease;
}

.card-icon {
  display: inline-flex;
  width: 96px;
  height: 96px;
  align-items: center;
  justify-content: center;
  background: var(--primary-color);
  color: white;
  border-radius: var(--radius-xl);
  margin-bottom: 24px;
}

.card-title {
  margin: 0 0 8px;
  font-size: 28px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.card-subtitle {
  margin: 0 0 32px;
  color: var(--color-text-secondary);
  font-size: 14px;
}

.retrieve-form {
  text-align: left;
}

.code-input :deep(input) {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 8px;
  text-align: center;
  /* 不做 text-transform：分享码区分大小写，展示值必须等于真实值 */
  font-family: 'SF Mono', Menlo, Monaco, Consolas, monospace;
}

.submit-btn {
  width: 100%;
  height: 48px;
  font-size: 16px;
  font-weight: 600;
  border-radius: var(--radius-lg);
  background: var(--primary-color);
  border: none;
  margin-top: 8px;
}

.submit-btn:hover:not(:disabled) {
  background: var(--primary-hover);
}

.card-hint {
  margin-top: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: var(--color-text-secondary);
  font-size: 12px;
}

.icon-secondary {
  color: var(--color-text-secondary);
}

.icon-primary {
  color: var(--primary-color);
}

@media (max-width: 768px) {
  .retrieve-wrapper {
    padding: 16px;
  }
  .retrieve-card {
    padding: 32px 24px;
  }
  .card-title {
    font-size: 22px;
  }
}
</style>
