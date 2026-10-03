<template>
  <div class="retrieve-container">
    <div class="retrieve-wrapper">
      <!-- 顶部 -->
      <header class="retrieve-header">
        <div class="logo-section" @click="$router.push('/')">
          <div class="logo-icon">
            <img src="/favicon.svg" alt="FilesCodeBox" class="logo-img" />
          </div>
          <span class="logo-text">FilesCodeBox</span>
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
                maxlength="8"
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
import { useErrorHandler } from '@/composables/useErrorHandler'
import LocaleSwitcher from '@/components/LocaleSwitcher.vue'
import ThemeSwitcher from '@/components/ThemeSwitcher.vue'

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
      pattern: /^[A-Za-z0-9]{6,8}$/,
      message: t('anonymous.codeInvalid'),
      trigger: 'blur',
    },
  ],
}

const onCodeInput = (val: string) => {
  // 只拦非法字符，不做大小写转换——分享码区分大小写（回归 2026-10-03：
  // 旧实现强制 toUpperCase 导致混合大小写分享码永远取不到件）
  form.code = val.replace(/[^A-Za-z0-9]/g, '').slice(0, 8)
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
      handleError({ code: res.code, message: res.message, trace_id: res.trace_id })
    }
  } catch (e) {
    handleError(e)
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
